/**
 * FAQ 목록 — 순서 · 노출 · 편집.
 *
 * **순서가 곧 앱 노출 순서**라, 분류로 거른 상태에서는 순서를 못 바꾼다
 * (docs/ARCHITECTURE.md §27.2).
 */
import { useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { moveSlot } from '@/shared/lib/array'
import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Switch } from '@/shared/ui/Switch'

import { FAQ_TABS, filterFaqs, isMeasured, POOR_HELPFUL, type Faq, type FaqTab } from '@/domain/faq'
import { SCREENS } from '@/domain/screens'

import { useFaqs, useReorderFaqs, useToggleFaq } from '@/api/faq'

import { useUnsavedGuard } from '@/stores/dirtyStore'

const isTab = (v: string | null): v is FaqTab => FAQ_TABS.some((t) => t === v)

export default function FaqPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useFaqs()
  const reorder = useReorderFaqs()
  const toggle = useToggleFaq()
  const [draft, setDraft] = useState<Faq[] | null>(null)
  const markSaved = useUnsavedGuard(draft !== null)

  const tabParam = params.get('tab')
  const tab: FaqTab = isTab(tabParam) ? tabParam : '전체'
  const all = draft ?? data?.faqs ?? []
  const rows = filterFaqs(all, tab)
  const dirty = draft !== null
  // 거른 상태에서 위아래로 옮기면 안 보이는 항목과의 상대 순서를 알 수 없다.
  const canMove = tab === '전체'

  const move = (key: number, delta: number) => {
    const at = all.findIndex((f) => f.key === key)
    setDraft(moveSlot(all, at, at + delta))
  }

  /**
   * ⚠️ **순서 초안이 있으면 화면은 초안을 본다.** 서버만 고치면 토글이 반응하지 않는다 —
   *    무효화로 새 데이터가 와도 `draft` 가 그걸 가린다 (docs/ARCHITECTURE.md §27.2.1).
   */
  const toggleVisible = (faqId: number, visible: boolean) =>
    toggle.mutate(
      { faqId, visible },
      {
        onSuccess: () =>
          setDraft((prev) => prev && prev.map((f) => (f.key === faqId ? { ...f, visible } : f))),
      },
    )

  const commit = () =>
    reorder.mutate(
      all.map((f) => f.key),
      { onSuccess: () => { setDraft(null); markSaved() } },
    )

  return (
    <>
      <PageHeader
        title="FAQ"
        sub="위에서부터 앱에 노출되고, 1:1 문의 답변에 템플릿으로 끌어다 쓸 수 있습니다."
        actions={
          <>
            <Button onClick={commit} disabled={!dirty || reorder.isPending}>
              {dirty ? '순서 저장' : '저장됨'}
            </Button>
            <Button variant="primary" onClick={() => navigate(SCREENS.faqnew.path)}>
              FAQ 등록
            </Button>
          </>
        }
      />

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <>
          <SkeletonStats count={3} min={150} />
          <SkeletonRows rows={8} silent className={css({ mt: '14px' })} />
        </>
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? 'FAQ 를 불러오지 못했습니다.'} />
      ) : (
        <>
          {(reorder.error || toggle.error) && (
            <ErrorBanner message={(reorder.error ?? toggle.error)!.message} />
          )}

          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              mb: '16px',
            })}
          >
            <StatTile label="앱에 노출" value={num(data.summary.live)} />
            <StatTile label="전체" value={num(data.summary.total)} />
            {/* 도움됨이 낮은 것은 답이 문제를 못 풀어 주고 있다는 신호다 */}
            <StatTile
              label={`손봐야 함 (도움됨 ${POOR_HELPFUL}% 미만)`}
              value={num(data.summary.poor)}
              alert={data.summary.poor > 0}
            />
          </div>

          <div
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              mb: '14px',
            })}
          >
            <Segmented
              value={tab}
              onChange={(v) => {
                const p = new URLSearchParams(params)
                if (v === '전체') p.delete('tab')
                else p.set('tab', v)
                setParams(p, { replace: true })
              }}
              options={[...FAQ_TABS]}
              aria-label="FAQ 분류"
            />
            {!canMove && (
              <span className={css({ textStyle: 'caption', color: 'faint' })}>
                순서는 「전체」 에서만 바꿀 수 있습니다.
              </span>
            )}
          </div>

          <Card className={css({ p: '0', overflow: 'hidden' })}>
            <ol className={css({ listStyle: 'none', m: '0', p: '0' })}>
              {rows.map((f) => (
                <FaqRow
                  key={f.key}
                  faq={f}
                  n={all.indexOf(f) + 1}
                  canMove={canMove}
                  onUp={all.indexOf(f) === 0 ? undefined : () => move(f.key, -1)}
                  onDown={all.indexOf(f) === all.length - 1 ? undefined : () => move(f.key, 1)}
                  onToggle={(visible) => toggleVisible(f.key, visible)}
                  onEdit={() => navigate(`${SCREENS.faqnew.path}?id=${f.key}`)}
                  busy={reorder.isPending || toggle.isPending}
                />
              ))}
            </ol>
          </Card>
        </>
      )}
    </>
  )
}

