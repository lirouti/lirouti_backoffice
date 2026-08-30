/**
 * 챌린지 규칙 (docs/ARCHITECTURE.md §20).
 *
 * 여기서 막지 못한 값은 **운영에 그대로 나간다** — 목표 0 인 챌린지는 조건을 걸어 놓고
 * 아무것도 세지 않고, 목록에 없는 조건은 달성이 영영 안 잡힌다.
 */
import { describe, expect, it } from 'vitest'

import {
  activeChallenges,
  byKind,
  challengeStatusOf,
  emptyChallengeInput,
  hasItemReward,
  periodLabel,
  toChallengeInput,
  validateChallenge,
} from './rules'
import type { Challenge, ChallengeInput } from './types'

const input = (over: Partial<ChallengeInput> = {}): ChallengeInput => ({
  ...emptyChallengeInput(),
  title: '오늘 출석하기',
  ...over,
})

const chal = (over: Partial<Challenge> = {}): Challenge => ({
  ...emptyChallengeInput(),
  title: '가',
  key: 0,
  code: 'CH-2001',
  rate: 0,
  status: 'ACTIVE',
  ...over,
})

describe('validateChallenge', () => {
  it('다 채우면 오류가 없다', () => {
    expect(validateChallenge(input())).toEqual({})
  })

  it('제목은 필수 — 공백만 있는 것도 빈 것이다', () => {
    expect(validateChallenge(input({ title: '  ' })).title).toBeTruthy()
  })

  // 목록 밖의 조건은 서버가 셀 수 없다.
  it('⚠️ 조건은 목록에 있는 것만', () => {
    expect(validateChallenge(input({ cond: '아무거나' })).cond).toBeTruthy()
    expect(validateChallenge(input({ cond: '출석' })).cond).toBeUndefined()
  })

  // 0 이면 조건을 걸어 놓고 아무것도 세지 않는 챌린지가 된다.
  it('⚠️ 목표치 0 은 막는다', () => {
    expect(validateChallenge(input({ goal: 0 })).goal).toBeTruthy()
    expect(validateChallenge(input({ goal: -1 })).goal).toBeTruthy()
  })

  // 달성해도 받는 게 없는 챌린지가 만들어진다.
  it('⚠️ 젬 0 + 아이템 없음은 막는다 — 보상이 아예 없다', () => {
    expect(validateChallenge(input({ gem: 0, rewardItem: null })).gem).toBeTruthy()
  })

  it('젬이 0 이어도 보상 아이템이 있으면 통과', () => {
    const reward = { assetId: 'as_head_0', name: '밀짚모자', slot: 'HEAD' as const }
    expect(validateChallenge(input({ gem: 0, rewardItem: reward })).gem).toBeUndefined()
  })

  it('종료가 시작보다 빠르면 막는다', () => {
    expect(validateChallenge(input({ startAt: '2026-09-01', endAt: '2026-08-01' })).endAt).toBeTruthy()
  })

  it('한쪽만 비어 있으면 기간 검사를 하지 않는다 — 빈 값은 「제한 없음」 이다', () => {
    expect(validateChallenge(input({ startAt: '2026-09-01', endAt: '' })).endAt).toBeUndefined()
  })
})

describe('challengeStatusOf', () => {
  it('시작이 아직이면 예약', () => {
    expect(challengeStatusOf({ startAt: '2026-09-01', endAt: '' }, '2026-08-30')).toBe('SCHEDULED')
  })

  it('종료가 지났으면 종료', () => {
    expect(challengeStatusOf({ startAt: '', endAt: '2026-08-01' }, '2026-08-30')).toBe('ENDED')
  })

  it('기간 안이거나 제한이 없으면 진행', () => {
    expect(challengeStatusOf({ startAt: '', endAt: '' }, '2026-08-30')).toBe('ACTIVE')
    expect(challengeStatusOf({ startAt: '2026-08-01', endAt: '2026-09-30' }, '2026-08-30')).toBe('ACTIVE')
  })

  it('시작 당일과 종료 당일은 진행이다 — 경계는 포함', () => {
    expect(challengeStatusOf({ startAt: '2026-08-30', endAt: '' }, '2026-08-30')).toBe('ACTIVE')
    expect(challengeStatusOf({ startAt: '', endAt: '2026-08-30' }, '2026-08-30')).toBe('ACTIVE')
  })

  // 「중단」 은 사람이 내린 결정이다. 기간이 남았다고 되살아나면 운영자가 내린 것이 풀린다.
  it('⚠️ 중단한 것은 기간이 남아 있어도 되살아나지 않는다', () => {
    expect(challengeStatusOf({ startAt: '', endAt: '' }, '2026-08-30', 'ENDED')).toBe('ENDED')
  })
})

describe('periodLabel', () => {
  it('둘 다 비면 제한 없음', () => {
    expect(periodLabel({ startAt: '', endAt: '' })).toBe('제한 없음')
  })

  // 한쪽만 있는 건 열린 구간이다. 빈 쪽을 그대로 이어 붙이면 「2026-08-01 ~ 」 가 된다.
  it('⚠️ 한쪽만 있으면 열린 구간으로 쓴다', () => {
    expect(periodLabel({ startAt: '2026-08-01', endAt: '' })).toBe('2026-08-01 ~')
    expect(periodLabel({ startAt: '', endAt: '2026-09-30' })).toBe('~ 2026-09-30')
  })

  it('둘 다 있으면 구간', () => {
    expect(periodLabel({ startAt: '2026-08-01', endAt: '2026-09-30' })).toBe('2026-08-01 ~ 2026-09-30')
  })
})

describe('activeChallenges · byKind', () => {
  const list = [
    chal({ key: 0, kind: 'DAILY', status: 'ACTIVE' }),
    chal({ key: 1, kind: 'WEEKLY', status: 'ENDED' }),
    chal({ key: 2, kind: 'DAILY', status: 'ACTIVE' }),
  ]

  it('진행 중인 것만', () => {
    expect(activeChallenges(list).map((c) => c.key)).toEqual([0, 2])
  })

  it('음수 N 은 0 으로 다룬다', () => {
    expect(activeChallenges(list, -1)).toEqual([])
  })

  it('주기를 안 주면 전부', () => {
    expect(byKind(list)).toHaveLength(3)
    expect(byKind(list, 'DAILY')).toHaveLength(2)
  })
})

describe('toChallengeInput', () => {
  it('서버가 소유한 필드는 떼어낸다', () => {
    const got = toChallengeInput(chal({ rate: 71 }))
    expect(got).not.toHaveProperty('rate')
    expect(got).not.toHaveProperty('status')
    expect(got).not.toHaveProperty('code')
  })
})

describe('hasItemReward', () => {
  it('아이템 보상 유무', () => {
    expect(hasItemReward(chal())).toBe(false)
    expect(hasItemReward(chal({ rewardItem: { assetId: 'as_head_0', name: '밀짚모자', slot: 'HEAD' } }))).toBe(true)
  })
})
