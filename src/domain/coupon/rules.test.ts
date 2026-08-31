/**
 * 쿠폰 규칙 (docs/ARCHITECTURE.md §30).
 *
 * 여기가 틀리면 **무제한 쿠폰이 「다 썼다」 로 보이거나**, 사람이 옮겨 적을 수 없는
 * 코드가 나가거나, 같은 코드가 두 쿠폰에 생긴다.
 */
import { describe, expect, it } from 'vitest'

import {
  bulkPrefix,
  canStop,
  CODE_ALPHABET,
  CODE_LENGTH,
  couponStatusOf,
  filterCoupons,
  firstComeCap,
  generateCouponCode,
  isCouponCode,
  isSingleCode,
  remaining,
  summarizeCoupons,
  usageRate,
  validateCoupon,
} from './rules'
import type { Coupon, CouponInput, CouponLimits } from './types'

const TODAY = '2026-08-11'

const limits = (over: Partial<CouponLimits> = {}): CouponLimits => ({
  perUser: true,
  firstCome: false,
  firstComeQty: 0,
  dated: true,
  ...over,
})

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  key: 0,
  name: '여름 이벤트 보상',
  code: 'SUMMER2026',
  kind: 'single',
  rewards: [{ kind: 'gem', label: '젬', note: '재화', qty: 500 }],
  used: 8420,
  issued: 12000,
  startAt: '2026-08-01',
  endAt: '2026-08-31',
  stopped: false,
  limits: limits(),
  by: '김하늘',
  ...over,
})

const input = (over: Partial<CouponInput> = {}): CouponInput => ({
  kind: 'single',
  name: '여름 이벤트 보상',
  code: 'SUMMER2026',
  qty: 0,
  owner: '',
  startAt: '2026-08-01',
  endAt: '2026-08-31',
  rewards: [{ kind: 'gem', label: '젬', note: '재화', qty: 500 }],
  limits: limits(),
  ...over,
})

describe('generateCouponCode · isCouponCode', () => {
  /** 알파벳을 순서대로 훑는 무작위원 */
  const walk = () => {
    let i = 0
    return () => {
      const v = i / CODE_ALPHABET.length
      i = (i + 1) % CODE_ALPHABET.length
      return v
    }
  }

  it('정해진 길이로 만든다', () => {
    expect(generateCouponCode(walk())).toHaveLength(CODE_LENGTH)
  })

  // `O` 와 `0`, `I` 와 `1` 이 섞이면 「코드가 안 먹혀요」 문의가 그대로 늘어난다.
  it('⚠️ 헷갈리는 글자(I · O · 0 · 1)가 나오지 않는다', () => {
    for (const ch of 'IO01') expect(CODE_ALPHABET).not.toContain(ch)
    // 알파벳 전체를 훑어도 나오지 않는다.
    const all = generateCouponCode(walk()) + generateCouponCode(walk())
    for (const ch of 'IO01') expect(all).not.toContain(ch)
  })

  it('만든 코드는 언제나 쓸 수 있는 값이다', () => {
    expect(isCouponCode(generateCouponCode(walk()))).toBe(true)
  })

  it('소문자 · 한글 · 빈 값은 코드가 아니다', () => {
    for (const bad of ['summer', '여름', '', 'CODE!']) expect(isCouponCode(bad)).toBe(false)
  })

  // 운영자가 손으로 정한 코드는 뜻이 있어야 잘 읽힌다 — 자동 생성 알파벳으로 막으면
  // 지금 있는 쿠폰(`SUMMER2026` · `PREORDER-****`)이 전부 걸린다.
  it('⚠️ 검증은 자동 생성보다 넓다 — 사람이 정한 코드를 막지 않는다', () => {
    for (const ok of ['SUMMER2026', 'PREORDER-XXXX', 'MAINT0705', 'A1']) {
      expect(isCouponCode(ok)).toBe(true)
    }
  })
})

describe('bulkPrefix', () => {
  it('쓸 수 있는 글자만 남긴다', () => {
    expect(bulkPrefix('preorder thanks')).toBe('PREORD')
  })

  // 원본은 `name.slice(0,6).toUpperCase()` 라 「사전예약 감사」 가 그대로 코드가 된다.
  it('⚠️ 한글만 있으면 BULK 로 떨어진다', () => {
    expect(bulkPrefix('사전예약 감사')).toBe('BULK')
    expect(bulkPrefix('')).toBe('BULK')
  })

  it('만든 접두사는 언제나 코드로 쓸 수 있다', () => {
    for (const name of ['사전예약', 'a', 'POPUP 2026', '???']) {
      expect(isCouponCode(bulkPrefix(name))).toBe(true)
    }
  })
})

