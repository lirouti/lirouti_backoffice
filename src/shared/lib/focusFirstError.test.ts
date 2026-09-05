// @vitest-environment jsdom
/**
 * 이 파일의 주석은 「테스트가 없다 — vitest 환경이 `node` 라 DOM 이 없다」 로 시작했다.
 * 그 전제가 사라졌으므로(docs/ARCHITECTURE.md §60) 여기서 고정한다.
 *
 * 고정하는 것은 **자리**다 — 「첫 오류 칸」 이지 마지막도, 문서 전체의 첫 번째도 아니다.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { focusFirstError } from './focusFirstError'

/** `<form>` 을 문서에 붙인다. **붙이지 않으면 `focus()` 가 아무 일도 하지 않는다** */
function form(html: string): HTMLFormElement {
  const el = document.createElement('form')
  el.innerHTML = html
  document.body.append(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('focusFirstError', () => {
  it('aria-invalid 인 칸으로 옮긴다', () => {
    const root = form('<input id="a" /><input id="b" aria-invalid="true" />')
    focusFirstError(root)
    expect(document.activeElement?.id).toBe('b')
  })

  // 긴 폼에서 아래쪽 오류로 먼저 가면 위에 남은 것을 못 보고 지나친다.
  it('⚠️ 여럿이면 첫 번째다', () => {
    const root = form(
      '<input id="a" aria-invalid="true" /><input id="b" aria-invalid="true" />',
    )
    focusFirstError(root)
    expect(document.activeElement?.id).toBe('a')
  })

  // `aria-invalid="false"` 는 **오류가 아니라는 표시**다 — 있다고 잡으면 안 된다.
  it('⚠️ false 는 오류가 아니다', () => {
    const root = form(
      '<input id="a" aria-invalid="false" /><input id="b" aria-invalid="true" />',
    )
    focusFirstError(root)
    expect(document.activeElement?.id).toBe('b')
  })

  /**
   * ⚠️ **`Select` 는 `<select>` 가 아니라 `role="combobox"` 버튼이고, `FilePicker` 는
   *    투명하지만 살아 있는 `<input type="file">` 이다.** 태그로 찾으면 둘 다 놓친다.
   */
  it('입력 칸이 아닌 요소에도 옮긴다', () => {
    const root = form('<button id="sel" role="combobox" aria-invalid="true"></button>')
    focusFirstError(root)
    expect(document.activeElement?.id).toBe('sel')
  })

  // 에셋 미선택처럼 **옮길 곳이 없는 오류**가 있다. 그 경우에도 메시지는 이미 그려져 있다.
  it('오류가 없으면 아무 일도 하지 않는다', () => {
    const root = form('<input id="a" />')
    const before = document.activeElement
    focusFirstError(root)
    expect(document.activeElement).toBe(before)
  })

  // 로딩 중이거나 조기 반환한 화면에서는 폼 자체가 없다.
  it('root 가 null 이면 터지지 않는다', () => {
    expect(() => focusFirstError(null)).not.toThrow()
  })

  // 폼 밖의 오류까지 잡으면 **다른 화면의 칸**으로 포커스가 튄다.
  it('⚠️ 주어진 폼 안에서만 찾는다', () => {
    const outside = document.createElement('input')
    outside.id = 'outside'
    outside.setAttribute('aria-invalid', 'true')
    document.body.append(outside)

    const root = form('<input id="inside" />')
    focusFirstError(root)
    expect(document.activeElement?.id).not.toBe('outside')
  })
})
