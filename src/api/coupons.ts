/**
 * 쿠폰 파사드.
 *
 * ⚠️ **같은 코드를 두 번 발급하면 어느 쿠폰의 보상을 줘야 하는지 알 수 없다.**
 *    화면이 막아도 여기서 다시 본다 (docs/ARCHITECTURE.md §22.2.3).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  canStop,
  couponStatusOf,
  filterCoupons,
  normalizeCouponInput,
  summarizeCoupons,
  validateCoupon,
  type Coupon,
  type CouponFilter,
  type CouponInput,
  type CouponStatus,
  type CouponSummary,
  type CouponUseLog,
} from '@/domain/coupon'

import { addCoupon, allCoupons, couponLogs, setCouponStopped, usageByDay } from '@/mocks/coupons'

import { mockDelay, qk, queryClient, today, USE_MOCK } from './core'
import { apiError } from './error'

/** 쿠폰 + 그 시점의 상태. **상태는 화면이 아니라 여기서 낸다** (§25.1) */
export type CouponEntry = { coupon: Coupon; status: CouponStatus }

export type CouponsResult = {
  coupons: CouponEntry[]
  summary: CouponSummary
  /** 이미 쓰고 있는 코드. 발급 화면의 중복 검사가 쓴다 */
  takenCodes: string[]
}

export async function getCoupons(filter: CouponFilter): Promise<CouponsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allCoupons()
    const now = today()
    return {
      coupons: filterCoupons(all, filter, now).map((coupon) => ({
        coupon,
        status: couponStatusOf(coupon, now),
      })),
      // 지표는 **거르기 전 전체**로 낸다 — 탭마다 「진행 중」 이 바뀌면 안 된다.
      summary: summarizeCoupons(all, now),
      takenCodes: all.map((c) => c.code),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<CouponDto[]>('/admin/coupons')
  throw new Error('쿠폰 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useCoupons(filter: CouponFilter) {
  return useQuery({ queryKey: qk.coupons.list(filter), queryFn: () => getCoupons(filter) })
}

export type CouponDetail = {
  coupon: Coupon
  status: CouponStatus
  /** 일자별 사용 건수 14일 */
  days: { date: string; used: number }[]
  logs: CouponUseLog[]
  /** 지금 멈추거나 되살릴 수 있는가 */
  stoppable: boolean
}

export async function getCoupon(couponId: string): Promise<CouponDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const coupon = allCoupons().find((c) => String(c.key) === couponId)
    if (!coupon) throw apiError('http', `쿠폰 #${couponId} 을(를) 찾을 수 없습니다.`, 404)
    const now = today()
    return {
      coupon,
      status: couponStatusOf(coupon, now),
      days: usageByDay(coupon),
      logs: couponLogs(coupon),
      stoppable: canStop(coupon, now),
    }
  }

  throw new Error('쿠폰 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/** ⚠️ 빈 id 면 부르지 않는다 (§20.6) */
export function useCoupon(couponId: string) {
  return useQuery({
    queryKey: qk.coupons.detail(couponId),
    queryFn: () => getCoupon(couponId),
    enabled: couponId !== '',
  })
}

export type StopVars = { couponId: number; stopped: boolean }

/**
 * 손으로 멈추거나 되살린다.
 *
 * ⚠️ **끝난 쿠폰은 되살리지 않는다.** 기간이 지난 것을 「중단 해제」 로 살리면
 *    기간 설정이 아무 뜻도 없어진다 (§30.3).
 */
export async function stopCoupon({ couponId, stopped }: StopVars): Promise<Coupon> {
  if (USE_MOCK) {
    await mockDelay()
    const target = allCoupons().find((c) => c.key === couponId)
    if (!target) throw apiError('http', `쿠폰 #${couponId} 을(를) 찾을 수 없습니다.`, 404)
    if (!canStop(target, today())) {
      throw apiError('http', '이미 기간이 끝난 쿠폰입니다.', 409)
    }
    const saved = setCouponStopped(couponId, stopped)
    if (!saved) throw apiError('http', `쿠폰 #${couponId} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  throw new Error('쿠폰 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useStopCoupon() {
  return useMutation({
    mutationFn: stopCoupon,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.coupons.all }),
  })
}

export type IssueVars = {
  input: CouponInput
  /** 발급한 사람. **목에서만 쓴다** — 실서버는 세션에서 가져간다 (§25.3) */
  by: string
}

export async function issueCoupon({ input, by }: IssueVars): Promise<Coupon> {
  if (USE_MOCK) {
    await mockDelay()
    // ⚠️ **검증한 값과 저장할 값이 같아야 한다** (§29.3.1). 방식이 안 쓰는 칸도 여기서 지운다.
    const clean = normalizeCouponInput(input)
    const first = Object.values(validateCoupon(clean, allCoupons().map((c) => c.code)))[0]
    if (first) throw apiError('http', first, 400)
    return addCoupon(clean, by)
  }

  throw new Error('쿠폰 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useIssueCoupon() {
  return useMutation({
    mutationFn: issueCoupon,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.coupons.all }),
  })
}
