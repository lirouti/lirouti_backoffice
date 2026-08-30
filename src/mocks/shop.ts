/**
 * 재화 · 상점 목 데이터. 원본 `gemRows` 5행과 `shopOrder`(아이템 앞 8개)를 옮겼다.
 *
 * ⚠️ **판매 비중(%)은 원본 값을 안 쓴다.** 원본은 12·26·34·21·7 을 상수로 들었는데
 *    합이 100 이다 — 「예약」 인 시즌 팩(7%)까지 넣은 값이라, 지금 파는 넷만 더하면
 *    93% 가 된다. 건수에서 계산한다 (docs/ARCHITECTURE.md §24.2).
 */
import type { GemProduct, GemStatus, ShopSlot } from '@/domain/shop'

type Row = [
  name: string,
  gem: number,
  bonus: number,
  /** 원 */
  price: number,
  /** 최근 7일 결제 건수 */
  orders: number,
  /** 최근 7일 매출(원) */
  revenue: number,
  status: GemStatus,
]

const ROWS: Row[] = [
  ['스타터', 300, 0, 3300, 1243, 4_100_000, '판매중'],
  ['소형', 800, 50, 8800, 1045, 9_200_000, '판매중'],
  ['중형', 1800, 200, 19000, 779, 14_800_000, '판매중'],
  ['대형', 4000, 600, 39000, 290, 11_300_000, '판매중'],
  ['시즌 팩', 9000, 2000, 89000, 0, 0, '예약'],
]

const PRODUCTS: GemProduct[] = ROWS.map(
  ([name, gem, bonus, price, orders, revenue, status], key) => ({
    key,
    name,
    gem,
    bonus,
    price,
    orders,
    revenue,
    status,
  }),
)

export const allGemProducts = (): GemProduct[] => PRODUCTS

/**
 * 상점 첫 화면 진열. 원본 `shopOrder: [0..7]` — 아이템 앞 8개다.
 *
 * ⚠️ **모듈 캐시라 새로고침하면 원래 순서로 돌아간다** — 목이라서다.
 */
let slots: ShopSlot[] = Array.from({ length: 8 }, (_, i) => ({ itemKey: i }))

export const allShopSlots = (): ShopSlot[] => slots

export function saveShopSlots(next: ShopSlot[]): ShopSlot[] {
  slots = next
  return slots
}

/** 진열을 원본 순서로 되돌린다 */
export function resetShopSlots(): ShopSlot[] {
  slots = Array.from({ length: 8 }, (_, i) => ({ itemKey: i }))
  return slots
}
