/**
 * FAQ 등록 · 편집 — 앱 미리보기를 옆에 둔다.
 *
 * **등록과 편집이 같은 화면**이다 — `?id=` 유무로 갈린다(아이템 폼과 같은 규칙, docs/ARCHITECTURE.md §18.7).
 */
import { useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Switch } from '@/shared/ui/Switch'
import { Textarea } from '@/shared/ui/Textarea'

import { FAQ_CATEGORIES, joinTags, validateFaq, type FaqInput } from '@/domain/faq'
import { SCREENS } from '@/domain/screens'

import { useDeleteFaq, useFaq, useSaveFaq } from '@/api/faq'

import { useUnsavedGuard } from '@/stores/dirtyStore'

const EMPTY: FaqInput = { category: '계정', question: '', answer: '', visible: true, tags: '' }

/**
 * 주소에 실려 온 초기값. **1:1 문의 상세의 「FAQ로 등록」 이 채워 준다** —
 * 같은 질문이 또 오지 않게 하는 것이 CS 의 목적이라, 답변을 옮겨 적게 하지 않는다
 * (docs/ARCHITECTURE.md §28.3).
 */
const prefillOf = (p: URLSearchParams): FaqInput => ({
  ...EMPTY,
  question: p.get('q') ?? '',
  answer: p.get('a') ?? '',
})

/** 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2) */
const idOf = (p: URLSearchParams): string => p.get('id') ?? ''

