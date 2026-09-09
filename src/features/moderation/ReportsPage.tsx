/**
 * 신고 처리 — 왼쪽 큐, 오른쪽 상세.
 *
 * **한 화면에서 목록과 상세를 같이 본다.** 상세를 별도 라우트로 빼지 않은 이유는
 * 이게 훑는 화면이기 때문이다 — 밀린 신고를 위에서 아래로 처리하는 동안 왼쪽 큐가
 * 계속 보여야 몇 개 남았는지 알 수 있다 (docs/ARCHITECTURE.md §23.2).
 *
 * ⚠️ **신고만으로는 아무것도 가려지지 않는다.** 자동 숨김을 걷어냈으므로 여기서
 *    「숨김」 을 누르기 전까지 사진은 앱에 계속 보인다 — 이 화면이 늦으면 그만큼
 *    노출이 길어지고, 그건 되돌릴 수 없다 (§23.0).
 */
import { useEffect, useRef, useState } from 'react'

import { useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Icon } from '@/shared/ui/Icon'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'

import {
  canDecide,
  filterReports,
  isOverThreshold,
  nextAfterRemoved,
  REPORT_STATE_TONE,
  REPORT_TABS,
  reportCount,
  REPORT_THRESHOLD,
  type Report,
  type Reporter,
  type ReportState,
  type ReportTab,
} from '@/domain/moderation'

import { useDecide, useReports } from '@/api/moderation'

import { CertPhotoPanel } from '@/entities/moderation'

const isTab = (v: string | null): v is ReportTab => REPORT_TABS.some((t) => t === v)

/** 주소가 가리키는 탭. **기본은 「미검토」** — 이 화면에 오는 이유가 그것이다 */
const tabOf = (p: URLSearchParams): ReportTab => {
  const v = p.get('tab')
  return isTab(v) ? v : '미검토'
}

/**
 * 지금 주소의 쿼리. **렌더 시점 값이 아니라 브라우저가 들고 있는 것.**
 *
 * ⚠️ **`setSearchParams` 의 갱신 함수로는 최신 값을 못 받는다.** react-router 8 은
 *    `nextInit(new URLSearchParams(searchParams))` 로 부르는데, 그 `searchParams` 는
 *    **그 `setSearchParams` 를 만든 렌더의 값**이다(`useCallback([navigate, searchParams])`).
 *    비동기 콜백은 옛 setter 를 쥐고 있으므로 `prev` 도 똑같이 낡았다
 *    (docs/ARCHITECTURE.md §23.2.1).
 */
const liveParams = (): URLSearchParams => new URLSearchParams(window.location.search)

/** `base` 에 값을 얹은 새 쿼리. **빈 값은 지운다** — `?id=` 는 아무것도 안 가리킨다 */
function withParams(
  base: URLSearchParams,
  next: Partial<Record<'tab' | 'id', string>>,
): URLSearchParams {
  const p = new URLSearchParams(base)
  for (const [k, v] of Object.entries(next)) {
    if (v === '') p.delete(k)
    else p.set(k, v)
  }
  return p
}