describe('usageRate · remaining', () => {
  it('사용 / 발급', () => {
    expect(usageRate(coupon({ used: 8420, issued: 12000 }))).toBe(70)
    expect(remaining(coupon({ used: 8420, issued: 12000 }))).toBe(3580)
  })

  // 원본은 발급 0 일 때 100% 로 그렸다 — 무제한이 「다 썼다」 로 보인다.
  it('⚠️ 무제한(발급 0)은 null — 100% 가 아니다', () => {
    expect(usageRate(coupon({ used: 2914, issued: 0 }))).toBeNull()
    expect(remaining(coupon({ used: 2914, issued: 0 }))).toBeNull()
  })

  it('발급보다 많이 써도 남은 수는 음수가 아니다', () => {
    expect(remaining(coupon({ used: 30, issued: 20 }))).toBe(0)
  })
})

describe('couponStatusOf · canStop', () => {
  it('기간 안이면 진행 중', () => {
    expect(couponStatusOf(coupon(), TODAY)).toBe('진행 중')
  })

  it('기간이 지나면 종료', () => {
    expect(couponStatusOf(coupon({ endAt: '2026-03-31' }), TODAY)).toBe('종료')
  })

  // ⚠️ **기간이 지난 것까지 「중단」 이어야 한다.** 순서를 뒤집으면 「종료」 가 되어,
  //    사람이 멈춘 사실이 화면에서 사라진다 — 되살릴 수 있는지 판단이 갈린다.
  it('⚠️ 손으로 멈춘 것이 기간보다 먼저다', () => {
    expect(couponStatusOf(coupon({ stopped: true }), TODAY)).toBe('중단')
    expect(couponStatusOf(coupon({ stopped: true, endAt: '2026-03-31' }), TODAY)).toBe('중단')
  })

  // 기간 한정을 안 켠 쿠폰은 날짜가 지나도 끝나지 않는다.
  it('⚠️ 기간 한정을 안 켰으면 끝나지 않는다', () => {
    expect(couponStatusOf(coupon({ endAt: '2026-03-31', limits: limits({ dated: false }) }), TODAY)).toBe('진행 중')
  })

  it('끝난 쿠폰은 되살리지 않는다', () => {
    expect(canStop(coupon(), TODAY)).toBe(true)
    expect(canStop(coupon({ stopped: true }), TODAY)).toBe(true)
    expect(canStop(coupon({ endAt: '2026-03-31' }), TODAY)).toBe(false)
  })
})

describe('filterCoupons', () => {
  const list = [
    coupon({ key: 0, kind: 'single', name: '여름 이벤트 보상', code: 'SUMMER2026' }),
    coupon({ key: 1, kind: 'bulk', name: '사전예약 감사', code: 'PREORDER-****' }),
    coupon({ key: 2, kind: 'single', name: '봄 시즌 보상', code: 'SPRING2026', endAt: '2026-03-31' }),
  ]

  it('상태 탭', () => {
    expect(filterCoupons(list, { tab: '진행 중' }, TODAY).map((c) => c.key)).toEqual([0, 1])
    expect(filterCoupons(list, { tab: '종료 · 중단' }, TODAY).map((c) => c.key)).toEqual([2])
  })

  it('방식 탭', () => {
    expect(filterCoupons(list, { tab: '단일 코드' }, TODAY).map((c) => c.key)).toEqual([0, 2])
    expect(filterCoupons(list, { tab: '일괄 발급' }, TODAY).map((c) => c.key)).toEqual([1])
  })

  it('이름 · 코드로 찾는다', () => {
    expect(filterCoupons(list, { q: '사전' }, TODAY).map((c) => c.key)).toEqual([1])
    expect(filterCoupons(list, { q: 'summer' }, TODAY).map((c) => c.key)).toEqual([0])
  })
})

