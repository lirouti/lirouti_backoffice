// @vitest-environment jsdom
/**
 * ⚠️ **여기서 고정하는 것은 「포커스를 받을 수 있는가」 하나다.**
 *
 * 본문 바로가기는 **숨겨 두는 것이 요점**이라, 숨기는 방법을 잘못 고르면
 * (`display: none` · `visibility: hidden` · `hidden` 속성) **포커스를 못 받아 있으나
 * 마나가 된다** — 화면에는 아무 흔적이 없으므로 눈으로는 절대 못 잡는다
 * (docs/ARCHITECTURE.md §63.2).
 *
 * ⚠️ **나타나는지는 여기서 못 잰다.** `:focus-visible` 은 브라우저가 「키보드로 왔는가」 를
 *    판단해 켜는 것이라 jsdom 에 없다. 그건 브라우저에서 실측했다(§63.2).
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MAIN_ID, SkipLink } from './SkipLink'

/**
 * 포커스를 앗아가는 숨김에 Panda 가 붙이는 클래스.
 *
 * ⚠️ **인라인 `style` 로는 못 잡는다.** `css()` 는 클래스를 만들지 `style` 을 쓰지 않아
 *    jsdom 에서 `el.style.display` 가 언제나 빈 문자열이다 — 처음에 그렇게 썼다가
 *    **`display: 'none'` 을 주입해도 초록**인 것을 보고 고쳤다. 클래스 이름은 Panda 의
 *    규약이라 그쪽이 바뀌면 이 검사가 조용히 무력해진다. 그때를 대비해 여기 적어 둔다.
 */
const HIDDEN_CLASSES = ['d_none', 'v_hidden', 'display_none', 'visibility_hidden']

describe('SkipLink', () => {
  it('건너뛸 지점을 가리킨다', () => {
    const { container } = render(<SkipLink />)
    const a = container.querySelector('a')
    expect(a?.getAttribute('href')).toBe(`#${MAIN_ID}`)
  })

  // 링크로 읽혀야 스크린리더가 「본문 바로가기, 링크」 로 알린다.
  it('링크이고 이름이 있다', () => {
    const { container } = render(<SkipLink />)
    const a = container.querySelector('a')
    expect(a?.textContent?.trim()).toBe('본문 바로가기')
  })

  /**
   * ⚠️ **`display: none` 으로 숨기면 포커스를 못 받는다.** 그러면 Tab 으로 닿을 수 없어
   *    **있으나 마나**가 된다 — `FilePicker` 의 `<input type="file">` 이 같은 함정이었다.
   */
  it('⚠️ 포커스를 앗아가는 방법으로 숨기지 않는다', () => {
    const { container } = render(<SkipLink />)
    const a = container.querySelector('a')!
    expect(a.hasAttribute('hidden')).toBe(false)
    expect(a.getAttribute('aria-hidden')).toBeNull()
    for (const c of HIDDEN_CLASSES) expect([...a.classList]).not.toContain(c)
  })

  // Tab 순서에서 빠지면 그 자체로 못 쓴다.
  it('⚠️ tabindex 로 순서에서 빼지 않는다', () => {
    const { container } = render(<SkipLink />)
    expect(container.querySelector('a')?.getAttribute('tabindex')).toBeNull()
  })

  // 실제로 포커스가 가는지 — jsdom 도 이건 잰다.
  it('포커스를 받는다', () => {
    const { container } = render(<SkipLink />)
    const a = container.querySelector('a')!
    a.focus()
    expect(document.activeElement).toBe(a)
  })
})
