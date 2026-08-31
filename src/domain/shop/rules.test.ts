/**
 * 재화 · 상점 규칙 (docs/ARCHITECTURE.md §24.2).
 *
 * 여기가 틀리면 **돈에 대한 판단이 틀린다** — 비중이 어긋나면 어느 상품을 접을지
 * 잘못 정하고, 진열 순서가 감기면 맨 위 상품이 맨 아래로 간다.
 */
import { describe, expect, it } from 'vitest'

import { orderShares, pricePerGem, summarizeGems } from './rules'
import type { GemProduct } from './types'

const gem = (over: Partial<GemProduct> = {}): GemProduct => ({
  key: 0,
  name: '스타터',
  gem: 300,
  bonus: 0,
  price: 3300,
  orders: 12,
  revenue: 4_100_000,
  status: '판매중',
  ...over,
})

describe('orderShares', () => {
  /** 목록을 넣으면 순서대로 % 배열 */
  const shares = (list: GemProduct[]): number[] => {
    const map = orderShares(list)
    return list.map((p) => map[p.key] ?? 0)
  }

  const byOrders = (...counts: number[]): GemProduct[] =>
    counts.map((orders, key) => gem({ key, orders }))

  it('건수 비율을 정수 %로', () => {
    expect(shares(byOrders(12, 26, 62))).toEqual([12, 26, 62])
  })

  // 지난 건수를 분모에 남기면 지금 파는 것들의 합이 100 에 못 미친다.
  it('⚠️ 파는 것만 분모에 넣는다', () => {
    const list = [...byOrders(12, 26, 62), gem({ key: 3, orders: 400, status: '중단' })]
    expect(shares(list)).toEqual([12, 26, 62, 0])
  })

  // 행마다 따로 `Math.round` 하면 오차가 같은 방향으로 쌓인다.
  // `[1,1,1]` 은 99, `[1,1,1,1,1,1]` 은 102 가 됐다.
  it('⚠️ 나누어떨어지지 않아도 합이 정확히 100', () => {
    for (const counts of [[1, 1, 1], [1, 1, 1, 1, 1, 1], [2, 2, 2, 1], [1243, 1045, 779, 290], [7]]) {
      const out = shares(byOrders(...counts))
      expect(out.reduce((a, b) => a + b, 0)).toBe(100)
    }
  })

  // 남는 %P 는 소수부가 큰 쪽으로 간다 — 아무 데나 얹으면 큰 상품이 작아 보인다.
  it('⚠️ 남는 %P 는 소수부가 큰 것부터', () => {
    // 37.03 · 31.13 · 23.21 · 8.64 → 내림 합 99, 남는 1 은 소수부가 가장 큰 마지막으로
    expect(shares(byOrders(1243, 1045, 779, 290))).toEqual([37, 31, 23, 9])
  })

  // 새로고침할 때마다 다른 상품이 1%P 를 받으면 숫자가 흔들리는 것처럼 보인다.
  it('⚠️ 동률이면 언제나 같은 상품이 받는다', () => {
    const list = byOrders(1, 1, 1)
    expect(shares(list)).toEqual(shares(list))
    expect(shares(list)).toEqual([34, 33, 33])
  })

  it('파는 게 없으면 전부 0 — 0 으로 나누지 않는다', () => {
    expect(shares([gem({ key: 0, status: '예약', orders: 5 })])).toEqual([0])
  })
})

describe('pricePerGem', () => {
  // 보너스를 빼고 나누면 큰 팩이 실제보다 비싸 보여 상품 구성을 잘못 읽는다.
  it('⚠️ 보너스를 포함해 나눈다 — 회원이 받는 것은 그 합이다', () => {
    expect(pricePerGem(gem({ gem: 800, bonus: 200, price: 8800 }))).toBe(8.8)
  })

  it('주는 게 없으면 0', () => {
    expect(pricePerGem(gem({ gem: 0, bonus: 0 }))).toBe(0)
  })
})

describe('summarizeGems', () => {
  const list = [
    gem({ key: 0, orders: 12, revenue: 4_100_000 }),
    gem({ key: 1, orders: 26, revenue: 9_200_000 }),
    gem({ key: 2, orders: 99, revenue: 99_000_000, status: '예약' }),
  ]

  it('⚠️ 예약·중단 상품은 매출에도 건수에도 안 센다', () => {
    const s = summarizeGems(list)
    expect([s.selling, s.orders, s.revenue]).toEqual([2, 38, 13_300_000])
  })
})