describe('summarizeCoupons', () => {
  const list = [
    coupon({ key: 0, issued: 12000, used: 8420 }),
    // 무제한
    coupon({ key: 1, issued: 0, used: 2914 }),
    coupon({ key: 2, issued: 10000, used: 9980, endAt: '2026-03-31' }),
  ]

  it('전체 · 진행 중 · 사용 건수', () => {
    const s = summarizeCoupons(list, TODAY)
    expect([s.total, s.live, s.used]).toEqual([3, 2, 21314])
  })

  // 셀 수 없는 것을 0 으로 세면 「발급 코드」 가 사실과 다른 값이 된다.
  it('⚠️ 발급 코드 합에 무제한을 넣지 않는다', () => {
    expect(summarizeCoupons(list, TODAY).issued).toBe(22000)
  })
})

describe('validateCoupon', () => {
  it('제대로 채우면 통과', () => {
    expect(validateCoupon(input())).toEqual({})
  })

  it('이름은 필수', () => {
    expect(validateCoupon(input({ name: '  ' })).name).toBeTruthy()
  })

  // 같은 코드를 두 번 발급하면 어느 쿠폰의 보상을 줘야 하는지 알 수 없다.
  it('⚠️ 중복 코드는 대소문자 구분 없이 막는다', () => {
    expect(validateCoupon(input(), ['SUMMER2026']).code).toBeTruthy()
    expect(validateCoupon(input({ code: 'summer2026' }), ['SUMMER2026']).code).toBeTruthy()
  })

  // 단일 코드는 수량이 없고, 일괄은 코드가 없다 — 서로의 칸을 요구하면 안 된다.
  it('⚠️ 방식에 따라 요구하는 칸이 다르다', () => {
    expect(validateCoupon(input({ kind: 'bulk', code: '', qty: 1000 }))).toEqual({})
    expect(validateCoupon(input({ kind: 'bulk', code: '', qty: 0 })).qty).toBeTruthy()
    expect(validateCoupon(input({ kind: 'single', qty: 0 })).qty).toBeUndefined()
  })

  it('인플루언서는 채널명을 받는다', () => {
    expect(validateCoupon(input({ kind: 'influencer', owner: '' })).owner).toBeTruthy()
    expect(validateCoupon(input({ kind: 'influencer', owner: '새콤 채널' })).owner).toBeUndefined()
  })

  // ⚠️ 메시지까지 본다. 빈 날짜를 「종료일이 빠릅니다」 로 잡으면 (`'' < 시작일`)
  //    검증이 없어져도 테스트가 **엉뚱한 이유로** 통과한다.
  it('기간 한정이면 두 날짜가 다 있고 순서가 맞아야 한다', () => {
    expect(validateCoupon(input({ endAt: '' })).period).toBe('노출 시작과 종료를 모두 입력하세요.')
    expect(validateCoupon(input({ startAt: '' })).period).toBe('노출 시작과 종료를 모두 입력하세요.')
    expect(validateCoupon(input({ startAt: '2026-08-31', endAt: '2026-08-01' })).period).toBe(
      '종료일이 시작일보다 빠릅니다.',
    )
  })

  // 기간 한정을 안 켰으면 날짜를 요구하지 않는다.
  it('⚠️ 기간 한정을 끄면 날짜가 비어도 된다', () => {
    expect(validateCoupon(input({ startAt: '', endAt: '', limits: limits({ dated: false }) })).period).toBeUndefined()
  })

  it('보상은 하나 이상이고 수량은 1 이상의 정수', () => {
    expect(validateCoupon(input({ rewards: [] })).rewards).toBeTruthy()
    expect(validateCoupon(input({ rewards: [{ kind: 'gem', label: '젬', note: '재화', qty: 0 }] })).rewards).toBeTruthy()
    expect(validateCoupon(input({ rewards: [{ kind: 'gem', label: '젬', note: '재화', qty: 1.5 }] })).rewards).toBeTruthy()
  })
})

describe('isSingleCode · firstComeCap', () => {
  it('단일과 인플루언서만 코드가 하나다', () => {
    expect(isSingleCode('single')).toBe(true)
    expect(isSingleCode('influencer')).toBe(true)
    expect(isSingleCode('bulk')).toBe(false)
    expect(isSingleCode('serial')).toBe(false)
  })

  it('선착순을 안 켰으면 상한이 없다', () => {
    expect(firstComeCap(limits({ firstCome: false, firstComeQty: 500 }))).toBeNull()
    expect(firstComeCap(limits({ firstCome: true, firstComeQty: 500 }))).toBe(500)
    // 켰는데 수량이 0 이면 상한이 아니다 — 0 명에게 준다는 뜻이 되면 안 된다.
    expect(firstComeCap(limits({ firstCome: true, firstComeQty: 0 }))).toBeNull()
  })
})
