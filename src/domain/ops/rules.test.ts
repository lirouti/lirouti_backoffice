/**
 * 운영 규칙 (docs/ARCHITECTURE.md §25).
 *
 * 지급·회수가 틀리면 **되돌릴 수 없다** — 오타 난 id 를 조용히 넘기면 운영자는
 * 준 줄 알고, 전체 대상을 잘못 잡으면 24,180명에게 나간다.
 */
import { describe, expect, it } from 'vitest'

import type { User } from '../user/types'
import {
  activeUserCount,
  checkGrantItem,
  checkTargets,
  periodLabel,
  periodStatusOf,
  pinnedCount,
  QTY_MAX,
  sortEvents,
  summarizeGrants,
  summarizeNotices,
  validateGrant,
} from './rules'
import type { GrantInput, GrantLog, Notice, OpsEvent } from './types'

const TODAY = '2026-08-13'

const notice = (over: Partial<Notice> = {}): Notice => ({
  key: 0,
  title: '시즌 3 오픈 안내',
  category: '시즌',
  startAt: '2026-08-01',
  endAt: '2026-08-14',
  views: 24180,
  pinned: false,
  ...over,
})

const event = (over: Partial<OpsEvent> = {}): OpsEvent => ({
  key: 0,
  title: '별빛 축제',
  desc: '성좌 세트를 모으는 시즌 이벤트',
  startAt: '2026-08-01',
  endAt: '2026-08-31',
  accent: '#2F7CEF',
  rewardItemKey: 6,
  joined: 8400,
  ...over,
})

const user = (over: Partial<User> = {}): User => ({
  key: 0,
  uid: 'U-10240',
  nick: '소이',
  email: 'soi@kakao.com',
  social: 'KAKAO',
  status: 'ACTIVE',
  wallet: { gem: 1200, topaz: 300 },
  paid: 24200,
  certs: 41,
  joinedAt: '2026-01-02',
  lastSeenAt: '2026-08-13',
  leftAt: '',
  marketingOptIn: true,
  ...over,
})

const grant = (over: Partial<GrantInput> = {}): GrantInput => ({
  kind: '지급',
  target: '개별',
  who: 'U-10240',
  asset: '파란보석',
  qty: 100,
  itemKey: null,
  why: '서버 점검 보상',
  ...over,
})

const log = (over: Partial<GrantLog> = {}): GrantLog => ({
  key: 0,
  at: '2026-08-11 14:02',
  kind: '지급',
  asset: '파란보석',
  what: '파란보석',
  qty: 100,
  who: '전체 유저',
  why: '서버 점검 보상',
  by: '김운영',
  ...over,
})

describe('periodStatusOf', () => {
  it('기간 안이면 ACTIVE · 앞이면 SCHEDULED · 뒤면 ENDED', () => {
    expect(periodStatusOf('2026-08-01', '2026-08-14', TODAY)).toBe('ACTIVE')
    expect(periodStatusOf('2026-08-15', '2026-08-29', TODAY)).toBe('SCHEDULED')
    expect(periodStatusOf('2026-07-20', '2026-08-03', TODAY)).toBe('ENDED')
  })

  // 「상시」 이벤트는 끝나지 않는다. 빈 문자열을 날짜로 비교하면 항상 종료로 잡힌다.
  it('⚠️ 종료일이 비면 끝나지 않는다', () => {
    expect(periodStatusOf('2026-01-01', '', TODAY)).toBe('ACTIVE')
  })

  // 경계일은 포함이다 — 시작일 당일에 「예약」 이면 그날 아무것도 안 뜬다.
  it('⚠️ 시작일·종료일 당일은 진행 중이다', () => {
    expect(periodStatusOf(TODAY, TODAY, TODAY)).toBe('ACTIVE')
  })
})

describe('periodLabel', () => {
  it('연도를 떼고 보여 준다', () => {
    expect(periodLabel('2026-08-01', '2026-08-14')).toBe('08-01 ~ 08-14')
  })

  it('종료일이 없으면 「상시」', () => {
    expect(periodLabel('2026-01-01', '')).toBe('상시')
  })
})

