/**
 * 성장 단계 목 저장소 — **교체가 엉뚱한 줄을 고치지 않는지** 고정한다.
 *
 * 둥지(`nests.test.ts`)와 같은 함정이다 — `assetId` 는 교체되는 값이라 식별자가 못 된다
 * (docs/ARCHITECTURE.md §19.3.2).
 */
import { afterEach, describe, expect, it } from 'vitest'

import { allStages, resetStages, setBoundaries, setStageAsset } from './growth'

describe('성장 단계 목 저장소', () => {
  afterEach(resetStages)

  // 겹치고 **난 뒤의 다음 교체**가 앞줄을 고친다 — 한 번짜리 테스트로는 못 잡는다.
  it('⚠️ 그림이 겹친 뒤에 다시 바꿔도 고른 줄만 바뀐다', () => {
    const [first, , , last] = allStages()

    setStageAsset(last!.key, first!.assetId)
    setStageAsset(last!.key, 'as_growth_2')

    const after = allStages()
    expect(after[3]!.assetId).toBe('as_growth_2')
    expect(after[0]!.assetId).toBe(first!.assetId)
    expect(after[0]!.name).toBe('알')
  })

  // 「금」 도 그림은 바뀐다 — 날짜가 없을 뿐이다.
  it('사건 단계의 그림도 바꿀 수 있다', () => {
    const gold = allStages()[1]!
    expect(gold.kind).toBe('event')

    setStageAsset(gold.key, 'as_growth_0')
    const after = allStages()[1]!
    expect(after.assetId).toBe('as_growth_0')
    expect(after.kind).toBe('event')
  })

  it('없는 key 면 undefined — 아무것도 바꾸지 않는다', () => {
    const before = allStages()
    expect(setStageAsset(99, 'as_growth_0')).toBeUndefined()
    expect(allStages()).toEqual(before)
  })

  // 경계는 날짜 단계만 건드린다 — 「금」 에 일수가 생기면 안 된다.
  it('⚠️ 경계를 고쳐도 사건 단계는 그대로다', () => {
    setBoundaries({ juvenileFrom: 5, adultFrom: 20 })
    const after = allStages()
    expect(after[1]).toMatchObject({ kind: 'event', name: '금' })
    expect(after.filter((s) => s.kind === 'days').map((s) => s.fromDay)).toEqual([0, 5, 20])
  })
})