/** `2026-08-14 06:58` → `08-14 06:58`. 연도는 큐에서 자리만 먹는다 */
const short = (at: string): string => at.slice(5)

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useReports()
  const decide = useDecide()

  const tab = tabOf(params)
  // 순서는 파사드가 정해서 온다 (§23.4) — 여기서 다시 정렬하지 않는다.
  const rows = filterReports(data?.reports ?? [], tab)
  // URL 의 id 가 이 탭에 없을 수 있다 — 처리해서 빠졌거나 남이 보낸 링크다. 첫 행으로 떨어진다.
  const selected = rows.find((r) => String(r.key) === params.get('id')) ?? rows[0]

  const patch = (next: Partial<Record<'tab' | 'id', string>>) =>
    setParams(withParams(liveParams(), next), { replace: true })

  const run = (next: ReportState) => {
    if (!selected) return
    // 처리하면 「미검토」 탭에서는 이 행이 빠진다. 다음 건을 미리 잡아 둬야 오른쪽이 비지 않는다.
    const after = nextAfterRemoved(rows, selected.key)
    decide.mutate(
      { key: selected.key, next },
      {
        onSuccess: () => {
          // 변이가 도는 사이에 탭을 옮겼을 수 있다. 거기서는 행이 그대로 남으므로 건드리지 않는다.
          if (tabOf(liveParams()) !== '미검토') return
          patch({ id: after === null ? '' : String(after) })
        },
      },
    )
  }

  return (
    <>
      <PageHeader
        title="신고 처리"
        sub="신고가 쌓인 인증을 사람이 검토합니다. 가릴지는 여기서만 정합니다."
        actions={
          <>
            {/* TODO(운영 위키가 생기면): 처리 기준 문서로 나가는 외부 링크 (§18.8) */}
            <Button disabled>처리 기준 문서 · 준비 중</Button>
          </>
        }
      />

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <>
          <SkeletonStats count={4} min={150} className={css({ mb: '16px' })} />
          <SkeletonRows rows={8} silent />
        </>
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? '신고를 불러오지 못했습니다.'} />
      ) : (
        <>
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              mb: '16px',
            })}
          >
            {/*
              ⚠️ **「우선 검토」 는 「미검토」 의 부분집합이다.** 둘을 더하면 안 된다 —
                 라벨에 기준치를 적어 두 칸이 같은 것을 다르게 세고 있음을 드러낸다.
            */}
            <StatTile
              label={`우선 검토 · 신고 ${REPORT_THRESHOLD}건+`}
              value={num(data.summary.urgent)}
              alert={data.summary.urgent > 0}
            />
            <StatTile label="미검토" value={num(data.summary.waiting)} />
            <StatTile label="오늘 접수" value={num(data.summary.today)} />
            <StatTile label="숨김" value={num(data.summary.hidden)} />
          </div>

          {decide.error && <ErrorBanner message={decide.error.message} />}

          <div
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
              alignItems: 'flex-start',
            })}
          >
            <Card
              className={css({
                flex: '1 1 320px',
                maxWidth: '400px',
                p: '0',
                overflow: 'hidden',
              })}
            >
              <div
                className={css({ p: '13px 15px', borderBottom: '1px solid token(colors.ln)' })}
              >
                <Segmented
                  value={tab}
                  onChange={(v) => patch({ tab: v, id: '' })}
                  options={[...REPORT_TABS]}
                  aria-label="신고 상태"
                />
              </div>
              {rows.length === 0 ? (
                <p
                  className={css({
                    m: '0',
                    p: '28px 15px',
                    textAlign: 'center',
                    textStyle: 'body',
                    color: 'faint',
                  })}
                >
                  처리할 신고가 없습니다.
                </p>
              ) : (
                <ul className={css({ listStyle: 'none', m: '0', p: '0' })}>
                  {rows.map((r) => (
                    <QueueRow
                      key={r.key}
                      report={r}
                      on={r.key === selected?.key}
                      pick={() => patch({ id: String(r.key) })}
                    />
                  ))}
                </ul>
              )}
            </Card>

            {selected && <Detail report={selected} onDecide={run} busy={decide.isPending} />}
          </div>
        </>
      )}
    </>
  )
}

