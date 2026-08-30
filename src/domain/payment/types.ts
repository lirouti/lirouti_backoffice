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
  /**
   * **이 결제로 산 것 중 아직 안 쓴 수량.** 회원의 지갑 잔액이 아니다.
   *
   * ⚠️ **회원 잔액을 넣으면 안 된다.** 한 사람이 결제를 두 번 했을 때 두 건 모두
   *    "미사용 1,200개" 를 들게 되어, 둘 다 환불하면 **산 것보다 많이 돌려준다.**
   *    실제로 그렇게 넣었다가 소이의 환불 가능액이 1,200개어치가 아니라 2,000개어치로
   *    나왔다 (docs/ARCHITECTURE.md §22.2.2).
   *
   * 서버에서는 결제 단위 lot 의 잔여다 — 원장이 어느 결제로 산 재화를 썼는지 안다.
   */
  unusedGem: number
}
