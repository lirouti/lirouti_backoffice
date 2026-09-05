/**
 * 재화 · 상점 규칙 (docs/ARCHITECTURE.md §24.2).
 *
 * 여기가 틀리면 **돈에 대한 판단이 틀린다** — 비중이 어긋나면 어느 상품을 접을지
 * 잘못 정하고, 진열 순서가 감기면 맨 위 상품이 맨 아래로 간다.
 */
import { describe, expect, it } from 'vitest'

import {
  cheaperBetterDeal,
  emptyGemProductInput,
  orderShares,
  pricePerGem,
  summarizeGems,
  toGemProductInput,
  validateGemProduct,
} from './rules'
import type { GemProduct, GemProductInput } from './types'

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
    for (const counts of [
      [1, 1, 1],
      [1, 1, 1, 1, 1, 1],
      [2, 2, 2, 1],
      [1243, 1045, 779, 290],
      [7],
    ]) {
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

describe('validateGemProduct', () => {
  const input = (over: Partial<GemProductInput> = {}): GemProductInput => ({
    name: '초대형',
    gem: 9000,
    bonus: 2000,
    price: 89000,
    status: '예약',
    ...over,
  })

  it('제대로 채우면 통과한다', () => {
    expect(validateGemProduct(input())).toEqual({})
  })

  it('상품명은 필수다', () => {
    expect(validateGemProduct(input({ name: '   ' })).name).toBeTruthy()
  })

  // 표에 이름 말고 상품을 가리키는 열이 없다 — 둘이 같으면 어느 쪽을 고쳤는지 알 수 없다.
  it('⚠️ 이미 쓰는 이름은 막는다 (양쪽 공백을 같은 자로 잰다)', () => {
    expect(validateGemProduct(input({ name: ' 대형 ' }), ['대형']).name).toBeTruthy()
    expect(validateGemProduct(input({ name: '대형' }), [' 대형 ']).name).toBeTruthy()
    expect(validateGemProduct(input({ name: '대형' }), ['소형']).name).toBeUndefined()
  })

  it('⚠️ 0 젬은 돈만 받고 아무것도 주지 않는 상품이다', () => {
    expect(validateGemProduct(input({ gem: 0 })).gem).toBeTruthy()
  })

  it('보너스는 0 이어도 되지만 음수는 안 된다', () => {
    expect(validateGemProduct(input({ bonus: 0 })).bonus).toBeUndefined()
    expect(validateGemProduct(input({ bonus: -1 })).bonus).toBeTruthy()
  })

  it('⚠️ 0 원은 결제가 성립하지 않는다 — 그냥 주려면 쿠폰이다', () => {
    expect(validateGemProduct(input({ price: 0 })).price).toBeTruthy()
  })

  // 소수 젬·소수 원은 어디에도 없다. `NaN` 은 빈 칸을 `Number()` 한 결과로 들어온다.
  it('⚠️ 소수와 NaN 을 막는다', () => {
    expect(validateGemProduct(input({ gem: 1.5 })).gem).toBeTruthy()
    expect(validateGemProduct(input({ price: Number('') })).price).toBeTruthy()
    expect(validateGemProduct(input({ bonus: Number.POSITIVE_INFINITY })).bonus).toBeTruthy()
  })

  // 목록이 값이라 타입이 못 막는다 — 초안이나 손으로 고친 값이 이 길로 들어온다.
  it('⚠️ 모르는 상태를 막는다', () => {
    const bad = { ...input(), status: '판매 중' as GemProduct['status'] }
    expect(validateGemProduct(bad).status).toBeTruthy()
  })

  it('등록 초기값은 「예약」 이다 — 스토어 심사 전이다', () => {
    expect(emptyGemProductInput().status).toBe('예약')
  })

  it('수정 초기값은 실적을 뺀 다섯 칸이다', () => {
    expect(toGemProductInput(gem())).toEqual({
      name: '스타터',
      gem: 300,
      bonus: 0,
      price: 3300,
      status: '판매중',
    })
  })
})

describe('cheaperBetterDeal', () => {
  // 젬당 11.0 · 10.35 · 9.5 — 클수록 유리한 정상 구성이다.
  const list = [
    gem({ key: 0, name: '스타터', gem: 300, bonus: 0, price: 3300 }),
    gem({ key: 1, name: '소형', gem: 800, bonus: 50, price: 8800 }),
    gem({ key: 2, name: '중형', gem: 1800, bonus: 200, price: 19000 }),
  ]
  const input = (over: Partial<GemProductInput>): GemProductInput => ({
    name: '새 상품',
    gem: 4000,
    bonus: 600,
    price: 39000,
    status: '예약',
    ...over,
  })

  it('순서를 지키면 경고하지 않는다', () => {
    expect(cheaperBetterDeal(input({}), list)).toBeNull()
  })

  // 39,000원에 2,000젬이면 젬당 19.5원 — 셋 다 더 싸면서 더 유리하다. 살 이유가 없다.
  it('⚠️ 더 싼 상품이 젬당 유리하면 그 상품을 돌려준다', () => {
    expect(cheaperBetterDeal(input({ gem: 2000, bonus: 0 }), list)?.name).toBe('중형')
  })

  // 여럿이 걸리면 **가장 유리한 것**을 보여 준다 — 운영자가 가장 강한 반례를 봐야 한다.
  it('젬당이 가장 낮은 것을 돌려준다', () => {
    // 젬당 9.9원 — 중형(9.5)만 남는다. 소형(10.35)·스타터(11.0)는 이 상품보다 불리하다.
    expect(cheaperBetterDeal(input({ gem: 3900, bonus: 0, price: 38610 }), list)?.name).toBe(
      '중형',
    )
  })

  // ⚠️ **목록 순서에 기대면 안 된다.** 「마지막에 걸린 것」 을 돌려주는 구현도 위 시험은
  //    통과한다 — 거기서는 중형이 마지막이라 답이 우연히 같다. 순서를 뒤집어 고정한다.
  it('⚠️ 목록 순서와 무관하다', () => {
    const shuffled = [list[2]!, list[0]!, list[1]!]
    expect(cheaperBetterDeal(input({ gem: 2000, bonus: 0 }), shuffled)?.name).toBe('중형')
  })

  // 중단된 상품과의 역전은 뜻이 없다 — 살 수 없는 것과 비교해 봐야 소용없다.
  it('⚠️ 파는 것만 본다', () => {
    const stopped = [gem({ key: 9, name: '옛 특가', gem: 5000, price: 3300, status: '중단' })]
    expect(cheaperBetterDeal(input({ gem: 2000, bonus: 0 }), stopped)).toBeNull()
  })

  // 더 비싼 상품이 젬당 유리한 것은 정상이다 — 큰 팩이 싼 게 이 구성의 전제다.
  it('비싼 쪽이 유리한 것은 경고가 아니다', () => {
    expect(cheaperBetterDeal(input({ gem: 300, bonus: 0, price: 3300 }), list)).toBeNull()
  })

  it('주는 게 없으면 비교하지 않는다 — 그건 젬 칸이 잡는다', () => {
    expect(cheaperBetterDeal(input({ gem: 0, bonus: 0 }), list)).toBeNull()
  })
})
