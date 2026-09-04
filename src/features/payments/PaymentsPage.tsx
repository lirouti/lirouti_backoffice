/**
 * 결제 내역.
 *
 * **확인이 필요한 건을 위에 따로 모은다** — 「준비」 가 전체에 섞여 있으면 돈이 나갔는데
 * 재화가 안 들어간 건을 아무도 못 본다 (docs/ARCHITECTURE.md §22.1).
 */
import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  PAY_STATUS_LABEL,
  PAY_STATUS_TONE,
  PG_LABEL,
  type PayFilter,
  type PayStatus,
  type Payment,
  type Pg,
} from '@/domain/payment'
import { SCREENS } from '@/domain/screens'

import { usePayments } from '@/api/payments'

const STATES = [
  { value: '전체', label: '전체' },
  { value: 'DONE', label: PAY_STATUS_LABEL.DONE },
  { value: 'READY', label: PAY_STATUS_LABEL.READY },
  { value: 'FAILED', label: PAY_STATUS_LABEL.FAILED },
  { value: 'REFUNDED', label: PAY_STATUS_LABEL.REFUNDED },
]

const PGS = [
  { value: '전체', label: '전체' },
  { value: 'TOSS', label: PG_LABEL.TOSS },
  { value: 'KAKAOPAY', label: PG_LABEL.KAKAOPAY },
]

const isStatus = (v: string | null): v is PayStatus =>
  v === 'DONE' || v === 'READY' || v === 'FAILED' || v === 'REFUNDED'
const isPg = (v: string | null): v is Pg => v === 'TOSS' || v === 'KAKAOPAY'

/** 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2) */
const filterOf = (p: URLSearchParams): PayFilter => {
  const status = p.get('status')
  const pg = p.get('pg')
  return {
    q: p.get('q') ?? undefined,
    status: isStatus(status) ? status : undefined,
    pg: isPg(pg) ? pg : undefined,
  }
}

const won = (n: number): string => `${num(n)}원`

export default function PaymentsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = usePayments(filterOf(params))

  const f = filterOf(params)
  const open = (p: Payment) => navigate(SCREENS.paydet.path.replace(':payId', String(p.key)))

  const patch = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v == null || v === '' || v === '전체') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="결제 내역"
        sub="준비 상태로 멈춘 건은 돈이 나갔는데 재화가 안 들어간 사고 후보입니다. 위에 따로 모았습니다."
        actions={
          <>
            {/* TODO(내보내기 엔드포인트가 생기면): CSV 내려받기 (§18.8) */}
            <Button disabled>CSV 내려받기 · 준비 중</Button>
          </>
        }
      />

      {data ? (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            mb: '16px',
          })}
        >
          <StatTile label="오늘 결제" value={won(data.summary.today)} />
          <StatTile label="전체 결제" value={won(data.summary.total)} />
          <StatTile
            label="확인 필요"
            value={num(data.summary.stuck)}
            alert={data.summary.stuck > 0}
          />
          <StatTile label="실패" value={num(data.summary.failed)} />
        </div>
      ) : isPending ? (
        <SkeletonStats count={4} min={150} silent className={css({ mb: '16px' })} />
      ) : null}

      {data && data.stuck.length > 0 && (
        <Card className={css({ p: '0', overflow: 'hidden', mb: '16px', borderColor: 'rBd' })}>
          <div className={css({ p: '15px 18px 0' })}>
            <CardTitle
              title={`확인 필요 ${data.stuck.length}건`}
              sub="준비 상태로 멈췄습니다. 결제사에서 돈이 나갔는지 먼저 봐야 합니다."
            />
          </div>
          <Table
            columns={STUCK_COLUMNS}
            rows={data.stuck}
            minWidth={720}
            onRowClick={open}
            className={css({ border: '0' })}
          />
        </Card>
      )}

      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          mb: '14px',
        })}
      >
        <Input
          value={f.q ?? ''}
          onChange={(v) => patch('q', v)}
          placeholder="주문번호 · 회원 · 상품"
          aria-label="결제 검색"
          className={css({ flex: '1 1 220px', maxWidth: '300px' })}
        />
        <Segmented
          value={f.status ?? '전체'}
          onChange={(v) => patch('status', v)}
          options={STATES}
          aria-label="상태"
        />
        <Segmented
          value={f.pg ?? '전체'}
          onChange={(v) => patch('pg', v)}
          options={PGS}
          aria-label="결제사"
        />
      </div>

      {isPending ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table columns={COLUMNS} rows={data?.payments ?? []} minWidth={960} onRowClick={open} />
      )}
    </>
  )
}

const STUCK_COLUMNS: Column<Payment>[] = [
  { key: 'at', label: '일시', width: '150px', nowrap: true },
  { key: 'who', label: '회원', width: '120px', strong: true },
  { key: 'product', label: '상품', truncate: true },
  {
    key: 'amount',
    label: '금액',
    width: '110px',
    align: 'right',
    render: (p) => won(p.amount),
  },
  {
    key: 'issue',
    label: '문제',
    width: '200px',
    // 무엇이 문제인지 한 줄로 말한다 — 「준비」 배지만으로는 왜 위험한지 모른다.
    render: () => (
      <span className={css({ color: 'rFg', fontWeight: '600' })}>
        재화 지급이 확인되지 않음
      </span>
    ),
  },
]

const COLUMNS: Column<Payment>[] = [
  { key: 'at', label: '일시', width: '150px', nowrap: true },
  {
    key: 'orderNo',
    label: '주문번호',
    width: '190px',
    // 결제사와 맞춰 보는 값이라 등폭으로 — 한 글자씩 옮겨 적는다.
    render: (p) => (
      <span className={css({ fontFamily: 'mono', textStyle: 'caption' })}>{p.orderNo}</span>
    ),
  },
  { key: 'who', label: '회원', width: '110px', strong: true },
  { key: 'product', label: '상품', truncate: true },
  {
    key: 'amount',
    label: '금액',
    width: '110px',
    align: 'right',
    render: (p) => won(p.amount),
  },
  { key: 'pg', label: '결제사', width: '100px', render: (p) => PG_LABEL[p.pg] },
  {
    key: 'status',
    label: '상태',
    width: '84px',
    render: (p) => <Badge tone={PAY_STATUS_TONE[p.status]}>{PAY_STATUS_LABEL[p.status]}</Badge>,
  },
]
