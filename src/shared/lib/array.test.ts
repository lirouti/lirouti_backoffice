/**
 * 순서 바꾸기 (docs/ARCHITECTURE.md §24.3).
 *
 * 상점 진열과 FAQ 가 같이 쓴다 — 여기가 틀리면 두 화면이 같이 깨진다.
 */
import { describe, expect, it } from 'vitest'

import { moveSlot } from './array'

describe('moveSlot', () => {
  const list = ['a', 'b', 'c']

  it('위아래로 자리를 맞바꾼다', () => {
    expect(moveSlot(list, 1, 0)).toEqual(['b', 'a', 'c'])
    expect(moveSlot(list, 1, 2)).toEqual(['a', 'c', 'b'])
  })

  // 감싸면 맨 위 상품을 올리려다 맨 아래로 보낸다.
  it('⚠️ 끝에서 밀면 그대로 — 반대쪽 끝으로 감기지 않는다', () => {
    expect(moveSlot(list, 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveSlot(list, 2, 3)).toEqual(['a', 'b', 'c'])
  })

  // 같은 참조를 돌려주면 React 가 다시 그리지 않는다.
  it('⚠️ 옮겼으면 새 배열이다', () => {
    expect(moveSlot(list, 0, 1)).not.toBe(list)
  })
})
