/**
 * 성장 단계 규칙 (docs/ARCHITECTURE.md §42).
 *
 * ⚠️ **여기가 틀리면 화면이 말이 안 되는 기간을 그린다.** 경계를 저장하지 않고 파생하는
 *    구조라, 파생이 틀리면 네 단계가 서로 겹치거나 비어 버린다.
 */
import { describe, expect, it } from 'vitest'

import {
  applyBoundaries,
  boundariesOf,
  stageSpan,
  validateBoundaries,
  withSpans,
} from './rules'
import type { GrowthStage } from './types'

/** 실제 기본값과 같은 모양 — 「금」 이 알과 유체 **사이**에 있는 것이 요점이다 */
const stages = (): GrowthStage[] => [
  { kind: 'days', key: 0, assetId: 'as_growth_0', name: '알', fromDay: 0, unlock: '기본 배경' },
  {
    kind: 'event',
    key: 1,
    assetId: 'as_growth_1',
    name: '금',
    note: '부화 직전',
    unlock: '부화 연출',
  },
  { kind: 'days', key: 2, assetId: 'as_growth_2', name: '유체', fromDay: 3, unlock: '표정' },
  {
    kind: 'days',
    key: 3,
    assetId: 'as_growth_3',
    name: '성체',
    fromDay: 14,
    unlock: '전 슬롯',
  },
]

describe('stageSpan', () => {
  it('다음 단계 시작일 하루 전까지다', () => {
    expect(stageSpan(stages()[0]!, 3)).toBe('0–2일')
  })

  it('마지막 단계는 끝이 없다', () => {
    expect(stageSpan(stages()[3]!, null)).toBe('14일~')
  })

  // 「부화 직전」 은 오타가 아니라 시간이 아니라 사건으로 끝나는 단계라서다.
  it('⚠️ 사건 단계는 날짜가 아니라 적어 둔 말을 쓴다', () => {
    expect(stageSpan(stages()[1]!, 3)).toBe('부화 직전')
  })
})

describe('withSpans', () => {
  // 「금」 바로 다음 칸을 보면 일수가 없어 알의 표시를 만들 수 없다.
  it('⚠️ 사건 단계를 건너뛰고 다음 날짜 단계를 찾는다', () => {
    expect(withSpans(stages()).map((r) => r.span)).toEqual([
      '0–2일',
      '부화 직전',
      '3–13일',
      '14일~',
    ])
  })

  // 경계 하나를 고치면 **두 단계의 표시가 함께** 바뀐다 — 저장했다면 하나만 바뀌었을 것이다.
  it('⚠️ 경계를 옮기면 앞뒤 표시가 같이 따라온다', () => {
    const moved = applyBoundaries(stages(), { juvenileFrom: 5, adultFrom: 14 })
    expect(withSpans(moved).map((r) => r.span)).toEqual([
      '0–4일',
      '부화 직전',
      '5–13일',
      '14일~',
    ])
  })
})

describe('validateBoundaries', () => {
  it('정상값은 통과', () => {
    expect(validateBoundaries({ juvenileFrom: 3, adultFrom: 14 })).toEqual({})
  })

  // 뒤집히면 유체가 하루도 없는 기간이 되는데, 화면에는 '14–13일' 로만 드러난다.
  it('⚠️ 성체가 유체보다 앞서면 막는다', () => {
    expect(validateBoundaries({ juvenileFrom: 14, adultFrom: 3 }).adultFrom).toBeTruthy()
  })

  it('⚠️ 같은 날도 막는다 — 유체가 사라진다', () => {
    expect(validateBoundaries({ juvenileFrom: 5, adultFrom: 5 }).adultFrom).toBeTruthy()
  })

  // 0일차는 알의 것이다. 허용하면 알이 하루도 없이 끝난다.
  it('⚠️ 0 이하는 막는다', () => {
    expect(validateBoundaries({ juvenileFrom: 0, adultFrom: 14 }).juvenileFrom).toBeTruthy()
    expect(validateBoundaries({ juvenileFrom: -1, adultFrom: 14 }).juvenileFrom).toBeTruthy()
  })

  it('⚠️ 소수는 막는다 — 클라이언트가 「0.5일차」 를 셀 수 없다', () => {
    expect(validateBoundaries({ juvenileFrom: 3.5, adultFrom: 14 }).juvenileFrom).toBeTruthy()
  })

  // 둘 다 모양이 틀렸는데 순서까지 따지면 한 칸에 오류가 겹쳐 나온다.
  it('모양이 틀리면 순서는 따지지 않는다', () => {
    const e = validateBoundaries({ juvenileFrom: 0, adultFrom: 0 })
    expect(e.juvenileFrom).toBeTruthy()
    expect(e.adultFrom).toContain('정수')
  })
})

describe('boundariesOf · applyBoundaries', () => {
  it('지금 값에서 경계 둘을 뽑는다 — 알은 경계가 아니다', () => {
    expect(boundariesOf(stages())).toEqual({ juvenileFrom: 3, adultFrom: 14 })
  })

  it('뽑아서 그대로 적용하면 제자리다', () => {
    const s = stages()
    expect(applyBoundaries(s, boundariesOf(s))).toEqual(s)
  })

  // 저장이 실패해도 화면이 이미 바뀌어 있으면 안 된다.
  it('⚠️ 원본 배열을 건드리지 않는다', () => {
    const s = stages()
    applyBoundaries(s, { juvenileFrom: 9, adultFrom: 20 })
    expect(boundariesOf(s)).toEqual({ juvenileFrom: 3, adultFrom: 14 })
  })

  it('사건 단계에는 일수를 넣지 않는다', () => {
    const applied = applyBoundaries(stages(), { juvenileFrom: 5, adultFrom: 20 })
    expect(applied[1]).toEqual(stages()[1])
  })
})
