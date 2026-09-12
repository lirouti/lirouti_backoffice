/**
 * 레벨 목 저장소 — **고친 값이 다음 조회에도 남는지** 고정한다.
 *
 * 규칙(누적 재계산 · 「검수 중」 강등)은 `domain/level` 이 갖고 여기서는 **저장이 실제로
 * 붙는지**만 본다 — 목이 배열을 갈아 끼우지 않으면 저장이 조용히 사라진다.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { allLevels, resetLevels, setLevel } from './levels'

describe('레벨 목 저장소', () => {
  afterEach(resetLevels)

  it('고친 값이 다음 조회에도 남는다', () => {
    setLevel(3, { need: 1000, gem: 0, unlock: '배경 2종' })

    const after = allLevels()
    expect(after[2]).toMatchObject({ lv: 3, need: 1000, gem: 0, status: '검수 중' })
  })

  // 누적은 저장하지 않고 `withTotals` 가 다시 채운다 — 안 붙으면 표가 그 지점부터 어긋난다.
  it('⚠️ 아래 행의 누적도 함께 저장된다', () => {
    const before = allLevels().at(-1)!.total
    setLevel(1, { need: 1100, gem: 20, unlock: '기본 표정' })

    const after = allLevels()
    expect(after[0]!.total).toBe(1100)
    expect(after.at(-1)!.total).toBe(before + 1000)
  })

  it('없는 레벨이면 undefined — 아무것도 바꾸지 않는다', () => {
    const before = allLevels()
    expect(setLevel(99, { need: 1, gem: 0, unlock: 'x' })).toBeUndefined()
    expect(allLevels()).toEqual(before)
  })

  // 목 저장소가 파일 하나를 공유하므로 되돌리지 않으면 다음 테스트가 오염된다.
  it('되돌리면 처음 값이다', () => {
    setLevel(1, { need: 9999, gem: 0, unlock: 'x' })
    resetLevels()
    expect(allLevels()[0]).toMatchObject({ need: 100, status: '적용' })
  })
})
