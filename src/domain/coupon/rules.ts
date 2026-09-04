/** 쿠폰 규칙. */
import type { Coupon, CouponInput, CouponKind, CouponLimits, CouponStatus } from './types'

/**
 * **자동 생성**이 쓰는 글자.
 *
 * ⚠️ **`I` `O` `0` `1` 을 뺐다.** 방송 자막이나 인쇄물에서 **사람이 손으로 옮겨 적는**
 *    값이라, `O` 와 `0`·`I` 와 `1` 이 섞이면 「코드가 안 먹혀요」 문의가 그대로 늘어난다
 *    (docs/ARCHITECTURE.md §30.2).
 *
 * ⚠️ **검증에는 쓰지 않는다.** 운영자가 손으로 정한 `SUMMER2026` 은 뜻이 있어서 잘
 *    읽히고, 이 알파벳으로 막으면 **지금 있는 쿠폰이 전부 걸린다.** 헷갈리는 글자를
 *    피하는 것은 **기계가 만들 때** 지킬 규칙이지 사람이 정할 때의 금지가 아니다.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** 코드로 **저장될 수 있는** 모양. 자동 생성보다 넓다 */
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/

/** 자동 생성 코드 길이 */
export const CODE_LENGTH = 10

/**
 * 코드 한 개를 만든다.
 *
 * ⚠️ **무작위원을 인자로 받는다.** 안에서 `Math.random` 을 부르면 테스트가 결과를
 *    고정할 수 없다 — 「헷갈리는 글자가 안 나온다」 를 증명해야 하는 함수다.
 */
export function generateCouponCode(rand: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)] ?? CODE_ALPHABET[0]
  }
  return out
}

/** 코드로 쓸 수 있는 값인가. **영문 대문자 · 숫자 · 하이픈** */
export const isCouponCode = (v: string): boolean => CODE_PATTERN.test(v)

/** 이 방식이 코드를 하나만 쓰는가 */
export const isSingleCode = (kind: CouponKind): boolean =>
  kind === 'single' || kind === 'influencer'

/**
 * 일괄 발급의 코드 접두사.
 *
 * ⚠️ **한글 이름을 그대로 자르면 안 된다.** 원본은 `name.slice(0,6).toUpperCase()` 라
 *    「사전예약 감사」 가 `사전예약-XXXX` 가 된다 — 코드에 못 쓰는 글자다.
 *    쓸 수 있는 글자만 남기고, 남는 게 없으면 `BULK` 로 떨어진다.
 */
export function bulkPrefix(name: string): string {
  const kept = [...name.toUpperCase()]
    .filter((ch) => /[A-Z0-9]/.test(ch))
    .join('')
    .slice(0, 6)
  // 한 글자여도 코드로 쓸 수 있다. 운영자가 정한 것을 굳이 버리지 않는다.
  return kept.length >= 1 ? kept : 'BULK'
}

/**
 * 지금 상태.
 *
 * **손으로 멈춘 것이 기간보다 먼저다** — 기간이 남아 있어도 「중단」 이다.
 *
 * @param today `YYYY-MM-DD`
 */
export function couponStatusOf(c: Coupon, today: string): CouponStatus {
  if (c.stopped) return '중단'
  if (isExpired(c, today)) return '종료'
  return '진행 중'
}

/**
 * 사용률 (%). **무제한이면 `null`.**
 *
 * ⚠️ **이름을 `useRate` 로 지으면 안 된다.** `use` 로 시작하면 ESLint 가 React 훅으로
 *    보고 `rules-of-hooks` 가 터진다 — 사람도 훅으로 읽는다.
 *
 * ⚠️ **발급 수가 0 일 때 100% 로 그리면 안 된다.** 원본이 그랬는데, 무제한 쿠폰이
 *    「다 썼다」 로 보인다 — 정반대의 뜻이다 (§30.1).
 */
export function usageRate(c: Coupon): number | null {
  if (c.issued <= 0) return null
  return Math.round((c.used / c.issued) * 100)
}

/** 남은 코드 수. **무제한이면 `null`** */
export const remaining = (c: Coupon): number | null =>
  c.issued <= 0 ? null : Math.max(0, c.issued - c.used)

/**
 * 기간이 끝났는가. **상태와 따로 본다.**
 *
 * ⚠️ **`couponStatusOf` 로 판정하면 안 된다.** 「중단이 기간보다 먼저」(§30.3) 라서,
 *    **멈춰 둔 채 기간까지 끝난 쿠폰**의 상태는 「중단」 이다 — 그걸로 「끝났나」 를
 *    물으면 아니라고 답한다 (docs/ARCHITECTURE.md §30.3.1).
 */
export const isExpired = (c: Coupon, today: string): boolean =>
  c.limits.dated && c.endAt !== '' && c.endAt < today

/** 손으로 멈추거나 되살릴 수 있는가. **끝난 것은 되살리지 않는다** */
export const canStop = (c: Coupon, today: string): boolean => !isExpired(c, today)

export const COUPON_TABS = ['전체', '진행 중', '단일 코드', '일괄 발급', '종료 · 중단'] as const
export type CouponTab = (typeof COUPON_TABS)[number]

export type CouponFilter = {
  tab?: CouponTab
  /** 이름 · 코드 부분 일치 */
  q?: string
}