describe('pinnedCount · summarizeNotices', () => {
  const list = [
    notice({ key: 0, pinned: true }),
    notice({ key: 1, pinned: true, startAt: '2026-08-12', endAt: '2026-08-13' }),
    // 끝났는데 고정 표시가 남아 있는 것 — 앱에는 안 뜬다.
    notice({ key: 2, pinned: true, startAt: '2026-07-01', endAt: '2026-07-24' }),
    notice({ key: 3, startAt: '2026-08-15', endAt: '2026-08-29', views: 0 }),
  ]

  it('⚠️ 게시 중인 고정만 센다 — 끝난 고정까지 세면 자리가 남았는데 가득 차 보인다', () => {
    expect(pinnedCount(list, TODAY)).toBe(2)
  })

  it('상태별 건수와 권장치 초과 여부', () => {
    const s = summarizeNotices(list, TODAY)
    expect([s.active, s.scheduled, s.pinned, s.overPinned]).toEqual([2, 1, 2, false])
  })

  it('고정이 셋이면 권장치를 넘는다', () => {
    const over = [...list, notice({ key: 4, pinned: true })]
    expect(summarizeNotices(over, TODAY).overPinned).toBe(true)
  })
})

describe('sortEvents', () => {
  // 끝난 이벤트가 섞여 있으면 무엇이 라이브인지 한눈에 안 보인다.
  it('⚠️ 진행 → 예약 → 종료 순', () => {
    const list = [
      event({ key: 0, startAt: '2026-07-01', endAt: '2026-07-20' }),
      event({ key: 1, startAt: '2026-08-20', endAt: '2026-09-03' }),
      event({ key: 2, startAt: '2026-08-01', endAt: '2026-08-31' }),
    ]
    expect(sortEvents(list, TODAY).map((e) => e.key)).toEqual([2, 1, 0])
  })

  it('같은 상태에서는 최근 시작한 것이 위', () => {
    const list = [
      event({ key: 0, startAt: '2026-08-01' }),
      event({ key: 1, startAt: '2026-08-10' }),
    ]
    expect(sortEvents(list, TODAY).map((e) => e.key)).toEqual([1, 0])
  })

  it('⚠️ 원본 배열을 건드리지 않는다', () => {
    const list = [event({ key: 0 }), event({ key: 1, startAt: '2026-08-10' })]
    sortEvents(list, TODAY)
    expect(list.map((e) => e.key)).toEqual([0, 1])
  })
})

describe('checkTargets · activeUserCount', () => {
  const users = [
    user({ key: 0, uid: 'U-10240' }),
    user({ key: 1, uid: 'U-10253' }),
    user({ key: 2, uid: 'U-10999', status: 'LEFT', leftAt: '2026-07-01' }),
  ]

  it('있는 것과 없는 것을 나눈다', () => {
    const r = checkTargets(['U-10240', 'U-99999'], users)
    expect(r.found.map((u) => u.uid)).toEqual(['U-10240'])
    expect(r.missing).toEqual(['U-99999'])
  })

  // 계정이 없으니 줄 곳도 없는데, 조용히 넘어가면 운영자는 준 줄 안다.
  it('⚠️ 탈퇴 회원은 못 찾은 것으로 본다', () => {
    expect(checkTargets(['U-10999'], users).missing).toEqual(['U-10999'])
  })

  it('⚠️ 「전체」 대상 수에서도 탈퇴는 뺀다', () => {
    expect(activeUserCount(users)).toBe(2)
  })
})

