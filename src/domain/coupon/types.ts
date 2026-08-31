/**
 * 쿠폰 코드.
 *
 * **코드는 사람이 옮겨 적는다.** 방송 자막·오프라인 인쇄물에서 손으로 치는 값이라,
 * 헷갈리는 글자를 아예 쓰지 않는다 (docs/ARCHITECTURE.md §30.2).
 */

/**
 * 발급 방식. **코드가 하나인지 여럿인지가 여기서 갈린다.**
 *
 * `single`·`influencer` 는 코드 하나를 모두가 쓰므로 **발급 수량이 없다**(무제한).
 * `bulk`·`serial` 은 1인 1코드라 수량이 곧 상한이다.
 */
export type CouponKind = 'single' | 'bulk' | 'serial' | 'influencer'

export const COUPON_KINDS: CouponKind[] = ['single', 'bulk', 'serial', 'influencer']

export type CouponStatus = '진행 중' | '종료' | '중단'

/** 보상 한 줄 */
export type CouponReward = {
  kind: 'gem' | 'item' | 'boost' | 'emoji'
  /** 「젬」 · 「여름 튜브」 */
  label: string
  /** 「재화」 · 「아이템 · 몸」 */
  note: string
  qty: number
}

/** 사용 제한 */
export type CouponLimits = {
  /** 같은 계정이 두 번 못 쓴다 */
  perUser: boolean
  /** 선착순 수량 제한. 켜면 `firstComeQty` 가 상한이 된다 */
  firstCome: boolean
  firstComeQty: number
  /** 기간이 지나면 못 쓴다 */
  dated: boolean
}

export type Coupon = {
  key: number
  name: string
  /** `SUMMER2026` · `PREORDER-****`. **일괄 발급이면 접두사만 보인다** */
  code: string
  kind: CouponKind
  rewards: CouponReward[]
  /** 실제로 쓴 건수 */
  used: number
  /**
   * 발급한 코드 수.
   *
   * ⚠️ **`0` 은 「발급이 없다」 가 아니라 「무제한」 이다.** 단일 코드는 몇 명이 쓸지
   *    미리 정하지 않는다 — 이걸 분모로 쓰면 사용률이 100% 로 나온다 (§30.1).
   */
  issued: number
  /** `YYYY-MM-DD` */
  startAt: string
  endAt: string
  /** 운영자가 손으로 멈췄는가. **기간과 별개다** */
  stopped: boolean
  limits: CouponLimits
  /** 만든 사람 */
  by: string
}

/** 폼이 채우는 값 */
export type CouponInput = {
  kind: CouponKind
  name: string
  /** `single`·`influencer` 만 쓴다 */
  code: string
  /** `bulk`·`serial` 만 쓴다 */
  qty: number
  /** `influencer` 만 쓴다 — 채널명 또는 담당자 */
  owner: string
  startAt: string
  endAt: string
  rewards: CouponReward[]
  limits: CouponLimits
}

/** 사용 이력 한 줄 */
export type CouponUseLog = {
  key: number
  /** `YYYY-MM-DD HH:mm` */
  at: string
  /** 실제로 입력한 코드. 일괄 발급이면 개별 코드다 */
  code: string
  /** 회원 닉네임 */
  who: string
  /** 지급한 것 */
  what: string
  result: '지급 완료' | '중복 사용' | '기간 만료'
}
