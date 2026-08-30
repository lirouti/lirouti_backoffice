/** 재화 · 상점 규칙. */
import type { GemProduct, GemStatus } from './types'

/**
 * 판매 비중 (%). **건수 기준이지 매출 기준이 아니다.**
 *
 * ⚠️ **파는 것만 분모에 넣는다.** 중단·예약 상품의 지난 건수까지 세면 지금 팔리는
 *    상품들의 비중 합이 100 에 못 미쳐, 표를 세로로 더한 운영자가 숫자를 의심한다.
 */
export function orderShare(p: GemProduct, all: GemProduct[]): number {
  const sold = all.filter((x) => x.status === '판매중')
  const total = sold.reduce((sum, x) => sum + x.orders, 0)
  if (total === 0 || p.status !== '판매중') return 0
  return Math.round((p.orders / total) * 100)
}

/** 젬 하나당 원. **보너스를 포함해 나눈다** — 회원이 받는 것이 그 합이다 */
export const pricePerGem = (p: GemProduct): number => {
  const total = p.gem + p.bonus
  return total === 0 ? 0 : p.price / total
}

/** 목록 위 지표 */
export type GemSummary = {
  /** 지금 파는 상품 수 */
  selling: number
  /** 최근 7일 매출 합(원). **파는 것만** */
  revenue: number
  /** 최근 7일 결제 건수 합 */
  orders: number
}

export function summarizeGems(list: GemProduct[]): GemSummary {
  const sold = list.filter((p) => p.status === '판매중')
  return {
    selling: sold.length,
    revenue: sold.reduce((sum, p) => sum + p.revenue, 0),
    orders: sold.reduce((sum, p) => sum + p.orders, 0),
  }
}

export const GEM_STATUSES: GemStatus[] = ['판매중', '예약', '중단']

/**
 * 진열 순서에서 한 칸을 위/아래로 옮긴 **새 배열**.
 *
 * ⚠️ **끝에서 밀면 그대로 돌려준다.** 감싸서 반대쪽 끝으로 보내면 맨 위 상품을
 *    올리려다 맨 아래로 보내게 된다 — 되돌리기 전에는 눈치채기 어렵다.
 *
 * 원본은 배열을 제자리에서 바꿨다. 새 배열을 주는 이유는 React 가 **같은 참조면
 * 다시 그리지 않기** 때문이다.
 */
export function moveSlot<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from < 0 || from >= list.length) return list
  const next = [...list]
  ;[next[from], next[to]] = [next[to]!, next[from]!]
  return next
}
