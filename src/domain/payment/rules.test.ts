/**
 * 결제 규칙 (docs/ARCHITECTURE.md §22).
 *
 * 여기가 틀리면 **돈이 잘못 나간다** — 환불액을 크게 잡으면 쓴 재화까지 돌려주고,
 * 사고 후보를 놓치면 돈만 받고 재화를 안 준 건이 묻힌다.
 */
import { describe, expect, it } from 'vitest'

import {
  canRefund,
  filterPayments,
  refundableAmount,
  stuckPayments,
  summarizePayments,
  validateRefund,
} from './rules'
import type { Payment } from './types'

const pay = (over: Partial<Payment> = {}): Payment => ({
  key: 0,
  orderNo: 'ord_20260814_9921',
  at: '2026-08-14 09:12',
  who: '소이',
  email: 'soi@kakao.com',
  product: '파란보석 1,100개',
  amount: 12100,
  pg: 'TOSS',
  status: 'DONE',
  give: 1000,
  bonus: 100,
  unusedGem: 1200,
  ...over,
})

describe('refundableAmount', () => {
  // 결제 금액을 그대로 돌려주면 이미 쓴 재화를 공짜로 준 셈이 된다.
  it('⚠️ 미사용 유상 재화의 비율만큼만 돌려준다', () => {
    // 1,100원에 100개를 줬고 60개가 남았다 → 660원
    expect(refundableAmount(pay({ amount: 1100, give: 100, unusedGem: 60 }))).toBe(660)
  })

  it('다 남았으면 전액', () => {
    expect(refundableAmount(pay({ amount: 1100, give: 100, unusedGem: 100 }))).toBe(1100)
  })

  it('다 썼으면 0원', () => {
    expect(refundableAmount(pay({ amount: 1100, give: 100, unusedGem: 0 }))).toBe(0)
  })

  // 다른 결제로 받은 재화가 남아 있어도 **이 결제로 판 것보다 많이** 돌려줄 수는 없다.
  it('⚠️ 지급량보다 많이 남아 있어도 전액을 넘지 않는다', () => {
    expect(refundableAmount(pay({ amount: 1100, give: 100, unusedGem: 5000 }))).toBe(1100)
  })

  // 원 단위 아래로 내려가면 안 된다 — 올림하면 판 것보다 많이 돌려준다.
  it('⚠️ 나머지는 버린다', () => {
    expect(refundableAmount(pay({ amount: 1000, give: 3, unusedGem: 1 }))).toBe(333)
  })

  it('지급량이 0 이면 0원 — 나눗셈이 무너진다', () => {
    expect(refundableAmount(pay({ give: 0, unusedGem: 100 }))).toBe(0)
  })
})

describe('canRefund', () => {
  it('완료만 환불할 수 있다', () => {
    expect(canRefund(pay({ status: 'DONE' }))).toBe(true)
  })

  // 준비는 돈이 우리에게 온 게 확실하지 않고, 실패는 안 왔고, 환불은 이미 돌려줬다.
  it('⚠️ 준비 · 실패 · 이미 환불한 건은 대상이 아니다', () => {
    for (const status of ['READY', 'FAILED', 'REFUNDED'] as const) {
      expect(canRefund(pay({ status }))).toBe(false)
    }
  })
})

describe('stuckPayments', () => {
  // 「준비」 가 전체에 섞여 있으면 돈이 나갔는데 재화가 안 들어간 건을 아무도 못 본다.
  it('⚠️ 준비 상태만 모은다', () => {
    const list = [
      pay({ key: 0 }),
      pay({ key: 1, status: 'READY' }),
      pay({ key: 2, status: 'FAILED' }),
    ]
    expect(stuckPayments(list).map((p) => p.key)).toEqual([1])
  })
})

describe('summarizePayments', () => {
  const TODAY = '2026-08-14'
  const list = [
    pay({ key: 0, at: '2026-08-14 09:12', amount: 12100, status: 'DONE' }),
    pay({ key: 1, at: '2026-08-13 22:30', amount: 5500, status: 'DONE' }),
    pay({ key: 2, at: '2026-08-14 07:55', amount: 3300, status: 'READY' }),
    pay({ key: 3, at: '2026-08-14 11:18', amount: 1100, status: 'FAILED' }),
    pay({ key: 4, at: '2026-08-14 12:00', amount: 9900, status: 'REFUNDED' }),
  ]

  // 실패·준비는 돈이 오지 않았고 환불은 돌려줬다. 세면 매출이 부풀려진다.
  it('⚠️ 매출에는 완료만 센다', () => {
    const s = summarizePayments(list, TODAY)
    expect(s.today).toBe(12100)
    expect(s.total).toBe(17600)
  })

  it('확인 필요와 실패는 건수로 센다', () => {
    const s = summarizePayments(list, TODAY)
    expect(s.stuck).toBe(1)
    expect(s.failed).toBe(1)
  })
})

describe('filterPayments', () => {
  const list = [
    pay({
      key: 0,
      who: '소이',
      orderNo: 'ord_A',
      product: '파란보석 100개',
      status: 'DONE',
      pg: 'TOSS',
    }),
    pay({
      key: 1,
      who: '밤톨',
      orderNo: 'ord_B',
      product: '시즌 패스',
      status: 'READY',
      pg: 'KAKAOPAY',
    }),
  ]

  it('주문번호 · 회원 · 상품 셋으로 찾는다', () => {
    expect(filterPayments(list, { q: 'ord_B' }).map((p) => p.key)).toEqual([1])
    expect(filterPayments(list, { q: '소이' }).map((p) => p.key)).toEqual([0])
    expect(filterPayments(list, { q: '시즌' }).map((p) => p.key)).toEqual([1])
  })

  it('상태·결제사를 함께 건다', () => {
    expect(filterPayments(list, { status: 'READY', pg: 'KAKAOPAY' }).map((p) => p.key)).toEqual(
      [1],
    )
    expect(filterPayments(list, { status: 'READY', pg: 'TOSS' })).toEqual([])
  })

  it('공백만 있는 검색어는 무시한다', () => {
    expect(filterPayments(list, { q: '   ' })).toHaveLength(2)
  })
})

describe('validateRefund', () => {
  // 환불은 되돌릴 수 없고 감사 로그에 남는다. 나중에 "왜 돌려줬나" 를 답할 수 있어야 한다.
  it('⚠️ 사유는 필수 — 공백만 있는 것도 빈 것이다', () => {
    expect(validateRefund('  ').reason).toBeTruthy()
    expect(validateRefund('중복 결제').reason).toBeUndefined()
  })
})
