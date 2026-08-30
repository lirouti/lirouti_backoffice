/**
 * 재화 · 상점 규칙 (docs/ARCHITECTURE.md §24.2).
 *
 * 여기가 틀리면 **돈에 대한 판단이 틀린다** — 비중이 어긋나면 어느 상품을 접을지
 * 잘못 정하고, 진열 순서가 감기면 맨 위 상품이 맨 아래로 간다.
 */
import { describe, expect, it } from 'vitest'

import { moveSlot, orderShare, pricePerGem, summarizeGems } from './rules'
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

describe('orderShare', () => {
  const list = [
    gem({ key: 0, orders: 12 }),
    gem({ key: 1, orders: 26 }),
    gem({ key: 2, orders: 62 }),
  ]

  it('건수 비율을 정수 %로', () => {
    expect(list.map((p) => orderShare(p, list))).toEqual([12, 26, 62])
  })

  // 지난 건수를 분모에 남기면 지금 파는 것들의 합이 100 에 못 미친다.
  it('⚠️ 파는 것만 분모에 넣는다', () => {
    const withDead = [...list, gem({ key: 3, orders: 400, status: '중단' })]
    expect(withDead.map((p) => orderShare(p, withDead))).toEqual([12, 26, 62, 0])
  })

  it('파는 게 없으면 0 — 0 으로 나누지 않는다', () => {
    const none = [gem({ status: '예약', orders: 5 })]
    expect(orderShare(none[0]!, none)).toBe(0)
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

describe('moveSlot', () => {
  const list = ['a', 'b', 'c']

  it('위아래로 자리를 맞바꾼다', () => {
    expect(moveSlot(list, 1, 0)).toEqual(['b', 'a', 'c'])
    expect(moveSlot(list, 1, 2)).toEqual(['a', 'c', 'b'])
  })

  // 감싸면 맨 위 상품을 올리려다 맨 아래로 보낸다.
  it('⚠️ 끝에서 밀면 그대로 — 반대쪽 끝으로 감기지 않는다', () => {
    expect(moveSlot(list, 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveSlot(list, 2, 3)).toEqual(['a', 'b', 'c'])
  })

  // 같은 참조를 돌려주면 React 가 다시 그리지 않는다.
  it('⚠️ 옮겼으면 새 배열이다', () => {
    expect(moveSlot(list, 0, 1)).not.toBe(list)
  })
})
