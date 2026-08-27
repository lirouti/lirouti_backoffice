/**
 * 아이템 도메인 규칙.
 *
 * 데이터가 목이든 서버든 여기 규칙은 그대로다. 목 생성기(`mocks/items.ts`)가
 * 사라져도 이 파일은 남는다 — 그게 이 층을 따로 둔 이유다.
 */
import type { Item, Slot, Tier } from './types'

/** 판매량 상위 N개 */
export function topSelling(items: Item[], n: number): Item[] {
  return [...items].sort((a, b) => b.sold - a.sold).slice(0, n)
}

export type ItemFilter = {
  slot?: Slot
  tier?: Tier
  /** 이름 부분 일치 */
  q?: string
}

/** 목록 화면의 필터 규칙. 빈 조건은 무시한다. */
export function filterItems(items: Item[], f: ItemFilter): Item[] {
  const q = f.q?.trim()
  return items.filter(
    (it) =>
      (!f.slot || it.slot === f.slot) &&
      (!f.tier || it.tier === f.tier) &&
      (!q || it.name.includes(q)),
  )
}

/** 상점에 실제로 노출되는가 */
export const isOnSale = (it: Item): boolean => it.status === 'VISIBLE'
