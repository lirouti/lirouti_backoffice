/**
 * 쿠폰 코드 목록.
 *
 * **무제한 쿠폰은 사용률이 없다** — 발급 수를 미리 정하지 않기 때문이다
 * (docs/ARCHITECTURE.md §30.1).
 */
import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  COUPON_KIND_LABEL,
  COUPON_KIND_TONE,
  COUPON_STATUS_TONE,
  COUPON_TABS,
  usageRate,
  type CouponFilter,
  type CouponTab,
} from '@/domain/coupon'
import { SCREENS } from '@/domain/screens'

import { useCoupons, type CouponEntry } from '@/api/coupons'

const isTab = (v: string | null): v is CouponTab => COUPON_TABS.some((t) => t === v)

/** 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2) */
const filterOf = (p: URLSearchParams): CouponFilter => {
  const tab = p.get('tab')
  return { tab: isTab(tab) ? tab : '전체', q: p.get('q') ?? undefined }
}

const period = (e: CouponEntry): string =>
  e.coupon.limits.dated ? `${e.coupon.startAt.slice(5)} – ${e.coupon.endAt.slice(5)}` : '제한 없음'

const COLUMNS: Column<CouponEntry>[] = [
  {
    key: 'name',
    label: '쿠폰',
    minWidth: '180px',
    render: (e) => (
      <span>
        <span className={css({ display: 'block', fontWeight: '600', color: 'ink' })}>{e.coupon.name}</span>
        <span className={css({ display: 'block', fontFamily: 'mono', textStyle: 'micro', color: 'faint' })}>
          {e.coupon.code}
        </span>
      </span>
    ),
  },
  {
    key: 'kind',
    label: '방식',
    width: '116px',
    render: (e) => <Badge tone={COUPON_KIND_TONE[e.coupon.kind]}>{COUPON_KIND_LABEL[e.coupon.kind]}</Badge>,
  },
  {
    key: 'rewards',
    label: '보상',
    truncate: true,
    render: (e) => e.coupon.rewards.map((r) => `${r.label} ${num(r.qty)}`).join(' · '),
  },
  {
    key: 'rate',
    // ⚠️ 열 이름이 「사용률」 이면 무제한 행이 그 이름과 안 맞는다. 이 열은 비율과
    //    건수를 같이 담으므로 **담는 것을 이름으로** 쓴다 (§30.1).
    label: '사용',
    minWidth: '170px',
    render: (e) => {
      const rate = usageRate(e.coupon)
      // ⚠️ 무제한은 분모가 없다. 100% 로 그리면 「다 썼다」 로 읽힌다.
      if (rate === null) {
        return (
          <span className={css({ textStyle: 'caption', color: 'sub' })}>
            {num(e.coupon.used)}건 · <span className={css({ color: 'faint' })}>무제한</span>
          </span>
        )
      }
      return (
        <span className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
          <span className={css({ flex: '1', minWidth: '60px' })}>
            <ProgressBar rate={rate} label={`${e.coupon.name} 사용률`} tone="plain" />
          </span>
          <span className={css({ flex: 'none', textStyle: 'caption', color: 'sub', whiteSpace: 'nowrap' })}>
            {num(e.coupon.used)} / {num(e.coupon.issued)}
          </span>
        </span>
      )
    },
  },
  { key: 'period', label: '기간', width: '130px', nowrap: true, render: period },
  {
    key: 'status',
    label: '상태',
    width: '86px',
    render: (e) => <Badge tone={COUPON_STATUS_TONE[e.status]}>{e.status}</Badge>,
  },
]

export default function CouponsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useCoupons(filterOf(params))

  const f = filterOf(params)

  const patch = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v === '' || v === '전체') p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="쿠폰 코드"
        sub="코드를 발급하고 사용 현황을 봅니다."
        actions={
          <Button variant="primary" onClick={() => navigate(SCREENS.couponnew.path)}>
            쿠폰 발급
          </Button>
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
          <StatTile label="전체 쿠폰" value={num(data.summary.total)} />
          <StatTile label="진행 중" value={num(data.summary.live)} />
          {/* 무제한은 셀 수 없으므로 이 합계에 안 들어간다 (§30.1) */}
          <StatTile label="발급 코드" value={num(data.summary.issued)} />
          <StatTile label="사용 건수" value={num(data.summary.used)} />
        </div>
      ) : isPending ? (
        <SkeletonStats count={4} min={150} silent className={css({ mb: '16px' })} />
      ) : null}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', mb: '14px' })}>
        <Input
          value={f.q ?? ''}
          onChange={(v) => patch('q', v)}
          placeholder="이름 · 코드"
          aria-label="쿠폰 검색"
          className={css({ flex: '1 1 200px', maxWidth: '260px' })}
        />
        <Segmented
          value={f.tab ?? '전체'}
          onChange={(v) => patch('tab', v)}
          options={[...COUPON_TABS]}
          aria-label="쿠폰 상태"
        />
      </div>

      {isPending ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table
          columns={COLUMNS}
          rows={data?.coupons ?? []}
          minWidth={1020}
          rowKey={(e) => String(e.coupon.key)}
          onRowClick={(e) => navigate(SCREENS.coupondet.path.replace(':couponId', String(e.coupon.key)))}
        />
      )}
    </>
  )
}