/** @param today `YYYY-MM-DD` */
export function filterCoupons(list: Coupon[], f: CouponFilter, today: string): Coupon[] {
  const q = f.q?.trim().toUpperCase()
  return list.filter((c) => {
    const status = couponStatusOf(c, today)
    if (f.tab === '진행 중' && status !== '진행 중') return false
    if (f.tab === '종료 · 중단' && status === '진행 중') return false
    if (f.tab === '단일 코드' && !isSingleCode(c.kind)) return false
    if (f.tab === '일괄 발급' && isSingleCode(c.kind)) return false
    if (q && !c.name.toUpperCase().includes(q) && !c.code.includes(q)) return false
    return true
  })
}

/** 목록 위 지표 */
export type CouponSummary = {
  total: number
  live: number
  /** 발급한 코드 수 합. **무제한은 안 센다** */
  issued: number
  used: number
}

/** @param today `YYYY-MM-DD` */
export function summarizeCoupons(list: Coupon[], today: string): CouponSummary {
  return {
    total: list.length,
    live: list.filter((c) => couponStatusOf(c, today) === '진행 중').length,
    // **셀 수 있는 것만 더한다.** 무제한은 `issued: 0` 이라 더해도 합이 안 바뀌므로
    // 거르는 코드를 따로 두지 않는다 — 테스트가 증명할 수 없는 방어가 된다(§29.3).
    // ⚠️ 대신 **`issued` 에 음수가 들어오면 이 합계가 조용히 줄어든다.** 서버가
    //    주는 값이라 여기서 막을 수는 없고, 그때는 목록의 사용률부터 이상해진다.
    issued: list.reduce((sum, c) => sum + c.issued, 0),
    used: list.reduce((sum, c) => sum + c.used, 0),
  }
}

/**
 * 저장 직전 모양으로 다듬는다.
 *
 * ⚠️ **방식이 안 쓰는 칸은 여기서 지운다.** 폼은 방식을 바꿔도 앞서 친 값을 들고
 *    있으므로, 그대로 저장하면 **단일 코드에 발급 수량이 붙어 무제한이 아니게 되고**
 *    일괄 발급이 빈 코드로 저장된다 (docs/ARCHITECTURE.md §30.4.1).
 */
export function normalizeCouponInput(input: CouponInput): CouponInput {
  const single = isSingleCode(input.kind)
  return {
    kind: input.kind,
    name: input.name.trim(),
    // 일괄·시리얼의 개별 코드는 서버가 만든다. 목록에는 접두사만 보인다.
    code: single ? input.code.trim().toUpperCase() : `${bulkPrefix(input.name)}-****`,
    // 단일·인플루언서는 몇 명이 쓸지 정하지 않는다 — 언제나 무제한이다.
    qty: single ? 0 : input.qty,
    owner: input.kind === 'influencer' ? input.owner.trim() : '',
    startAt: input.limits.dated ? input.startAt : '',
    endAt: input.limits.dated ? input.endAt : '',
    rewards: input.rewards,
    limits: {
      ...input.limits,
      firstComeQty: input.limits.firstCome ? input.limits.firstComeQty : 0,
    },
  }
}

/** 어느 칸이 왜 막혔는가 */
export type CouponErrors = Partial<
  Record<'name' | 'code' | 'qty' | 'owner' | 'period' | 'firstComeQty' | 'rewards', string>
>

/**
 * 발급 폼 검증.
 *
 * @param takenCodes 이미 쓰고 있는 코드. **같은 코드를 두 번 발급하면 어느 쿠폰의
 *   보상을 줘야 하는지 알 수 없다**
 */
export function validateCoupon(input: CouponInput, takenCodes: string[] = []): CouponErrors {
  const errors: CouponErrors = {}

  if (!input.name.trim()) errors.name = '쿠폰 이름을 입력하세요.'

  if (isSingleCode(input.kind)) {
    const code = input.code.trim().toUpperCase()
    if (!code) errors.code = '코드를 입력하세요.'
    else if (!isCouponCode(code)) errors.code = '코드는 영문 대문자 · 숫자 · 하이픈만 씁니다.'
    else if (takenCodes.some((t) => t.toUpperCase() === code))
      errors.code = '이미 쓰고 있는 코드입니다.'
  } else if (!Number.isInteger(input.qty) || input.qty <= 0) {
    errors.qty = '발급 수량은 1 이상의 정수여야 합니다.'
  }

  if (input.kind === 'influencer' && !input.owner.trim()) {
    errors.owner = '인플루언서 채널명 또는 담당자를 입력하세요.'
  }

  // 기간 한정을 켰으면 두 날짜가 다 있어야 하고 순서가 맞아야 한다.
  if (input.limits.dated) {
    if (!input.startAt || !input.endAt) errors.period = '노출 시작과 종료를 모두 입력하세요.'
    else if (input.endAt < input.startAt) errors.period = '종료일이 시작일보다 빠릅니다.'
  }

  // ⚠️ 켜 두고 0 이면 상세가 「제한 없음」 으로 보인다 — 운영자가 건 제한이 사라진다.
  if (
    input.limits.firstCome &&
    (!Number.isInteger(input.limits.firstComeQty) || input.limits.firstComeQty <= 0)
  ) {
    errors.firstComeQty = '선착순 인원은 1 이상의 정수여야 합니다.'
  }

  if (input.rewards.length === 0) errors.rewards = '보상을 하나 이상 넣으세요.'
  else if (input.rewards.some((r) => !Number.isInteger(r.qty) || r.qty <= 0)) {
    errors.rewards = '보상 수량은 1 이상의 정수여야 합니다.'
  }

  return errors
}

/** 선착순 상한이 실제로 걸리는 수. 안 켰으면 `null` */
export const firstComeCap = (limits: CouponLimits): number | null =>
  limits.firstCome && limits.firstComeQty > 0 ? limits.firstComeQty : null
