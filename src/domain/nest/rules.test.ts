/**
 * 둥지 규칙 (docs/ARCHITECTURE.md §41).
 *
 * ⚠️ **해금 조건을 저장하지 않고 파생하는 구조**라, 파생이 틀리면 세 단계가 겹치거나
 *    비어 버린다. 예전에는 같은 날짜가 카드와 표 **두 칸에** 문자열로 들어 있었다.
 */
import { describe, expect, it } from 'vitest'

import {
  applyNestBoundaries,
  nestBoundariesOf,
  unlockLabel,
  validateNestBoundaries,
  withUnlocks,
} from './rules'
import type { Nest } from './types'

const nests = (): Nest[] => [
  {
    assetId: 'as_nest_0',
    name: '잔가지 둥지',
    fromDay: 1,
    desc: '첫 둥지',
    props: '—',
    own: 92,
  },
  {
    assetId: 'as_nest_1',
    name: '튼튼한 둥지',
    fromDay: 30,
    desc: '이끼',
    props: '이끼',
    own: 54,
  },
  {
    assetId: 'as_nest_2',
    name: '보금자리',
    fromDay: 100,
    desc: '안감',
    props: '담요',
    own: 18,
  },
]

describe('unlockLabel', () => {
  it('다음 둥지 해금일 하루 전까지다', () => {
    expect(unlockLabel(nests()[0]!, 30)).toBe('누적 1–29일')
  })

  it('마지막은 끝이 없다', () => {
    expect(unlockLabel(nests()[2]!, null)).toBe('누적 100일 이상')
  })
})

describe('withUnlocks', () => {
  it('세 줄이 이어진다 — 사이에 빈 날이 없다', () => {
    expect(withUnlocks(nests()).map((r) => r.unlock)).toEqual([
      '누적 1–29일',
      '누적 30–99일',
      '누적 100일 이상',
    ])
  })

  // 경계 하나를 고치면 **두 줄의 표시가 함께** 바뀐다 — 저장했다면 하나만 바뀌었을 것이다.
  it('⚠️ 경계를 옮기면 앞뒤가 같이 따라온다', () => {
    const moved = applyNestBoundaries(nests(), { secondFrom: 15, thirdFrom: 100 })
    expect(withUnlocks(moved).map((r) => r.unlock)).toEqual([
      '누적 1–14일',
      '누적 15–99일',
      '누적 100일 이상',
    ])
  })
})

describe('validateNestBoundaries', () => {
  it('정상값은 통과', () => {
    expect(validateNestBoundaries({ secondFrom: 30, thirdFrom: 100 })).toEqual({})
  })

  // 뒤집히면 두 번째를 볼 수 있는 날이 하루도 없다.
  it('⚠️ 세 번째가 두 번째보다 앞서면 막는다', () => {
    expect(validateNestBoundaries({ secondFrom: 100, thirdFrom: 30 }).thirdFrom).toBeTruthy()
  })

  it('⚠️ 같은 날도 막는다 — 둥지 하나가 사라진다', () => {
    expect(validateNestBoundaries({ secondFrom: 30, thirdFrom: 30 }).thirdFrom).toBeTruthy()
  })

  // 1일차는 첫 둥지의 것이다. 가입 당일에 발밑이 비면 안 된다.
  it('⚠️ 1 이하는 막는다', () => {
    expect(validateNestBoundaries({ secondFrom: 1, thirdFrom: 100 }).secondFrom).toBeTruthy()
    expect(validateNestBoundaries({ secondFrom: 0, thirdFrom: 100 }).secondFrom).toBeTruthy()
  })

  it('⚠️ 소수는 막는다', () => {
    expect(validateNestBoundaries({ secondFrom: 30.5, thirdFrom: 100 }).secondFrom).toBeTruthy()
  })
})

describe('nestBoundariesOf · applyNestBoundaries', () => {
  it('첫 둥지는 경계가 아니다 — 둘만 뽑는다', () => {
    expect(nestBoundariesOf(nests())).toEqual({ secondFrom: 30, thirdFrom: 100 })
  })

  it('뽑아서 그대로 적용하면 제자리다', () => {
    const n = nests()
    expect(applyNestBoundaries(n, nestBoundariesOf(n))).toEqual(n)
  })

  // 저장이 실패해도 화면이 이미 바뀌어 있으면 안 된다.
  it('⚠️ 원본 배열을 건드리지 않는다', () => {
    const n = nests()
    applyNestBoundaries(n, { secondFrom: 7, thirdFrom: 70 })
    expect(nestBoundariesOf(n)).toEqual({ secondFrom: 30, thirdFrom: 100 })
  })

  it('첫 둥지의 해금일은 건드리지 않는다', () => {
    const applied = applyNestBoundaries(nests(), { secondFrom: 7, thirdFrom: 70 })
    expect(applied[0]!.fromDay).toBe(1)
  })
})
