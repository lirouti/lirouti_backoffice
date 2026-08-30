/**
 * 결제 엔티티.
 *
 * ⚠️ **「준비」 는 사고 후보다.** 결제사에서 돈은 나갔는데 우리 원장에 재화가 안 들어간
 *    상태다 — 목록이 이런 건을 위에 따로 모으는 이유다.
 */

/** 결제사 */
export type Pg = 'TOSS' | 'KAKAOPAY'

/**
 * 결제 상태.
 *
 * `READY` 는 **결제사와 우리 사이가 어긋난** 상태다. 나머지 셋은 끝난 상태다.
 */
export type PayStatus = 'DONE' | 'READY' | 'FAILED' | 'REFUNDED'

export type Payment = {
  key: number
  /** `ord_20260814_9921` — 결제사와 맞춰 보는 값이라 등폭으로 쓴다 */
  orderNo: string
  /** `YYYY-MM-DD HH:mm` */
  at: string
  /** 회원 닉네임. 실서버는 회원 id 를 준다 */
  who: string
  email: string
  product: string
  /** 원 */
  amount: number
  pg: Pg
  status: PayStatus
  /** 지급하기로 한 유상 재화 */
  give: number
  /** 함께 주는 보너스(무상) */
  bonus: number
  /** 결제 당시 회원의 유상 잔액 — 환불 가능액 계산에 쓴다 */
  walletGem: number
  /** 그중 **아직 안 쓴** 유상 재화 */
  unusedGem: number
}
