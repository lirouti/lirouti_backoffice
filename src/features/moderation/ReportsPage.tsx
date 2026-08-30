/**
 * 신고 처리 — 왼쪽 큐, 오른쪽 상세.
 *
 * **한 화면에서 목록과 상세를 같이 본다.** 상세를 별도 라우트로 빼지 않은 이유는
 * 이게 훑는 화면이기 때문이다 — 밀린 신고를 위에서 아래로 처리하는 동안 왼쪽 큐가
 * 계속 보여야 몇 개 남았는지 알 수 있다 (docs/ARCHITECTURE.md §23.2).
 */
import { useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Icon } from '@/shared/ui/Icon'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { StatTile } from '@/shared/ui/StatTile'

import {
  canDecide,
  filterReports,
  nextAfterRemoved,
  REPORT_STATE_TONE,
  REPORT_TABS,
  reportCount,
  type Report,
  type ReportState,
  type ReportTab,
} from '@/domain/moderation'

import { useDecide, useReports } from '@/api/moderation'

const isTab = (v: string | null): v is ReportTab => REPORT_TABS.some((t) => t === v)

/** 주소가 가리키는 탭. **기본은 「대기」** — 이 화면에 오는 이유가 그것이다 */
const tabOf = (p: URLSearchParams): ReportTab => {
  const v = p.get('tab')
  return isTab(v) ? v : '대기'
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
function withParams(base: URLSearchParams, next: Partial<Record<'tab' | 'id', string>>): URLSearchParams {
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
  const rows = filterReports(data?.reports ?? [], tab)
  // URL 의 id 가 이 탭에 없을 수 있다 — 처리해서 빠졌거나 남이 보낸 링크다. 첫 행으로 떨어진다.
  const selected = rows.find((r) => String(r.key) === params.get('id')) ?? rows[0]

  if (isPending) return <Skeleton rows={8} />
  if (error || !data) return <ErrorBanner message={error?.message ?? '신고를 불러오지 못했습니다.'} />

  const patch = (next: Partial<Record<'tab' | 'id', string>>) =>
    setParams(withParams(liveParams(), next), { replace: true })

  const run = (next: ReportState) => {
    if (!selected) return
    // 처리하면 「대기」 탭에서는 이 행이 빠진다. 다음 건을 미리 잡아 둬야 오른쪽이 비지 않는다.
    const after = nextAfterRemoved(rows, selected.key)
    decide.mutate(
      { key: selected.key, next },
      {
        onSuccess: () => {
          // 변이가 도는 사이에 탭을 옮겼을 수 있다. 거기서는 행이 그대로 남으므로 건드리지 않는다.
          if (tabOf(liveParams()) !== '대기') return
          patch({ id: after === null ? '' : String(after) })
        },
      },
    )
  }

  return (
    <>
      <PageHeader
        title="신고 처리"
        sub="자동으로 가려진 인증을 사람이 검토합니다. 오신고는 여기서 되돌립니다."
        actions={
          <>
            {/* TODO(운영 위키가 생기면): 처리 기준 문서로 나가는 외부 링크 (§18.8) */}
            <Button disabled>처리 기준 문서 · 준비 중</Button>
          </>
        }
      />

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          mb: '16px',
        })}
      >
        <StatTile label="검토 대기" value={num(data.summary.waiting)} alert={data.summary.waiting > 0} />
        <StatTile label="오늘 접수" value={num(data.summary.today)} />
        <StatTile label="숨김 유지" value={num(data.summary.kept)} />
        <StatTile label="숨김 해제" value={num(data.summary.freed)} />
      </div>

      {decide.error && <ErrorBanner message={decide.error.message} />}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '1 1 320px', maxWidth: '400px', p: '0', overflow: 'hidden' })}>
          <div className={css({ p: '13px 15px', borderBottom: '1px solid token(colors.ln)' })}>
            <Segmented
              value={tab}
              onChange={(v) => patch({ tab: v, id: '' })}
              options={[...REPORT_TABS]}
              aria-label="신고 상태"
            />
          </div>
          {rows.length === 0 ? (
            <p className={css({ m: '0', p: '28px 15px', textAlign: 'center', textStyle: 'body', color: 'faint' })}>
              처리할 신고가 없습니다.
            </p>
          ) : (
            <ul className={css({ listStyle: 'none', m: '0', p: '0' })}>
              {rows.map((r) => (
                <QueueRow key={r.key} report={r} on={r.key === selected?.key} pick={() => patch({ id: String(r.key) })} />
              ))}
            </ul>
          )}
        </Card>

        {selected && <Detail report={selected} onDecide={run} busy={decide.isPending} />}
      </div>
    </>
  )
}

