/**
 * 젬 상품 — 충전 패키지 구성.
 *
 * **판매 비중은 건수에서 계산한다** — 원본처럼 상수로 들면 파는 상품들의 합이
 * 100 이 안 된다 (docs/ARCHITECTURE.md §24.2).
 */
import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { SkeletonRows } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  GEM_STATUS_TONE,
  orderShares,
  pricePerGem,
  type GemProduct,
} from '@/domain/shop'

import { useGems } from '@/api/shop'

const won = (n: number): string => `${num(n)}원`

/** 백만 원 단위. 표에서 자릿수가 길어지면 다른 열이 눌린다 */
const mil = (n: number): string => `${(n / 1_000_000).toFixed(1)}백만원`

export default function GemsPage() {
  const { data, isPending, error } = useGems()

  if (isPending) return <SkeletonRows rows={6} />
  if (error || !data) return <ErrorBanner message={error?.message ?? '젬 상품을 불러오지 못했습니다.'} />

  // 배분이라 행마다 따로 낼 수 없다 — 목록 전체로 한 번 낸다(§24.2).
  const shares = orderShares(data.products)

  const columns: Column<GemProduct>[] = [
    { key: 'name', label: '상품', width: '110px', strong: true },
    {
      key: 'gem',
      label: '젬',
      width: '90px',
      align: 'right',
      render: (p) => <span className={css({ color: 'priD', fontWeight: '700' })}>{num(p.gem)}</span>,
    },
    {
      key: 'bonus',
      label: '보너스',
      width: '90px',
      align: 'right',
      // 0 을 그대로 찍으면 「0개를 준다」 로 읽힌다. 없는 것은 없다고 쓴다.
      render: (p) => (p.bonus > 0 ? `+${num(p.bonus)}` : '—'),
    },
    { key: 'price', label: '가격', width: '110px', align: 'right', render: (p) => won(p.price) },
    {
      key: 'per',
      label: '젬당',
      width: '90px',
      align: 'right',
      // 보너스를 포함해 나눈 값. 큰 팩이 실제로 유리한지가 여기서 보인다.
      render: (p) => <span className={css({ color: 'sub' })}>{pricePerGem(p).toFixed(1)}원</span>,
    },
    {
      key: 'share',
      label: '판매 비중',
      minWidth: '150px',
      render: (p) => {
        const share = shares[p.key] ?? 0
        return (
          <div className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
            <div className={css({ flex: '1', minWidth: '60px' })}>
              <ProgressBar rate={share} label={`${p.name} 판매 비중`} tone="plain" />
            </div>
            <span className={css({ flex: 'none', textStyle: 'caption', color: 'sub', width: '32px', textAlign: 'right' })}>
              {share}%
            </span>
          </div>
        )
      },
    },
    { key: 'revenue', label: '주간 매출', width: '110px', align: 'right', render: (p) => mil(p.revenue) },
    {
      key: 'status',
      label: '상태',
      width: '86px',
      render: (p) => <Badge tone={GEM_STATUS_TONE[p.status]}>{p.status}</Badge>,
    },
  ]

  return (
    <>
      <PageHeader
        title="젬 상품"
        sub="충전 패키지 구성입니다. 가격과 보너스는 스토어 심사 후 반영됩니다."
        actions={
          <>
            {/* TODO(상품 등록 API 가 생기면): 스토어 상품 id 를 함께 받는다 (§18.8) */}
            <Button disabled>상품 추가 · 준비 중</Button>
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
        <StatTile label="판매 중" value={num(data.summary.selling)} />
        <StatTile label="주간 매출" value={mil(data.summary.revenue)} />
        <StatTile label="주간 결제" value={num(data.summary.orders)} />
      </div>

      <Table columns={columns} rows={data.products} minWidth={940} rowKey={(p) => String(p.key)} />

      <p className={css({ m: '14px 0 0', textStyle: 'caption', color: 'faint' })}>
        판매 비중과 매출은 <strong>판매 중</strong>인 상품만 셉니다 — 예약·중단 상품을 섞으면 합이
        100%가 되지 않습니다.
      </p>
    </>
  )
}