export default function FaqFormPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data, isPending, error } = useFaq(idOf(params))
  const save = useSaveFaq()
  const remove = useDeleteFaq()
  // 손대기 전에는 `null` — 그동안은 서버 값을 그대로 보여 준다.
  // ⚠️ **`useEffect` 로 폼에 복사하지 않는다.** 서버 값이 늦게 오면 한 번 그린 뒤
  //    덮어쓰게 되고, 그사이 사용자가 친 글자가 사라진다 (docs/ARCHITECTURE.md §27.3).
  const [draft, setDraft] = useState<FaqInput | null>(null)
  const [tried, setTried] = useState(false)
  const [asking, setAsking] = useState(false)
  const markSaved = useUnsavedGuard(draft !== null)

  const faqId = idOf(params)
  const editing = faqId !== ''
  const loaded: FaqInput | null = data
    ? {
        category: data.category,
        question: data.question,
        answer: data.answer,
        visible: data.visible,
        tags: joinTags(data.tags),
      }
    : null
  const form = draft ?? loaded ?? prefillOf(params)
  const errors = validateFaq(form)

  if (editing && isPending) return <Skeleton rows={8} />
  if (editing && (error || !data)) {
    return <ErrorBanner message={error?.message ?? 'FAQ 를 불러오지 못했습니다.'} />
  }

  const set = <K extends keyof FaqInput>(k: K, v: FaqInput[K]) => setDraft({ ...form, [k]: v })

  const back = () => navigate(SCREENS.faq.path)

  const commit = () => {
    setTried(true)
    if (Object.keys(errors).length > 0) return
    save.mutate(
      { input: form, faqId: editing ? Number(faqId) : undefined },
      { onSuccess: () => { markSaved(); back() } },
    )
  }

  return (
    <>
      <PageHeader
        title={editing ? 'FAQ 편집' : 'FAQ 등록'}
        sub="앱의 도움말이자 1:1 문의 답변의 템플릿입니다."
        actions={
          <>
            {editing && (
              <Button variant="danger" onClick={() => setAsking(true)} disabled={remove.isPending}>
                삭제
              </Button>
            )}
            <Button onClick={back}>취소</Button>
            <Button variant="primary" onClick={commit} disabled={save.isPending}>
              {editing ? '저장' : '등록'}
            </Button>
          </>
        }
      />

      {(save.error || remove.error) && (
        <ErrorBanner message={(save.error ?? remove.error)!.message} />
      )}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '2 1 420px', minWidth: '0', p: '15px 17px' })}>
          <CardTitle title="내용" />
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '13px', mt: '13px' })}>
            <div>
              <div className={css({ mb: '6px', textStyle: 'label', fontWeight: '600', color: 'ink' })}>분류</div>
              <Segmented
                value={form.category}
                onChange={(v) => set('category', v)}
                options={FAQ_CATEGORIES}
                aria-label="분류"
              />
            </div>

            <Input
              value={form.question}
              onChange={(v) => set('question', v)}
              label="질문"
              placeholder="예: 알이 부화하지 않아요"
              error={tried ? errors.question : undefined}
              required
            />

            <Textarea
              value={form.answer}
              onChange={(v) => set('answer', v)}
              label="답변"
              placeholder="유저가 읽을 답변을 입력하세요"
              hint="줄바꿈은 앱에서도 그대로 보입니다"
              error={tried ? errors.answer : undefined}
              required
              rows={5}
            />

            <Input
              value={form.tags}
              onChange={(v) => set('tags', v)}
              label="연결 키워드"
              placeholder="젬, 결제, 미지급"
              hint="쉼표로 구분 · 문의 자동 추천에 씁니다"
            />

            <Switch
              checked={form.visible}
              onChange={(v) => set('visible', v)}
              label="앱에 노출"
              hint="꺼도 저장됩니다 — 문의 답변 템플릿으로는 계속 쓸 수 있습니다"
            />
          </div>
        </Card>

        <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px 17px' })}>
          <CardTitle title="앱 미리보기" sub="유저에게 보이는 모양입니다." />
          <div
            className={css({
              mt: '12px',
              p: '13px',
              borderRadius: 'lg',
              bg: 'prev',
              border: '1px solid token(colors.bd)',
            })}
          >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '7px', mb: '10px' })}>
              <span className={css({ textStyle: 'micro', fontWeight: '700', color: 'priD' })}>
                {form.category}
              </span>
              <span className={css({ textStyle: 'micro', color: 'faint' })}>자주 묻는 질문</span>
            </div>
            <QaLine mark="Q" text={form.question.trim() || '질문이 여기에 보입니다'} strong />
            <QaLine mark="A" text={form.answer.trim() || '답변이 여기에 보입니다'} />
          </div>
          {!form.visible && (
            <p className={css({ m: '10px 0 0', textStyle: 'micro', color: 'warnFg' })}>
              지금은 앱에 보이지 않습니다. 저장은 됩니다.
            </p>
          )}
        </Card>
      </div>

      <Dialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={() => remove.mutate(Number(faqId), { onSuccess: () => { markSaved(); back() } })}
        title="FAQ 를 지웁니다"
        body="지우면 앱에서 사라지고 1:1 문의 답변 템플릿에서도 없어집니다. 앱에만 감추려면 「앱에 노출」 을 끄세요."
        tone="danger"
        confirmLabel={remove.isPending ? '지우는 중…' : '삭제'}
      />
    </>
  )
}

function QaLine({ mark, text, strong }: { mark: string; text: string; strong?: boolean }) {
  return (
    <div className={css({ display: 'flex', gap: '9px', mt: mark === 'A' ? '9px' : '0' })}>
      <span
        aria-hidden="true"
        className={css({
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          width: '20px',
          height: '20px',
          borderRadius: 'full',
          bg: mark === 'Q' ? 'soft' : 'nBg',
          color: mark === 'Q' ? 'priD' : 'sub',
          textStyle: 'micro',
          fontWeight: '700',
        })}
      >
        {mark}
      </span>
      <span
        className={css({
          flex: '1',
          minWidth: '0',
          textStyle: strong ? 'label' : 'caption',
          fontWeight: strong ? '700' : '400',
          color: strong ? 'ink' : 'sub',
          whiteSpace: 'pre-line',
        })}
      >
        {text}
      </span>
    </div>
  )
}
