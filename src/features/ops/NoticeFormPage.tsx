/**
 * 공지 작성 — 기간과 상단 고정을 정해 앱에 게시할 내용을 만든다.
 *
 * 고정 2건은 상한이 아니라 권장치라 넘기기 전에 경고하되 저장은 막지 않는다
 * (docs/ARCHITECTURE.md §45).
 */
import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { changed, restoreDraft } from '@/shared/lib/draft'
import { focusFirstError } from '@/shared/lib/focusFirstError'
import { today } from '@/shared/lib/today'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Checkbox } from '@/shared/ui/Checkbox'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Select } from '@/shared/ui/Select'
import { SkeletonForm } from '@/shared/ui/Skeleton'
import { Textarea } from '@/shared/ui/Textarea'

import {
  NOTICE_CATEGORIES,
  PIN_LIMIT,
  isNoticeCategory,
  periodStatusOf,
  validateNotice,
  type NoticeInput,
} from '@/domain/ops'
import { SCREENS } from '@/domain/screens'

import { useNotices, useSaveNotice } from '@/api/ops'

import { useUnsavedGuard } from '@/stores/dirtyStore'

const DRAFT = 'notice:new'
const FORM_ID = 'notice-form'
const FORM_SUB = '앱 공지 목록에 게시할 내용을 작성합니다. 종료일을 비우면 상시 공지입니다.'

function emptyNotice(): NoticeInput {
  return { title: '', body: '', category: '', startAt: today(), endAt: '', pinned: false }
}

const validDraft = (input: NoticeInput): boolean =>
  input.category === '' || isNoticeCategory(input.category)

export default function NoticeFormPage() {
  const navigate = useNavigate()
  const notices = useNotices()
  const save = useSaveNotice()
  const [initial] = useState(emptyNotice)
  const [restored] = useState(() => restoreDraft(DRAFT, initial, validDraft))
  const [form, setForm] = useState<NoticeInput>(restored ?? initial)
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  const [tried, setTried] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const sending = useRef(false)
  const markSaved = useUnsavedGuard(changed(form, initial))
  const draft = useFormDraft(DRAFT, form, changed(form, initial))

  if (notices.isPending) {
    return (
      <>
        <PageHeader title="공지 작성" sub={FORM_SUB} />
        <SkeletonForm fields={5} />
      </>
    )
  }
  if (notices.error || !notices.data) {
    return <ErrorBanner message={notices.error?.message ?? '공지 현황을 불러오지 못했습니다.'} />
  }

  const errors = validateNotice(form)
  const activePinned =
    !errors.startAt && !errors.endAt && form.pinned &&
    periodStatusOf(form.startAt, form.endAt, today()) === 'ACTIVE'
  const overPinned = activePinned && notices.data.summary.pinned >= PIN_LIMIT
  const busy = save.isPending

  const set = <K extends keyof NoticeInput>(key: K, value: NoticeInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const back = () => navigate(SCREENS.notice.path)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (sending.current || busy) return

    flushSync(() => setTried(true))
    if (Object.keys(errors).length > 0) {
      focusFirstError(formRef.current)
      return
    }

    sending.current = true
    save.mutate(form, {
      onSuccess: () => {
        draft.clear()
        markSaved()
        back()
      },
      onSettled: () => {
        sending.current = false
      },
    })
  }

  return (
    <>
      <PageHeader
        title="공지 작성"
        sub={FORM_SUB}
        actions={
          <>
            <Button onClick={back}>취소</Button>
            <Button onClick={draft.saveNow} disabled={!changed(form, initial)}>
              임시 저장
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" disabled={busy}>
              {busy ? '저장 중…' : '공지 저장'}
            </Button>
          </>
        }
      />

      {noticeOpen && (
        <DraftNotice
          onDiscard={() => {
            draft.clear()
            setForm(initial)
            setNoticeOpen(false)
          }}
        />
      )}
      <DraftSavedAt at={draft.savedAt} />

      {save.error && <ErrorBanner message={save.error.message} />}
      {overPinned && (
        <ErrorBanner
          message={`현재 게시 중인 상단 고정 공지가 이미 ${notices.data.summary.pinned}건입니다. 저장할 수 있지만 앱에서 새 공지가 밀릴 수 있습니다.`}
        />
      )}

      <form id={FORM_ID} ref={formRef} onSubmit={submit} noValidate>
        <Card className={css({ maxWidth: '760px', p: '18px' })}>
          <CardTitle title="공지 내용" sub="작성한 본문은 앱에서 줄바꿈을 유지합니다." />
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '15px', mt: '16px' })}>
            <Input
              value={form.title}
              onChange={(value) => set('title', value)}
              label="제목"
              placeholder="예: 9월 정기 점검 안내"
              error={tried ? errors.title : undefined}
              required
            />

            <Textarea
              value={form.body}
              onChange={(value) => set('body', value)}
              label="본문"
              placeholder="앱에서 보여 줄 안내 내용을 입력하세요"
              error={tried ? errors.body : undefined}
              required
              rows={8}
            />

            <Select
              value={form.category}
              onChange={(value) => set('category', isNoticeCategory(value) ? value : '')}
              options={NOTICE_CATEGORIES}
              label="분류"
              placeholder="분류를 고르세요"
              error={tried ? errors.category : undefined}
              required
            />

            <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' })}>
              <Input
                type="date"
                value={form.startAt}
                onChange={(value) => set('startAt', value)}
                label="게시 시작일"
                error={tried ? errors.startAt : undefined}
                required
              />
              <Input
                type="date"
                value={form.endAt}
                onChange={(value) => set('endAt', value)}
                label="게시 종료일"
                hint="비우면 상시 게시"
                error={tried ? errors.endAt : undefined}
              />
            </div>

            <div className={css({ p: '12px 13px', bg: 'surf2', borderRadius: 'lg' })}>
              <Checkbox
                checked={form.pinned}
                onChange={(value) => set('pinned', value)}
                label="앱 공지 목록 상단에 고정"
              />
              <p className={css({ m: '6px 0 0 26px', textStyle: 'caption', color: 'faint' })}>
                게시 중인 고정 공지는 {PIN_LIMIT}건까지 권장합니다.
              </p>
            </div>
          </div>
        </Card>
      </form>
    </>
  )
}
