/**
 * 쿠폰 목 데이터. 디자인 원본 `COUPONS` 6건을 값 그대로 옮겼다.
 *
 * ⚠️ **날짜는 오늘 기준으로 만든다** — 박아 두면 전부 「종료」 가 된다 (docs/ARCHITECTURE.md §21.3).
 * ⚠️ **무제한은 `issued: 0`** 이다. 원본이 그 자리를 0 으로 두고 사용률을 100% 로
 *    그렸는데, 0 은 「발급이 없다」 가 아니라 「셀 수 없다」 는 뜻이다
 *    (docs/ARCHITECTURE.md §30.1).
 */
import { daysAgo } from '@/shared/lib/today'

import type {
  Coupon,
  CouponInput,
  CouponKind,
  CouponReward,
  CouponUseLog,
} from '@/domain/coupon'

type Row = [
  name: string,
  code: string,
  kind: CouponKind,
  used: number,
  /** 발급 코드 수. **0 이면 무제한** */
  issued: number,
  /** 시작이 며칠 전인가 */
  from: number,
  /** 종료가 며칠 전인가. 음수면 앞으로 */
  to: number,
  stopped: boolean,
  perUser: boolean,
  by: string,
  rewards: CouponReward[],
]

const ROWS: Row[] = [
  ['여름 이벤트 보상', 'SUMMER2026', 'single', 8420, 12000, 30, -20, false, false, '김하늘',
    [{ kind: 'gem', label: '젬', note: '재화', qty: 500 }, { kind: 'item', label: '여름 튜브', note: '아이템 · 몸', qty: 1 }]],
  ['사전예약 감사', 'PREORDER-****', 'bulk', 4160, 5000, 47, -4, false, true, '박서준',
    [{ kind: 'gem', label: '젬', note: '재화', qty: 1000 }, { kind: 'boost', label: '성장 부스터', note: '48시간', qty: 1 }]],
  ['오프라인 팝업', 'POPUP-****', 'serial', 1873, 3000, 42, -50, false, true, '최지우',
    [{ kind: 'item', label: '팝업 모자', note: '아이템 · 머리', qty: 1 }, { kind: 'item', label: '팝업 배경', note: '배경', qty: 1 }]],
  ['새콤 채널', 'SAECOM', 'influencer', 2914, 0, 91, -122, false, true, '이도윤',
    [{ kind: 'gem', label: '젬', note: '재화', qty: 300 }]],
  ['봄 시즌 보상', 'SPRING2026', 'single', 9980, 10000, 163, 133, false, false, '김하늘',
    [{ kind: 'gem', label: '젬', note: '재화', qty: 500 }]],
  ['점검 보상 재발급', 'MAINT0705', 'single', 312, 2000, 57, 55, true, false, '정민재',
    [{ kind: 'gem', label: '젬', note: '재화', qty: 200 }]],
]

const COUPONS: Coupon[] = ROWS.map(
  ([name, code, kind, used, issued, from, to, stopped, perUser, by, rewards], key) => ({
    key,
    name,
    code,
    kind,
    rewards,
    used,
    issued,
    startAt: daysAgo(from),
    endAt: daysAgo(to),
    stopped,
    limits: { perUser, firstCome: false, firstComeQty: 0, dated: true },
    by,
  }),
)

export const allCoupons = (): Coupon[] => COUPONS

/** 손으로 멈추거나 되살린다 */
export function setCouponStopped(key: number, stopped: boolean): Coupon | undefined {
  const found = COUPONS.find((c) => c.key === key)
  if (!found) return undefined
  found.stopped = stopped
  return found
}

let nextKey = ROWS.length

export function addCoupon(input: CouponInput, by: string): Coupon {
  const created: Coupon = {
    key: nextKey,
    name: input.name.trim(),
    // 일괄 발급은 개별 코드를 서버가 만든다. 목록에는 접두사만 보인다.
    code: input.code.trim().toUpperCase(),
    kind: input.kind,
    rewards: input.rewards,
    used: 0,
    // 단일·인플루언서는 몇 명이 쓸지 미리 정하지 않는다 — 0 이 곧 무제한이다.
    issued: input.qty,
    startAt: input.startAt,
    endAt: input.endAt,
    stopped: false,
    limits: input.limits,
    by,
  }
  nextKey += 1
  COUPONS.unshift(created)
  return created
}

/** 일자별 사용 건수 14일. 원본 시리즈의 모양을 옮겼다 */
const DAY_SHAPE = [12, 34, 78, 96, 71, 58, 44, 39, 31, 27, 22, 18, 15, 11]

/**
 * 일자별 사용. **합이 그 쿠폰의 `used` 와 정확히 같다.**
 *
 * ⚠️ 비율로 나눠 반올림하면 합이 어긋난다 — 남는 만큼을 첫 칸에 얹는다.
 */
export function usageByDay(c: Coupon): { date: string; used: number }[] {
  const total = DAY_SHAPE.reduce((a, b) => a + b, 0)
  const out = DAY_SHAPE.map((v) => Math.floor((c.used * v) / total))
  out[0] = (out[0] ?? 0) + (c.used - out.reduce((a, b) => a + b, 0))
  return out.map((used, i) => ({ date: daysAgo(DAY_SHAPE.length - 1 - i), used }))
}

const WHO = ['소이', '하루뭉치', '도토리', '민트초코', '새벽러너', '콩순이', '밤톨', '모카']

/** 사용 이력. 실제 코드 모양을 방식에 맞춰 만든다 */
export function couponLogs(c: Coupon): CouponUseLog[] {
  const what = c.rewards.map((r) => `${r.label} ${r.qty}`).join(' · ')
  return Array.from({ length: 8 }, (_, i) => ({
    key: i,
    at: `${daysAgo(Math.floor(i / 2))} ${String(9 + (i % 9)).padStart(2, '0')}:${String(i * 7).padStart(2, '0')}`,
    // 일괄·시리얼은 1인 1코드라 개별 코드가 찍힌다.
    code: c.code.includes('****') ? c.code.replace('****', String(1000 + i * 137)) : c.code,
    who: WHO[i % WHO.length]!,
    what,
    // 중복·만료가 섞여야 「결과」 열이 있을 이유가 생긴다.
    result: i === 3 ? '중복 사용' : i === 6 ? '기간 만료' : '지급 완료',
  }))
}