describe('validateGrant', () => {
  it('제대로 채우면 통과', () => {
    expect(validateGrant(grant())).toEqual({})
  })

  // 되돌릴 수 없고 감사 로그에 남는 처리다.
  it('⚠️ 사유는 언제나 필수 — 공백만 있는 것도 빈 것이다', () => {
    expect(validateGrant(grant({ why: '   ' })).why).toBeTruthy()
  })

  it('개별인데 대상이 비면 막는다', () => {
    expect(validateGrant(grant({ who: ' , ' })).who).toBeTruthy()
  })

  // 전체 대상은 id 를 적지 않는다 — 비었다고 막으면 전체 지급을 아예 못 한다.
  it('⚠️ 전체 대상은 회원 ID 가 없어도 된다', () => {
    expect(validateGrant(grant({ target: '전체', who: '' })).who).toBeUndefined()
  })

  it('재화는 수량이 1 이상', () => {
    expect(validateGrant(grant({ qty: 0 })).qty).toBeTruthy()
    expect(validateGrant(grant({ qty: -5 })).qty).toBeTruthy()
  })

  // 자릿수가 많은 값을 붙여 넣으면 `Number` 가 Infinity 가 되는데 `> 0` 은 참이다.
  it('⚠️ NaN · Infinity · 소수는 막는다', () => {
    for (const qty of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(validateGrant(grant({ qty })).qty).toBeTruthy()
    }
  })

  // 오타 하나로 전체 유저에게 나가는 화면이라 사람이 실수할 자리를 좁힌다.
  it('⚠️ 상한을 넘으면 막는다', () => {
    expect(validateGrant(grant({ qty: QTY_MAX })).qty).toBeUndefined()
    expect(validateGrant(grant({ qty: QTY_MAX + 1 })).qty).toBeTruthy()
  })

  // 아이템일 때 수량은 안 쓰는 값이라 0 이어도 막으면 안 된다.
  it('⚠️ 아이템은 수량 대신 아이템 선택을 본다', () => {
    expect(validateGrant(grant({ asset: '아이템', qty: 0, itemKey: 3 })).qty).toBeUndefined()
    expect(validateGrant(grant({ asset: '아이템', qty: 0, itemKey: null })).itemKey).toBeTruthy()
  })
})

describe('checkGrantItem', () => {
  const keys = [0, 1, 2]

  it('재화면 볼 것이 없다', () => {
    expect(checkGrantItem(grant({ asset: '파란보석' }), keys)).toBeNull()
  })

  it('있는 아이템이면 통과', () => {
    expect(checkGrantItem(grant({ asset: '아이템', itemKey: 1 }), keys)).toBeNull()
  })

  // 폼을 열어 둔 사이에 지워졌거나 주소로 들어온 값이면 없는 아이템을 「성공」 으로 기록한다.
  it('⚠️ 없는 아이템은 막는다 — null 인지만 보면 부족하다', () => {
    expect(checkGrantItem(grant({ asset: '아이템', itemKey: 99 }), keys)).toBeTruthy()
    expect(checkGrantItem(grant({ asset: '아이템', itemKey: null }), keys)).toBeTruthy()
  })

  it('아이템이 하나도 없으면 무엇을 골라도 막힌다', () => {
    expect(checkGrantItem(grant({ asset: '아이템', itemKey: 0 }), [])).toBeTruthy()
  })
})

describe('summarizeGrants', () => {
  const list = [
    log({ key: 0, kind: '지급', asset: '파란보석', qty: 100 }),
    log({ key: 1, kind: '지급', asset: '노란보석', qty: 500 }),
    log({ key: 2, kind: '회수', asset: '파란보석', qty: 100 }),
    log({ key: 3, kind: '지급', asset: '아이템', what: '왕관', qty: 1 }),
  ]

  it('지급·회수 건수를 센다', () => {
    const s = summarizeGrants(list)
    expect([s.granted, s.reclaimed]).toEqual([3, 1])
  })

  // 「젬 600 + 아이템 1」 을 601 로 세면 아무 뜻도 없는 값이 된다.
  it('⚠️ 지급 재화 합에 아이템을 더하지 않는다', () => {
    expect(summarizeGrants(list).coins).toBe(600)
  })

  // 아이템 이름이 「파란보석 상자」 여도 재화가 아니다.
  it('⚠️ 이름이 아니라 종류로 가른다', () => {
    const tricky = [log({ kind: '지급', asset: '아이템', what: '파란보석 상자', qty: 1 })]
    expect(summarizeGrants(tricky).coins).toBe(0)
  })
})
