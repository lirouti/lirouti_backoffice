/**
 * 어떤 이동이 화면을 파기하는가.
 *
 * 다른 서브 메뉴로 가는 것까지 막으면 **아무것도 잃지 않는 이동에 확인을 묻게** 된다 —
 * 그런 확인 창은 몇 번 겪으면 읽지 않고 누르게 되어 정작 필요할 때 안 먹는다.
 */
import { describe, expect, it } from 'vitest'

import { willDiscard } from './useUnsavedNavGuard'

describe('willDiscard', () => {
  it('같은 서브 메뉴 안에서 옮기면 앞의 화면이 파기된다', () => {
    expect(willDiscard('/items/3', '/items/7', true)).toBe(true)
    expect(willDiscard('/items/3', '/items', true)).toBe(true)
    expect(willDiscard('/items/3', '/items/new', true)).toBe(true)
  })

  it('다른 서브 메뉴로 가면 이 탭이 경로를 들고 있어 화면이 산다', () => {
    expect(willDiscard('/items/3', '/security', true)).toBe(false)
    expect(willDiscard('/items/3', '/audit', true)).toBe(false)
  })

  it('저장 안 된 게 없으면 막지 않는다', () => {
    expect(willDiscard('/items/3', '/items/7', false)).toBe(false)
  })

  it('같은 경로면 이동이 아니다', () => {
    expect(willDiscard('/items/3', '/items/3', true)).toBe(false)
  })

  it('어느 화면도 아닌 경로(`/` = 열린 탭 없음)는 막지 않는다', () => {
    expect(willDiscard('/items/3', '/', true)).toBe(false)
    expect(willDiscard('/', '/items', true)).toBe(false)
  })
})