function QueueRow({ report: r, on, pick }: { report: Report; on: boolean; pick: () => void }) {
  const urgent = isOverThreshold(r) && r.state === '미검토'

  return (
    <li>
      <button
        type="button"
        onClick={pick}
        // 지금 보고 있는 행은 왼쪽 막대로 표시한다. 배경색만으로는 hover 와 구분이 안 된다.
        aria-current={on ? 'true' : undefined}
        className={css({
          display: 'flex',
          gap: '11px',
          width: '100%',
          textAlign: 'left',
          p: '11px 15px',
          border: '0',
          borderLeft: '3px solid',
          // 선택 표시가 우선순위 표시보다 앞선다 — 지금 어디를 보고 있는지가 먼저다.
          borderLeftColor: on ? 'pri' : urgent ? 'rFg' : 'transparent',
          borderBottom: '1px solid token(colors.ln)',
          bg: on ? 'prev2' : 'transparent',
          cursor: 'pointer',
          _hover: { bg: 'hov' },
          _focusVisible: { outline: '2px solid token(colors.ringBd)', outlineOffset: '-2px' },
        })}
      >
        <span
          className={css({
            flex: 'none',
            display: 'grid',
            placeItems: 'center',
            width: '38px',
            height: '38px',
            borderRadius: 'md',
            bg: 'prev',
            color: 'faint',
          })}
        >
          <Icon name="ic_image" size={18} />
        </span>
        <span className={css({ minWidth: '0', flex: '1' })}>
          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
            })}
          >
            <Badge tone={REPORT_STATE_TONE[r.state]} size="sm">
              {r.state}
            </Badge>
            {urgent && <ThresholdBadge />}
            <span className={css({ textStyle: 'micro', color: 'faint' })}>
              신고 {num(reportCount(r))}건
            </span>
          </span>
          <span
            className={css({
              display: 'block',
              mt: '3px',
              textStyle: 'label',
              fontWeight: '600',
              color: 'ink',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {r.title}
          </span>
          <span
            className={css({ display: 'block', mt: '1px', textStyle: 'micro', color: 'faint' })}
          >
            {r.who} · {short(r.at)}
          </span>
        </span>
      </button>
    </li>
  )
}

function Detail({
  report: r,
  onDecide,
  busy,
}: {
  report: Report
  onDecide: (next: ReportState) => void
  busy: boolean
}) {
  return (
    <div
      className={css({
        flex: '2 1 420px',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      })}
    >
      <Card className={css({ p: '17px 20px' })}>
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 16px',
            alignItems: 'flex-start',
          })}
        >
          <div className={css({ flex: '1 1 260px', minWidth: '0' })}>
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              })}
            >
              <Badge tone={REPORT_STATE_TONE[r.state]}>{r.state}</Badge>
              {/* 검토를 마쳐도 남긴다 — 신고가 많았다는 건 판단과 무관한 사실이다 (§23.3) */}
              {isOverThreshold(r) && <ThresholdBadge size="md" />}
              <span
                className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}
              >
                {r.code}
              </span>
            </div>
            <h3
              className={css({
                m: '9px 0 0',
                textStyle: 'h3',
                fontWeight: '700',
                color: 'ink',
              })}
            >
              {r.title}
            </h3>
            <p className={css({ m: '4px 0 0', textStyle: 'caption', color: 'sub' })}>
              {r.who} · {r.at}
            </p>
          </div>
          <div className={css({ display: 'flex', gap: '8px' })}>
            {/* 이미 그 상태인 쪽은 잠근다 — 눌러도 아무 일이 없는데 반응한 것처럼 보인다 */}
            <Button
              onClick={() => onDecide('노출 유지')}
              disabled={busy || !canDecide(r, '노출 유지')}
            >
              노출 유지
            </Button>
            {/* ⚠️ **사진을 실제로 내리는 유일한 버튼이다.** 나머지는 기록만 남긴다 */}
            <Button
              variant="danger"
              onClick={() => onDecide('숨김')}
              disabled={busy || !canDecide(r, '숨김')}
            >
              숨김
            </Button>
          </div>
        </div>

        {/* 사진 자리와 취급 규칙은 AI 심사도 같은 것을 쓴다 — `entities` 로 올렸다 (§23.5) */}
        <div className={css({ mt: '15px' })}>
          <CertPhotoPanel />
        </div>
      </Card>

      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '18px',
          alignItems: 'flex-start',
        })}
      >
        <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px' })}>
          <CardTitle
            title={`신고자 ${num(reportCount(r))}명`}
            sub="사유는 신고한 사람이 고르거나 직접 쓴 값입니다."
          />
          <ul
            className={css({
              listStyle: 'none',
              m: '12px 0 0',
              p: '0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            })}
          >
            {r.reporters.map((p) => (
              <ReporterRow key={`${p.nick}-${p.at}`} reporter={p} />
            ))}
          </ul>
        </Card>

        <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px' })}>
          <CardTitle title="작성자 이력" sub="이 건 하나가 아니라 사람을 봅니다." />
          <dl
            className={css({
              m: '12px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
            })}
          >
            <Row k="닉네임" v={r.who} />
            <Row k="누적 인증" v={`${num(r.author.certs)}회`} />
            <Row k="피신고" v={`${num(r.author.reports)}건`} />
            <Row k="숨김 확정" v={`${num(r.author.hidden)}건`} />
            <Row k="제재 이력" v={r.author.bans > 0 ? `${num(r.author.bans)}회` : '없음'} />
          </dl>
          <div className={css({ mt: '13px' })}>
            {/* TODO(제재 정책이 정해지면): 기간·사유를 받는 확인 창을 띄운다 (§18.8) */}
            <Button variant="danger" disabled>
              이 회원 제재하기 · 준비 중
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

/**
 * 신고가 기준치를 넘겼다는 표시.
 *
 * ⚠️ **건수를 적지 않는다.** 바로 옆에 「신고 7건」 이 있어서 「기준 초과 7건」 으로 쓰면
 *    같은 수를 두 번 세는 것처럼 읽힌다.
 */
function ThresholdBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <Badge tone="danger" size={size}>
      기준 초과
    </Badge>
  )
}

/**
 * 신고자 한 명. **정해진 사유는 배지, 「기타」 본문은 인용 블록**이다.
 *
 * ⚠️ **본문을 배지로 그리면 안 된다.** `Badge` 는 `white-space: nowrap` 이라 문장 하나가
 *    한 줄로 늘어나 카드를 밀어낸다 (docs/ARCHITECTURE.md §23.7).
 */
function ReporterRow({ reporter: p }: { reporter: Reporter }) {
  const [open, setOpen] = useState(false)
  const [clipped, setClipped] = useState(false)
  const quote = useRef<HTMLQuoteElement>(null)

  /*
    ⚠️ **글자 수로 어림하지 않는다.** 「60자 넘으면 붙인다」 로 두면 세 줄에 딱 맞는 글에도
       눌러 봐야 아무 일도 없는 버튼이 붙는다 (§18.8). 카드 폭이 `flex` 라 한 줄에 들어가는
       글자 수도 창 크기마다 달라서, 넘쳤는지는 **재야만** 안다.

    펼친 동안에는 재지 않는다 — 클램프가 풀려 있어 `scrollHeight === clientHeight` 라,
    재면 "안 넘쳤다" 가 되어 접을 버튼이 사라진다.
  */
  useEffect(() => {
    const el = quote.current
    if (!el || open) return

    const measure = () => setClipped(el.scrollHeight > el.clientHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, p.detail])

  return (
    <li className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}>
      <div className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
        <span
          aria-hidden="true"
          className={css({
            flex: 'none',
            display: 'grid',
            placeItems: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'full',
            bg: 'avB',
            color: 'avF',
            textStyle: 'micro',
            fontWeight: '700',
          })}
        >
          {p.nick.slice(0, 1)}
        </span>
        <span className={css({ flex: '1', minWidth: '0' })}>
          <span
            className={css({
              display: 'block',
              textStyle: 'label',
              fontWeight: '600',
              color: 'ink',
            })}
          >
            {p.nick}
          </span>
          <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>
            {short(p.at)}
          </span>
        </span>
        <Badge size="sm">{p.why}</Badge>
      </div>

      {p.detail && (
        <div
          className={css({ pl: '37px', display: 'flex', flexDirection: 'column', gap: '4px' })}
        >
          <blockquote
            ref={quote}
            // 세 줄에서 자른다. Panda 가 `WebkitBoxOrient` 를 모르므로 인라인으로 준다 —
            // 값이 고정이라 정적 추출이 필요 없다.
            className={css({
              display: open ? 'block' : '-webkit-box',
              overflow: 'hidden',
              m: '0',
              p: '7px 11px',
              borderLeft: '3px solid token(colors.bd)',
              // 왼쪽은 인용 막대라 각지게 둔다 — 오른쪽만 깎는다.
              borderTopRightRadius: 'xs',
              borderBottomRightRadius: 'xs',
              bg: 'prev',
              textStyle: 'caption',
              color: 'sub',
              // 유저가 쓴 글이라 줄바꿈이 들어 있다. 그대로 살리되 긴 단어는 접는다.
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            })}
            style={open ? undefined : { WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
          >
            {p.detail}
          </blockquote>
          {clipped && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className={css({
                alignSelf: 'flex-start',
                border: '0',
                bg: 'transparent',
                p: '0',
                textStyle: 'micro',
                fontWeight: '700',
                color: 'priD',
                cursor: 'pointer',
                _hover: { textDecoration: 'underline' },
                _focusVisible: {
                  outline: '2px solid token(colors.ringBd)',
                  outlineOffset: '2px',
                },
              })}
            >
              {open ? '접기' : '전문 보기'}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt
        className={css({ flex: 'none', width: '72px', textStyle: 'caption', color: 'faint' })}
      >
        {k}
      </dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textAlign: 'right',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
        })}
      >
        {v}
      </dd>
    </div>
  )
}
