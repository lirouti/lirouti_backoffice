/** 재화 · 상점 규칙. */
import type { GemProduct, GemStatus } from './types'

/**
 * 상품별 판매 비중 (%). `key` → 정수 %. **건수 기준이지 매출 기준이 아니다.**
 *
 * ⚠️ **파는 것만 분모에 넣는다.** 중단·예약 상품의 지난 건수까지 세면 지금 팔리는
 *    상품들의 비중 합이 100 에 못 미쳐, 표를 세로로 더한 운영자가 숫자를 의심한다.
 *
 * ⚠️ **행마다 따로 반올림하면 합이 100 이 아니다.** 각자 `Math.round` 하면 건수가
 *    고를 때 오차가 같은 방향으로 쌓인다 — 건수 `[1,1,1]` 은 99, `[1,1,1,1,1,1]` 은
 *    **102** 가 된다. 그래서 **최대 나머지 방식**으로 배분한다: 전부 내림한 뒤 남은
 *    %P 를 소수부가 큰 것부터 1 씩 준다 (docs/ARCHITECTURE.md §24.2).
 *
 * 목록 전체를 한 번에 받는 이유가 이것이다 — 한 행만 보고는 배분할 수 없다.
 */
export function orderShares(list: GemProduct[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const p of list) out[p.key] = 0

  const sold = list.filter((p) => p.status === '판매중')
  const total = sold.reduce((sum, p) => sum + p.orders, 0)
  if (total === 0) return out

  const exact = sold.map((p) => ({ key: p.key, orders: p.orders, pct: (p.orders / total) * 100 }))
  let left = 100
  for (const e of exact) {
    out[e.key] = Math.floor(e.pct)
    left -= Math.floor(e.pct)
  }

  // 소수부가 큰 것부터. 동률이면 건수가 많은 쪽, 그래도 같으면 key 순 —
  // **새로고침할 때마다 다른 상품이 1%P 를 받으면 안 된다.**
  const order = [...exact].sort(
    (a, b) => (b.pct % 1) - (a.pct % 1) || b.orders - a.orders || a.key - b.key,
  )
  for (let i = 0; i < left; i += 1) out[order[i]!.key] += 1
  return out
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
