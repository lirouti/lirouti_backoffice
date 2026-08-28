/**
 * 탭 축출 규칙.
 *
 * 밀려난 탭은 `AdminLayout` 이 keep-alive 캐시까지 파기한다 — 여기서 미저장 탭을
 * 고르면 작성 중이던 내용이 **확인 한 번 없이** 사라진다. 실제로 그런 폴백이 있었다.
 */
import { describe, expect, it } from 'vitest'

import { evictionTarget, type OpenTab } from './tabsStore'

const tab = (screen: string): OpenTab => ({ screen: screen as OpenTab['screen'], path: `/${screen}` })
const tabs = (...names: string[]) => names.map(tab)
const dirtyOf = (...names: string[]) => (t: OpenTab) => names.includes(t.screen)
const clean = () => false

describe('evictionTarget', () => {
  it('깨끗한 것 중 가장 오래된 것을 고른다', () => {
    expect(evictionTarget(tabs('a', 'b', 'c'), 'c' as OpenTab['screen'], clean)?.screen).toBe('a')
  })

  it('방금 연 탭은 고르지 않는다', () => {
    expect(evictionTarget(tabs('a'), 'a' as OpenTab['screen'], clean)).toBeNull()
  })

  it('미저장 탭은 건너뛴다', () => {
    const found = evictionTarget(tabs('a', 'b', 'c'), 'c' as OpenTab['screen'], dirtyOf('a'))
    expect(found?.screen).toBe('b')
  })

  it('⚠️ 전부 미저장이면 아무것도 고르지 않는다 — 상한보다 저장 안 된 내용이 우선이다', () => {
    expect(evictionTarget(tabs('a', 'b'), 'c' as OpenTab['screen'], dirtyOf('a', 'b'))).toBeNull()
  })

  it('빈 목록', () => {
    expect(evictionTarget([], 'a' as OpenTab['screen'], clean)).toBeNull()
  })
})
