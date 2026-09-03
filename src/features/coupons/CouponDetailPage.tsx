/**
 * 쿠폰 상세 — 사용 현황 · 보상 · 이력.
 *
 * ⚠️ **끝난 쿠폰은 되살리지 않는다.** 기간이 지난 것을 「중단 해제」 로 살리면
 *    기간 설정이 아무 뜻도 없어진다 (docs/ARCHITECTURE.md §30.3).
 */
import { useState } from 'react'

import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { BarChart } from '@/shared/ui/chart/BarChart'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonHeader, SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  COUPON_KIND_LABEL,
  COUPON_KIND_TONE,
  COUPON_STATUS_TONE,
  firstComeCap,
  remaining,
  REWARD_KIND_LABEL,
  USE_RESULT_TONE,
  usageRate,
  type CouponUseLog,
} from '@/domain/coupon'
import { SCREENS } from '@/domain/screens'

import { useCoupon, useStopCoupon, type CouponDetail } from '@/api/coupons'

const LOG_COLUMNS: Column<CouponUseLog>[] = [
  { key: 'at', label: '일시', width: '140px', nowrap: true },
  {
    key: 'code',
    label: '코드',
    width: '150px',
    render: (l) => <span className={css({ fontFamily: 'mono', textStyle: 'caption' })}>{l.code}</span>,
  },
  { key: 'who', label: '유저', width: '110px', strong: true },
  { key: 'what', label: '지급 항목', truncate: true },
  {
    key: 'result',
    label: '결과',
    width: '96px',
    render: (l) => <Badge tone={USE_RESULT_TONE[l.result]}>{l.result}</Badge>,
  },
]

export default function CouponDetailPage() {
  const { couponId = '' } = useParams()
  const { data, isPending, error } = useCoupon(couponId)

  if (isPending) {
    // ⚠️ **제목을 그릴 수 없다** — 상세 화면의 제목은 불러온 값이다(「소이」 · 「첫 알」).
    //    그래서 헤더도 자리만 잡는다. 아는 것과 모르는 것을 섞지 않는다 (docs/ARCHITECTURE.md §43.2).

    return (
      <>
        <SkeletonHeader />
        <SkeletonStats count={4} min={150} silent />

        <SkeletonRows rows={5} silent />
      </>
    )
  }
  if (error || !data)
    return <ErrorBanner message={error?.message ?? '쿠폰을 불러오지 못했습니다.'} />

  return <Detail detail={data} />
}

function Detail({ detail: { coupon: c, status, days, logs, stoppable } }: { detail: CouponDetail }) {
  const navigate = useNavigate()
  const stop = useStopCoupon()
  const [asking, setAsking] = useState(false)

  const rate = usageRate(c)
  const left = remaining(c)
  const cap = firstComeCap(c.limits)
  const groups = days.map((d) => ({ label: d.date.slice(5).replace('-', '/'), a: d.used }))

  return (
    <>
      <PageHeader
        title={c.name}
        sub={`${COUPON_KIND_LABEL[c.kind]} · ${c.by} 발급`}
        actions={
          <>
            <Button onClick={() => navigate(SCREENS.coupons.path)}>목록</Button>
            {/* TODO(내보내기 엔드포인트가 생기면): 발급한 개별 코드를 CSV 로 (§18.8) */}
            <Button disabled>CSV 내려받기 · 준비 중</Button>
            {/* 끝난 쿠폰은 버튼을 없애지 않고 잠가 이유를 라벨에 적는다 */}
            <Button
              variant={c.stopped ? 'primary' : 'danger'}
              onClick={() => (c.stopped ? stop.mutate({ couponId: c.key, stopped: false }) : setAsking(true))}
              disabled={!stoppable || stop.isPending}
            >
              {!stoppable ? '기간 종료됨' : c.stopped ? '중단 해제' : '중단'}
            </Button>
          </>
        }
      />

      {stop.error && <ErrorBanner message={stop.error.message} />}

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px', flexWrap: 'wrap' })}>
        <Badge tone={COUPON_KIND_TONE[c.kind]}>{COUPON_KIND_LABEL[c.kind]}</Badge>
        <Badge tone={COUPON_STATUS_TONE[status]}>{status}</Badge>
        <span className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}>{c.code}</span>
        <span className={css({ textStyle: 'caption', color: 'faint' })}>
          {c.limits.dated ? `${c.startAt} ~ ${c.endAt}` : '기간 제한 없음'}
        </span>
      </div>

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          mb: '18px',
        })}
      >
        {/* 무제한은 「셀 수 없다」 는 뜻이라 0 도 100% 도 아니다 (§30.1) */}
        <StatTile label="발급 코드" value={c.issued > 0 ? num(c.issued) : '무제한'} />
        <StatTile label="사용 건수" value={num(c.used)} />
        <StatTile label="사용률" value={rate === null ? '—' : `${rate}%`} />
        <StatTile label="남은 코드" value={left === null ? '—' : num(left)} alert={left !== null && left === 0} />
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '2 1 460px', minWidth: '0', p: '17px 20px' })}>
          <CardTitle title="일자별 사용" sub="최근 14일" />
          <div className={css({ mt: '10px' })}>
            <BarChart groups={groups} max={Math.max(1, ...days.map((d) => d.used))} legend={['사용']} />
          </div>
        </Card>

        <div className={css({ flex: '1 1 280px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '18px' })}>
          <Card className={css({ p: '15px' })}>
            <CardTitle title="보상 묶음" sub="한 번에 모두 지급됩니다." />
            <ul className={css({ listStyle: 'none', m: '12px 0 0', p: '0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
              {c.rewards.map((r) => (
                <li key={`${r.kind}-${r.label}`} className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
                  <Badge size="sm">{REWARD_KIND_LABEL[r.kind]}</Badge>
                  <span className={css({ flex: '1', minWidth: '0' })}>
                    <span className={css({ display: 'block', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
                      {r.label}
                    </span>
                    <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>{r.note}</span>
                  </span>
                  <span className={css({ flex: 'none', textStyle: 'label', fontWeight: '700', color: 'ink' })}>
                    ×{num(r.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className={css({ p: '15px' })}>
            <CardTitle title="사용 제한" />
            <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
              <Row k="1인 1회" v={c.limits.perUser ? '제한함' : '제한 없음'} />
              <Row k="선착순" v={cap === null ? '제한 없음' : `${num(cap)}명`} />
              <Row k="기간 한정" v={c.limits.dated ? '적용' : '없음'} />
            </dl>
          </Card>
        </div>
      </div>

      <div className={css({ mt: '18px' })}>
        <Card className={css({ p: '15px 17px' })}>
          <CardTitle title="사용 이력" sub="최근 8건입니다. 전체 건수는 위 지표를 보세요." />
          <div className={css({ mt: '13px' })}>
            <Table columns={LOG_COLUMNS} rows={logs} minWidth={780} rowKey={(l) => String(l.key)} />
          </div>
        </Card>
      </div>

      <Dialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={() => stop.mutate({ couponId: c.key, stopped: true }, { onSuccess: () => setAsking(false) })}
        title="쿠폰을 중단합니다"
        body="지금부터 이 코드를 입력해도 보상이 지급되지 않습니다. 이미 받은 보상은 회수되지 않습니다."
        tone="danger"
        confirmLabel={stop.isPending ? '중단 중…' : '중단'}
      />
    </>
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
