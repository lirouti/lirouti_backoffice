/**
 * 푸시 알림 목록.
 *
 * **대상 수는 수신 동의를 거른 뒤의 값**이다 — 전체 회원 수가 아니다
 * (docs/ARCHITECTURE.md §26.3).
 */
import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  openRate,
  PUSH_KIND_LABEL,
  PUSH_KIND_TONE,
  PUSH_STATUS_TONE,
  PUSH_TABS,
  type Push,
  type PushTab,
} from '@/domain/push'
import { SCREENS } from '@/domain/screens'

import { usePushes, type PushQuery } from '@/api/push'

const isTab = (v: string | null): v is PushTab => PUSH_TABS.some((t) => t === v)

/** 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2) */
const queryOf = (p: URLSearchParams): PushQuery => {
  const tab = p.get('tab')
  return { tab: isTab(tab) ? tab : '전체', q: p.get('q') ?? '' }
}

const COLUMNS: Column<Push>[] = [
  {
    key: 'title',
    label: '제목',
    truncate: true,
    render: (p) => (
      <span>
        <span className={css({ display: 'block', fontWeight: '600', color: 'ink' })}>{p.title}</span>
        <span
          className={css({
            display: 'block',
            textStyle: 'micro',
            color: 'faint',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {p.body}
        </span>
      </span>
    ),
  },
  {
    key: 'kind',
    label: '종류',
    width: '110px',
    render: (p) => <Badge tone={PUSH_KIND_TONE[p.kind]}>{PUSH_KIND_LABEL[p.kind]}</Badge>,
  },
  { key: 'audience', label: '대상', width: '110px' },
  { key: 'targeted', label: '대상 수', width: '96px', align: 'right', render: (p) => num(p.targeted) },
  {
    key: 'openRate',
    label: '열림률',
    width: '84px',
    align: 'right',
    // 아직 안 보낸 건은 0% 가 아니라 잴 것이 없다.
    render: (p) => {
      const rate = openRate(p)
      return rate === null ? '—' : `${rate}%`
    },
  },
  { key: 'at', label: '일시', width: '140px', nowrap: true },
  {
    key: 'status',
    label: '상태',
    width: '96px',
    render: (p) => <Badge tone={PUSH_STATUS_TONE[p.status]}>{p.status}</Badge>,
  },
]

export default function PushListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = usePushes(queryOf(params))

  const query = queryOf(params)

  const patch = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v === '' || v === '전체') p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="푸시 알림"
        sub="마케팅 알림은 수신 동의한 회원에게만 갑니다. 대상 수가 전체보다 적은 것이 정상입니다."
        actions={
          <Button variant="primary" onClick={() => navigate(SCREENS.pushnew.path)}>
            알림 작성
          </Button>
        }
      />

      {data && (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            mb: '16px',
          })}
        >
          <StatTile label="오늘 발송" value={`${num(data.summary.sentToday)}건`} />
          <StatTile
            label="예약 대기"
            value={`${num(data.summary.scheduled)}건`}
            alert={data.summary.scheduled > 0}
          />
          <StatTile label="평균 열림률" value={`${data.summary.openRate}%`} />
          <StatTile
            label="푸시 허용"
            value={`${Math.round((data.consent.push / data.consent.all) * 100)}%`}
          />
        </div>
      )}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', mb: '14px' })}>
        <Input
          value={query.q}
          onChange={(v) => patch('q', v)}
          placeholder="제목으로 찾기"
          aria-label="알림 검색"
          className={css({ flex: '1 1 200px', maxWidth: '280px' })}
        />
        <Segmented
          value={query.tab}
          onChange={(v) => patch('tab', v)}
          options={[...PUSH_TABS]}
          aria-label="알림 상태"
        />
      </div>

      {isPending ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table
          columns={COLUMNS}
          rows={data?.pushes ?? []}
          minWidth={980}
          rowKey={(p) => String(p.key)}
          onRowClick={(p) => navigate(SCREENS.pushdet.path.replace(':pushId', String(p.key)))}
        />
      )}
    </>
  )
}
