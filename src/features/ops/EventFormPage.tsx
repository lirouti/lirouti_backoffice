/**
 * 이벤트 생성 — 기간·보상 아이템·강조색을 정해 기간제 이벤트를 만든다.
 *
 * 생성 폼 원본은 없어 기존 이벤트 카드가 소비하는 값만 입력받는다
 * (docs/ARCHITECTURE.md §46).
 */
import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { isHexColor } from '@/shared/lib/color'
import { changed, restoreDraft } from '@/shared/lib/draft'
import { focusFirstError } from '@/shared/lib/focusFirstError'
import { today } from '@/shared/lib/today'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Select } from '@/shared/ui/Select'
import { SkeletonForm } from '@/shared/ui/Skeleton'
import { Textarea } from '@/shared/ui/Textarea'

import { validateEvent, type EventInput } from '@/domain/ops'
import { SCREENS } from '@/domain/screens'

import { useEventFormData, useSaveEvent } from '@/api/ops'

import { useUnsavedGuard } from '@/stores/dirtyStore'

const DRAFT = 'event:new'
const FORM_ID = 'event-form'
const FORM_SUB = '기간과 보상을 정해 앱에서 진행할 이벤트를 만듭니다.'
const DEFAULT_ACCENT = '#2F7CEF'

function emptyEvent(): EventInput {
  return {
    title: '',
    desc: '',
    startAt: today(),
    endAt: '',
    accent: DEFAULT_ACCENT,
    rewardItemKey: null,
  }
}

export default function EventFormPage() {
  const navigate = useNavigate()
  const formData = useEventFormData()
  const save = useSaveEvent()
  const [initial] = useState(emptyEvent)
  const [restored] = useState(() => restoreDraft(DRAFT, initial))
  const [form, setForm] = useState<EventInput>(restored ?? initial)
  const [normalizedAt, setNormalizedAt] = useState(0)
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  const [tried, setTried] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const sending = useRef(false)
  const markSaved = useUnsavedGuard(changed(form, initial))
  const draft = useFormDraft(DRAFT, form, changed(form, initial))

  if (formData.dataUpdatedAt !== normalizedAt) {
    setNormalizedAt(formData.dataUpdatedAt)
    if (
      formData.data &&
      form.rewardItemKey !== null &&
      !formData.data.itemOptions.some((item) => item.key === form.rewardItemKey)
    ) {
      setForm((current) => ({ ...current, rewardItemKey: null }))
    }
  }

  if (formData.isPending) {
    return (
      <>
        <PageHeader title="이벤트 생성" sub={FORM_SUB} />
        <SkeletonForm fields={6} />
      </>
    )
  }
  if (formData.error || !formData.data) {
    return (
      <ErrorBanner message={formData.error?.message ?? '보상 아이템을 불러오지 못했습니다.'} />
    )
  }

  const reward = formData.data.itemOptions.find((item) => item.key === form.rewardItemKey)
  const errors = validateEvent(form)
  const itemOptions = formData.data.itemOptions.map((item) => ({
    value: String(item.key),
    label: item.name,
  }))
  const busy = save.isPending

  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const back = () => navigate(SCREENS.event.path)

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
        title="이벤트 생성"
        sub={FORM_SUB}
        actions={
          <>
            <Button onClick={back}>취소</Button>
            <Button onClick={draft.saveNow} disabled={!changed(form, initial)}>
              임시 저장
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              variant="primary"
              disabled={busy || formData.data.itemOptions.length === 0}
            >
              {busy ? '저장 중…' : '이벤트 저장'}
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
      {formData.data.itemOptions.length === 0 && (
        <ErrorBanner message="보상으로 고를 아이템이 없습니다. 아이템을 먼저 등록하세요." />
      )}

      <form id={FORM_ID} ref={formRef} onSubmit={submit} noValidate>
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '760px',
          })}
        >
          <Card className={css({ p: '18px' })}>
            <CardTitle title="기본 정보" sub="이벤트 카드에 표시할 내용을 입력합니다." />
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                mt: '16px',
              })}
            >
              <Input
                value={form.title}
                onChange={(value) => set('title', value)}
                label="제목"
                placeholder="예: 가을 수확 축제"
                error={tried ? errors.title : undefined}
                required
              />
              <Textarea
                value={form.desc}
                onChange={(value) => set('desc', value)}
                label="설명"
                placeholder="이벤트 카드에 보여 줄 한 줄 설명"
                error={tried ? errors.desc : undefined}
                required
                rows={3}
              />
            </div>
          </Card>

          <Card className={css({ p: '18px' })}>
            <CardTitle title="운영 기간" sub="종료일을 비우면 상시 이벤트입니다." />
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                mt: '16px',
              })}
            >
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                })}
              >
                <Input
                  type="date"
                  value={form.startAt}
                  onChange={(value) => set('startAt', value)}
                  label="시작일"
                  error={tried ? errors.startAt : undefined}
                  required
                />
                <Input
                  type="date"
                  value={form.endAt}
                  onChange={(value) => set('endAt', value)}
                  label="종료일"
                  hint="비우면 상시 진행"
                  error={tried ? errors.endAt : undefined}
                />
              </div>
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 120px',
                  gap: '12px',
                  alignItems: 'end',
                })}
              >
                <Input
                  value={form.accent}
                  onChange={(value) => set('accent', value)}
                  label="강조색"
                  placeholder="#2F7CEF"
                  hint="이벤트 카드 왼쪽 장식 띠에만 사용합니다."
                  error={tried ? errors.accent : undefined}
                  required
                />
                <div
                  aria-label={
                    isHexColor(form.accent)
                      ? `강조색 미리보기 ${form.accent}`
                      : '강조색 미리보기'
                  }
                  className={css({
                    height: '46px',
                    border: '1px solid token(colors.bd)',
                    borderRadius: 'lg',
                    bg: 'surf2',
                  })}
                  style={isHexColor(form.accent) ? { background: form.accent } : undefined}
                />
              </div>
            </div>
          </Card>

          <Card className={css({ p: '18px' })}>
            <CardTitle title="보상" sub="아이템 모듈에 등록된 항목 중 하나를 고릅니다." />
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 210px',
                gap: '16px',
                mt: '16px',
                alignItems: 'start',
              })}
            >
              <Select
                value={reward ? String(reward.key) : ''}
                onChange={(value) => {
                  const selected = formData.data.itemOptions.find(
                    (item) => String(item.key) === value,
                  )
                  set('rewardItemKey', selected?.key ?? null)
                }}
                options={itemOptions}
                label="보상 아이템"
                placeholder="아이템을 고르세요"
                error={tried ? errors.rewardItemKey : undefined}
                required
                size="lg"
              />
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '70px',
                  p: '12px',
                  bg: 'surf2',
                  borderRadius: 'lg',
                })}
              >
                {reward ? <AssetThumb assetId={reward.assetId} alt="" size={46} /> : null}
                <div>
                  <div className={css({ textStyle: 'micro', color: 'faint' })}>선택한 보상</div>
                  <div
                    className={css({
                      mt: '2px',
                      textStyle: 'label',
                      fontWeight: '600',
                      color: reward ? 'ink' : 'faint',
                    })}
                  >
                    {reward?.name ?? '아직 선택하지 않음'}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </>
  )
}
