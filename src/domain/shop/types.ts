/**
 * 재화 · 상점 — 젬 충전 상품과 상점 첫 화면 진열.
 *
 * 둘 다 **돈이 걸린 설정**이다. 젬 상품은 스토어 심사를 거쳐야 바뀌고, 진열 순서는
 * 그날 무엇이 팔릴지를 정한다.
 */

/** 젬 상품이 지금 팔리는가 */
export type GemStatus = '판매중' | '예약' | '중단'

export type GemProduct = {
  key: number
  /** 「스타터」 · 「시즌 팩」 */
  name: string
  /** 유상으로 주는 젬 */
  gem: number
  /** 함께 주는 무상 젬. 없으면 0 */
  bonus: number
  /** 원. 스토어에 등록된 값이라 우리가 바꿔도 심사 전에는 안 바뀐다 */
  price: number
  /**
   * 최근 7일 결제 건수. **판매 비중은 이 값에서 계산한다** — 따로 든 %를 쓰면
   * 합이 100 이 안 된다 (docs/ARCHITECTURE.md §24.2).
   */
  orders: number
  /** 최근 7일 매출(원) */
  revenue: number
  status: GemStatus
}

/**
 * 상점 첫 화면의 한 칸.
 *
 * 아이템을 가리키기만 한다 — 이름·가격·그림은 아이템의 것이라 여기 복사하지 않는다.
 * 복사하면 아이템을 고쳤을 때 상점만 옛 값을 들고 있게 된다.
 */
export type ShopSlot = {
  /** `Item['key']` */
  itemKey: number
}
