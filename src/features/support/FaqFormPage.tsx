/**
 * FAQ 등록 · 편집 — 앱 미리보기를 옆에 둔다.
 *
 * **등록과 편집이 같은 화면**이다 — `?id=` 유무로 갈린다(아이템 폼과 같은 규칙, docs/ARCHITECTURE.md §18.7).
 */
import { useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { restoreDraft } from '@/shared/lib/draft'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonForm } from '@/shared/ui/Skeleton'
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

/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 화면마다의 `/…/new` 가 **같은 칸을
 *    써서 하나가 다른 하나를 덮어쓴다** (docs/ARCHITECTURE.md §33.2).
 */
const draftScope = (faqId: string): string => `faq:${faqId || 'new'}`

/**
 * 편집 대상이 정해진 뒤에 폼을 마운트한다.
 *
 * ⚠️ **`?id=` 만 바뀌면 경로가 같아서 컴포넌트가 다시 마운트되지 않는다.** 그러면
 *    3번을 쓰다 만 초안이 5번 화면에 그대로 뜨고, **5번 칸에 저장되며, 저장을 누르면
 *    3번의 내용이 5번에 덮어써진다** (docs/ARCHITECTURE.md §33.7).
 */
/** 로딩 중에도 그리므로 두 곳이 같은 문장을 쓰게 상수로 둔다 (§43.2) */
const FORM_SUB = '앱의 도움말이자 1:1 문의 답변의 템플릿입니다.'

export default function FaqFormPage() {
  const [params] = useSearchParams()
  const { data, isPending, error } = useFaq(idOf(params))

  const faqId = idOf(params)
  const editing = faqId !== ''

  if (editing && isPending) {
    // ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제가 데이터를 안 쓰므로 아는 값이다.
    //    지웠다 다시 그리면 아는 것까지 튄다 (docs/ARCHITECTURE.md §43.2).
    //    다만 **버튼은 빼둔다** — 아직 없는 데이터를 대상으로 하는 동작이다.
    return (
      <>
        <PageHeader title={editing ? 'FAQ 편집' : 'FAQ 등록'} sub={FORM_SUB} />
        <SkeletonForm fields={4} />
      </>
    )
  }
  if (editing && (error || !data)) {
    return <ErrorBanner message={error?.message ?? 'FAQ 를 불러오지 못했습니다.'} />
  }

  const initial: FaqInput = data
    ? {
        category: data.category,
        question: data.question,
        answer: data.answer,
        visible: data.visible,
        tags: joinTags(data.tags),
      }
    : prefillOf(params)

  // ⚠️ **`key` 가 대상을 바꿀 때 초안 · 오류 표시 · 알림을 함께 초기화한다.**
  return <FaqForm key={faqId} faqId={faqId} initial={initial} />
}

/**
 * 폼 본체. 초기값이 준비된 뒤에 마운트되므로 **서버 값을 `useEffect` 로 복사하지
 * 않는다** — 늦게 온 값이 사용자가 친 글자를 덮어쓰는 사고를 아예 없앤다 (§27.3).
 */
function FaqForm({ faqId, initial }: { faqId: string; initial: FaqInput }) {
  const navigate = useNavigate()
  const save = useSaveFaq()
  const remove = useDeleteFaq()
  // 손대기 전에는 `null` — 그동안은 받아 온 값을 그대로 보여 준다.
  const [draft, setDraft] = useState<FaqInput | null>(() => restoreDraft(draftScope(faqId), EMPTY))
  const [tried, setTried] = useState(false)
  const [asking, setAsking] = useState(false)
  // ⚠️ **알림 표시 여부는 따로 둔다.** `draft` 는 계속 바뀌므로 「되살렸다」 의 표시로
  //    쓸 수 없다 — 「새로 시작」 을 눌러도 그 뒤 한 글자만 치면 다시 참이 된다.
  const [noticeOpen, setNoticeOpen] = useState(draft != null)
  const markSaved = useUnsavedGuard(draft !== null)
  // `draft` 가 `null` 이 아니면 손댄 것이다 — 이 화면은 그게 곧 더러움이다.
  const autosave = useFormDraft(draftScope(faqId), draft, draft !== null)

  const editing = faqId !== ''
  const form = draft ?? initial
  const errors = validateFaq(form)

  const set = <K extends keyof FaqInput>(k: K, v: FaqInput[K]) => setDraft({ ...form, [k]: v })

  const back = () => navigate(SCREENS.faq.path)

  const commit = () => {
    setTried(true)
    if (Object.keys(errors).length > 0) return
    save.mutate(
      { input: form, faqId: editing ? Number(faqId) : undefined },
      { onSuccess: () => { autosave.clear(); markSaved(); back() } },
    )
  }

  return (
    <>
      <PageHeader
        title={editing ? 'FAQ 편집' : 'FAQ 등록'}
        sub={FORM_SUB}
        actions={
          <>
            {editing && (
              <Button variant="danger" onClick={() => setAsking(true)} disabled={remove.isPending}>
                삭제
              </Button>
            )}
            <Button onClick={back}>취소</Button>
            <Button onClick={autosave.saveNow} disabled={draft === null}>
              임시 저장
            </Button>
            <Button variant="primary" onClick={commit} disabled={save.isPending}>
              {editing ? '저장' : '등록'}
            </Button>
          </>
        }
      />

      {noticeOpen && (
        <DraftNotice
          onDiscard={() => {
            autosave.clear()
            setDraft(null)
            setNoticeOpen(false)
          }}
        />
      )}
      <DraftSavedAt at={autosave.savedAt} />

      {save.error && <ErrorBanner message={save.error.message} />}
      {remove.error && <ErrorBanner message={remove.error.message} />}

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
