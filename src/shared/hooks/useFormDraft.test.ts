// @vitest-environment jsdom
/**
 * ⚠️ **여기 있는 것은 전부 실제로 났던 버그다.**
 *
 * 셋 다 브라우저에서 손으로 찾았다 — `sessionStorage` 쓰기를 가로채 세거나, 콘솔에
 * 로그를 심거나(docs/ARCHITECTURE.md §58.1 · §59.7). 손으로 하는 확인은 **「났다」 는
 * 보일 수 있어도 「안 난다」 는 증명하지 못한다.** 그래서 이 파일이 있다.
 *
 * `@vitest-environment jsdom` — 이 훅은 `sessionStorage` 와 `setTimeout` 을 쓴다.
 * 전역 환경은 `node` 로 둔다(§60.1): `domain/` 700여 개가 DOM 을 쓸 이유가 없다.
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFormDraft } from './useFormDraft'

const KEY = 'riruti_admin_draft:test:new'

/** 저장 예약이 깨어나는 데 걸리는 시간(`QUIET_MS`)보다 넉넉히 */
const QUIET = 600

/**
 * ⚠️ **`act` 로 감싸야 한다.** 타이머가 `setSavedAt` 을 부르는데, 감싸지 않으면 React 19
 *    가 그 갱신을 커밋하지 않아 **뒤따르는 효과가 안 돌고 테스트가 거짓 통과한다.**
 */
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useFormDraft', () => {
  it('조용해지면 쓴다', () => {
    renderHook(() => useFormDraft('test:new', { a: 1 }, true))
    expect(sessionStorage.getItem(KEY)).toBeNull()

    tick(QUIET)
    expect(sessionStorage.getItem(KEY)).toBe('{"a":1}')
  })

  // 열어만 보고 나간 화면은 초안을 안 남긴다.
  it('더럽지 않으면 안 쓴다', () => {
    renderHook(() => useFormDraft('test:new', { a: 1 }, false))
    tick(QUIET)
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })

  /**
   * ⚠️ **`saveNow` 가 `savedAt` 을 바꾸면 리렌더가 돌고, `value` 는 매 렌더 새 객체라
   *    저장 효과가 다시 걸린다.** 그대로 두면 폼이 더러운 동안 500ms 마다 영원히 같은
   *    내용을 다시 쓴다 (§58.1 — 브라우저에서 3초에 4회를 셌다).
   */
  it('⚠️ 값이 그대로면 다시 쓰지 않는다 — 무한 저장 고리', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    // 부르는 쪽이 매 렌더 새 객체를 넘기는 것이 실제 모양이다(`form.watch()`).
    const { rerender } = renderHook(() => useFormDraft('test:new', { a: 1 }, true))

    tick(QUIET)
    expect(spy).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 5; i += 1) {
      rerender()
      tick(QUIET)
    }
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('값이 바뀌면 다시 쓴다', () => {
    const { rerender } = renderHook(({ v }) => useFormDraft('test:new', v, true), {
      initialProps: { v: { a: 1 } },
    })
    tick(QUIET)
    expect(sessionStorage.getItem(KEY)).toBe('{"a":1}')

    rerender({ v: { a: 2 } })
    tick(QUIET)
    expect(sessionStorage.getItem(KEY)).toBe('{"a":2}')
  })

  /**
   * ⚠️ **예약을 끄지 않으면 지운 초안이 되살아난다.** 문의 상세는 답변을 보낸 뒤에도
   *    화면에 머물러서 언마운트 정리가 대신 꺼 주지 않는다 — **이미 보낸 답변이 초안으로
   *    돌아와** 다음에 열면 입력창에 앉아 있었다 (§58.1).
   */
  it('⚠️ clear() 가 걸린 예약을 끈다 — 지운 초안이 되살아남', () => {
    const { result } = renderHook(() => useFormDraft('test:new', { a: 1 }, true))

    // 예약이 걸린 채로(아직 깨어나기 전에) 지운다.
    tick(200)
    act(() => result.current.clear())
    expect(sessionStorage.getItem(KEY)).toBeNull()

    // 예약이 살아 있었다면 여기서 옛 값이 되돌아온다.
    tick(QUIET)
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })

  it('clear() 는 저장 시각도 지운다', () => {
    const { result } = renderHook(() => useFormDraft('test:new', { a: 1 }, true))
    tick(QUIET)
    expect(result.current.savedAt).not.toBeNull()

    act(() => result.current.clear())
    expect(result.current.savedAt).toBeNull()
  })

  it('saveNow() 는 기다리지 않고 즉시 쓴다', () => {
    const { result } = renderHook(() => useFormDraft('test:new', { a: 1 }, true))
    act(() => result.current.saveNow())
    expect(sessionStorage.getItem(KEY)).toBe('{"a":1}')
  })

  /**
   * ⚠️ **저장에 실패한 값을 「이미 썼다」로 담아 두면 그 값은 영영 안 써진다.**
   *
   * `setItem` 은 `QuotaExceededError` 를 던질 수 있다(사파리 시크릿 모드·용량 초과).
   * 브라우저에서 이 순서를 되돌려 봤을 때는 **고장을 재현하지 못했는데**(§59.7), 그때
   * **값을 바꿔 가며** 시험했기 때문이다 — 값이 다르면 어차피 새 예약이 걸린다.
   * **갈리는 것은 값이 그대로일 때뿐**이고, 그게 여기다.
   */
  it('⚠️ 저장이 실패하면 같은 값이어도 다시 시도한다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { rerender } = renderHook(() => useFormDraft('test:new', { a: 1 }, true))

    // 예약이 깨어나 저장을 시도하고 던진다.
    expect(() => tick(QUIET)).toThrow()
    expect(sessionStorage.getItem(KEY)).toBeNull()

    // 용량이 풀렸다. 값은 그대로지만 아직 저장되지 않았으므로 다시 써야 한다.
    spy.mockRestore()
    rerender()
    tick(QUIET)
    expect(sessionStorage.getItem(KEY)).toBe('{"a":1}')
  })

  // 칸 이름이 다르면 초안도 다르다 — 한 칸을 나눠 쓰면 남의 초안을 받는다 (§33.2).
  it('scope 마다 칸이 갈린다', () => {
    renderHook(() => useFormDraft('items:new', { a: 1 }, true))
    tick(QUIET)
    expect(sessionStorage.getItem('riruti_admin_draft:items:new')).toBe('{"a":1}')
    expect(sessionStorage.getItem('riruti_admin_draft:items:3')).toBeNull()
  })

  // 화면을 떠나면 걸려 있던 예약은 사라져야 한다 — 없어진 폼의 값을 쓸 이유가 없다.
  it('언마운트하면 걸린 예약이 사라진다', () => {
    const { unmount } = renderHook(() => useFormDraft('test:new', { a: 1 }, true))
    tick(200)
    unmount()
    tick(QUIET)
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })
})
