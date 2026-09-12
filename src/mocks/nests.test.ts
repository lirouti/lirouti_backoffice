/**
 * 둥지 목 저장소 — **교체가 엉뚱한 줄을 고치지 않는지** 고정한다.
 *
 * ⚠️ 둥지 셋이 카탈로그의 셋을 그대로 쓰고 있어서, 다른 그림을 고르면 **반드시 `assetId` 가
 *    겹친다.** 그때 `assetId` 로 줄을 찾으면 앞줄이 먼저 잡혀 **다른 둥지가 바뀐다**
 *    (docs/ARCHITECTURE.md §19.3.2).
 */
import { afterEach, describe, expect, it } from 'vitest'

import { allNests, resetNests, setNestAsset, setNestBoundaries } from './nests'

describe('둥지 목 저장소', () => {
  afterEach(resetNests)

  /*
    ⚠️ **두 번 교체해야 드러난다.** 한 번만 바꿀 때는 `assetId` 가 아직 유일해서 `assetId` 로
       찾아도 맞는 줄이 잡힌다. 겹치고 **난 뒤의 다음 교체**가 앞줄을 고친다 — 한 번짜리
       테스트로는 못 잡아서 실제로 새어 나갔다.
  */
  it('⚠️ 그림이 겹친 뒤에 다시 바꿔도 고른 줄만 바뀐다', () => {
    const [first, , third] = allNests()

    // ① 보금자리에 잔가지의 그림을 붙인다 — 여기서 둘이 겹친다
    setNestAsset(third!.key, first!.assetId)
    // ② 겹친 상태에서 보금자리를 또 바꾼다
    setNestAsset(third!.key, 'as_nest_1')

    const after = allNests()
    expect(after[2]!.assetId).toBe('as_nest_1')
    // 앞줄은 그대로여야 한다 — `assetId` 로 찾으면 여기가 바뀐다.
    expect(after[0]!.assetId).toBe(first!.assetId)
    expect(after[0]!.name).toBe('잔가지 둥지')
  })

  it('⚠️ 셋이 같은 그림이 돼도 줄은 셋 그대로다', () => {
    const target = allNests()[0]!.assetId
    setNestAsset(1, target)
    setNestAsset(2, target)

    const after = allNests()
    expect(after).toHaveLength(3)
    expect(new Set(after.map((n) => n.key)).size).toBe(3)
    expect(after.map((n) => n.name)).toEqual(['잔가지 둥지', '튼튼한 둥지', '보금자리'])
  })

  it('없는 key 면 undefined — 아무것도 바꾸지 않는다', () => {
    const before = allNests()
    expect(setNestAsset(99, 'as_nest_0')).toBeUndefined()
    expect(allNests()).toEqual(before)
  })

  it('경계를 고쳐도 그림은 그대로다', () => {
    const before = allNests().map((n) => n.assetId)
    setNestBoundaries({ secondFrom: 7, thirdFrom: 70 })
    const after = allNests()
    expect(after.map((n) => n.assetId)).toEqual(before)
    expect(after.map((n) => n.fromDay)).toEqual([1, 7, 70])
  })
})