function FaqRow({
  faq: f,
  n,
  canMove,
  onUp,
  onDown,
  onToggle,
  onEdit,
  busy,
}: {
  faq: Faq
  n: number
  canMove: boolean
  onUp?: () => void
  onDown?: () => void
  onToggle: (visible: boolean) => void
  onEdit: () => void
  busy: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <li className={css({ borderBottom: '1px solid token(colors.ln)' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '11px', p: '11px 15px' })}>
        <span className={css({ flex: 'none', width: '22px', textStyle: 'caption', color: 'faint', textAlign: 'right' })}>
          {n}
        </span>
        <Badge size="sm">{f.category}</Badge>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={css({
            flex: '1',
            minWidth: '0',
            textAlign: 'left',
            border: '0',
            bg: 'transparent',
            p: '0',
            cursor: 'pointer',
            textStyle: 'label',
            fontWeight: '600',
            color: 'ink',
            _focusVisible: { outline: '2px solid token(colors.ringBd)', outlineOffset: '2px' },
          })}
        >
          {f.question}
        </button>
        <span className={css({ flex: 'none', width: '64px', textAlign: 'right', textStyle: 'caption', color: 'sub' })}>
          {/* 새로 등록한 FAQ 는 아직 아무도 안 봤다 — 0 이 아니라 잴 것이 없다 */}
          {isMeasured(f) ? num(f.views) : '—'}
        </span>
        <span className={css({ flex: 'none', width: '110px', display: 'flex', alignItems: 'center', gap: '8px' })}>
          <span className={css({ flex: '1' })}>
            {/* 못 잰 값을 0% 막대로 그리면 「아무도 도움 안 됐다」 로 읽힌다 */}
            <ProgressBar rate={isMeasured(f) ? f.helpful : 0} label={`${f.question} 도움됨`} />
          </span>
          <span className={css({ flex: 'none', width: '34px', textAlign: 'right', textStyle: 'caption', color: 'sub' })}>
            {isMeasured(f) ? `${f.helpful}%` : '—'}
          </span>
        </span>
        <span className={css({ flex: 'none' })}>
          <Switch
            checked={f.visible}
            onChange={onToggle}
            disabled={busy}
            // 줄마다 스위치가 있으므로 이름은 다 적고 화면에서만 감춘다 (§27.2)
            label={`${f.question} 앱에 노출`}
            labelHidden
          />
        </span>
        <span className={css({ display: 'flex', gap: '4px' })}>
          {/* 거른 상태에서는 옮길 수 없다 — 버튼을 없애지 않고 잠가 이유를 위에 적는다 */}
          <Button onClick={onUp} disabled={busy || !canMove || !onUp} aria-label={`${f.question} 위로`}>
            ↑
          </Button>
          <Button onClick={onDown} disabled={busy || !canMove || !onDown} aria-label={`${f.question} 아래로`}>
            ↓
          </Button>
          <Button onClick={onEdit}>편집</Button>
        </span>
      </div>
      {open && (
        <p
          className={css({
            m: '0',
            p: '0 15px 14px 48px',
            textStyle: 'body',
            color: 'sub',
            whiteSpace: 'pre-line',
          })}
        >
          {f.answer}
        </p>
      )}
    </li>
  )
}