function QueueRow({ report: r, on, pick }: { report: Report; on: boolean; pick: () => void }) {
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
          borderLeftColor: on ? 'pri' : 'transparent',
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
          <span className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
            <Badge tone={REPORT_STATE_TONE[r.state]} size="sm">
              {r.state}
            </Badge>
            <span className={css({ textStyle: 'micro', color: 'faint' })}>신고 {num(reportCount(r))}건</span>
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
          <span className={css({ display: 'block', mt: '1px', textStyle: 'micro', color: 'faint' })}>
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
    <div className={css({ flex: '2 1 420px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '18px' })}>
      <Card className={css({ p: '17px 20px' })}>
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '12px 16px', alignItems: 'flex-start' })}>
          <div className={css({ flex: '1 1 260px', minWidth: '0' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
              <Badge tone={REPORT_STATE_TONE[r.state]}>{r.state}</Badge>
              <span className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}>{r.code}</span>
            </div>
            <h3 className={css({ m: '9px 0 0', textStyle: 'h3', fontWeight: '700', color: 'ink' })}>{r.title}</h3>
            <p className={css({ m: '4px 0 0', textStyle: 'caption', color: 'sub' })}>
              {r.who} · {r.at}
            </p>
          </div>
          <div className={css({ display: 'flex', gap: '8px' })}>
            {/* 이미 그 상태인 쪽은 잠근다 — 눌러도 아무 일이 없는데 반응한 것처럼 보인다 */}
            <Button onClick={() => onDecide('숨김 해제')} disabled={busy || !canDecide(r, '숨김 해제')}>
              숨김 해제
            </Button>
            <Button variant="danger" onClick={() => onDecide('숨김 유지')} disabled={busy || !canDecide(r, '숨김 유지')}>
              숨김 유지
            </Button>
          </div>
        </div>

        {/*
          사진 자리를 비워 두지 않고 무엇이 들어올 자리인지 적는다. 목에는 원본이 없고,
          있어도 이 화면 밖으로 나가면 안 되는 개인 콘텐츠다.
        */}
        <div
          className={css({
            mt: '15px',
            display: 'grid',
            placeItems: 'center',
            gap: '6px',
            p: '34px 16px',
            borderRadius: 'lg',
            bg: 'prev',
            border: '1px dashed token(colors.bd)',
            color: 'faint',
          })}
        >
          <Icon name="ic_image" size={40} />
          <div className={css({ textStyle: 'label', fontWeight: '600', color: 'sub' })}>인증 사진 원본</div>
          <div className={css({ textStyle: 'micro' })}>모더레이션 화면에서만 열람 · 내려받기 차단</div>
        </div>

        <p
          className={css({
            m: '12px 0 0',
            p: '10px 13px',
            borderRadius: 'lg',
            bg: 'aBg',
            border: '1px solid token(colors.warnBd)',
            textStyle: 'caption',
            color: 'warnFg',
          })}
        >
          <strong>개인 콘텐츠입니다.</strong> 이 화면에서만 열람하고 내려받지 마세요.{' '}
          {/*
            ⚠️ **「열람 기록은 감사 로그에 남습니다」 라고 쓰지 말 것.** 감사 로그가 없는데
               남는다고 하면 운영자는 추적되고 있다고 믿는다 — 헤더의 정적 「● 라이브」
               배지를 지운 것과 같은 이유다(§23.5). 규칙은 남기되 상태는 사실대로 적는다.
          */}
          <strong>열람 기록은 아직 남지 않습니다</strong> — 감사 로그 연동 전이라 지금은 규칙으로만
          지켜집니다.
        </p>
      </Card>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px' })}>
          <CardTitle title={`신고자 ${num(reportCount(r))}명`} sub="사유는 신고한 사람이 고른 값입니다." />
          <ul className={css({ listStyle: 'none', m: '12px 0 0', p: '0', display: 'flex', flexDirection: 'column', gap: '10px' })}>
            {r.reporters.map((p) => (
              <li key={`${p.nick}-${p.at}`} className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
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
                  <span className={css({ display: 'block', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
                    {p.nick}
                  </span>
                  <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>{short(p.at)}</span>
                </span>
                <Badge size="sm">{p.why}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px' })}>
          <CardTitle title="작성자 이력" sub="이 건 하나가 아니라 사람을 봅니다." />
          <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
            <Row k="닉네임" v={r.who} />
            <Row k="누적 인증" v={`${num(r.author.certs)}회`} />
            <Row k="피신고" v={`${num(r.author.reports)}건`} />
            <Row k="숨김 확정" v={`${num(r.author.hidden)}건`} />
            <Row k="제재 이력" v={r.author.bans > 0 ? `${num(r.author.bans)}회` : '없음'} />
          </dl>
          <div className={css({ mt: '13px' })}>
            {/* TODO(제재 API 가 생기면): 기간·사유를 받는 확인 창을 띄운다 (§18.8) */}
            <Button variant="danger" disabled>
              이 회원 제재하기 · 준비 중
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '72px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd className={css({ m: '0', flex: '1', minWidth: '0', textAlign: 'right', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
        {v}
      </dd>
    </div>
  )
}
