// @vitest-environment jsdom
/**
 * 창 안에 창을 그릴 때 무너지는 둘 (docs/ARCHITECTURE.md §63.1).
 *
 * ⚠️ **둘 다 마우스로는 멀쩡해 보인다.** Esc 와 Enter 라 **키보드에서만** 나고,
 *    한쪽은 고르던 자리를 잃고 다른 쪽은 **덜 채운 폼을 제출한다.**
 *
 * jsdom 에는 top layer 가 없어 창이 실제로 뜨지는 않는다 — 여기서 재는 것은 **이벤트가
 * 어디까지 가는가** 이고, 그게 두 버그의 정체라 그걸로 충분하다.
 */
import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Dialog } from './Dialog'

/*
  ⚠️ **jsdom 에는 모달 `<dialog>` 가 없다.** 요소와 `open` 속성은 있지만 `showModal` 은
     구현돼 있지 않아 그냥 `TypeError` 로 터진다 — top layer·포커스 가둠·`inert` 가
     전부 브라우저 기능이라서다.

     여는 시늉만 채운다. **그 넷은 여기서 검증하지 않는다**(브라우저가 하는 일이고,
     실제로 브라우저에서 쟀다). 이 파일이 보는 것은 **이벤트가 어디까지 가는가** 뿐이고
     그건 jsdom 에서도 React 가 똑같이 돈다.
*/
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

/** 네이티브 `cancel` 은 **버블하지 않는다** — React 의 합성 전파만 탄다 */
const esc = (el: Element) => el.dispatchEvent(new Event('cancel', { cancelable: true }))

function enter(el: Element): boolean {
  const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  el.dispatchEvent(e)
  return e.defaultPrevented
}

describe('중첩 창의 Esc', () => {
  function nested() {
    const outer = vi.fn()
    const inner = vi.fn()
    const { container } = render(
      <Dialog open onCancel={outer} title="고르기">
        <Dialog open onCancel={inner} title="들여다보기" />
      </Dialog>,
    )
    const dialogs = container.querySelectorAll('dialog')
    return { outer, inner, innerEl: dialogs[1]!, outerEl: dialogs[0]! }
  }

  /*
    안쪽 `<dialog>` 는 바깥 `<dialog>` 의 **DOM 자식**이라 React 의 합성 `onCancel` 이
    위로 올라간다. `stopPropagation` 을 빼면 이 테스트가 빨개진다 — 실제로 확인했다.
  */
  it('⚠️ 안쪽만 닫힌다 — 바깥까지 닫히면 고르던 자리를 잃는다', () => {
    const { outer, inner, innerEl } = nested()
    esc(innerEl)
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('바깥에서 누른 Esc 는 바깥이 받는다', () => {
    const { outer, inner, outerEl } = nested()
    esc(outerEl)
    expect(outer).toHaveBeenCalledTimes(1)
    expect(inner).not.toHaveBeenCalled()
  })
})

describe('폼 안에 뜬 창의 Enter', () => {
  /*
    `<dialog>` 는 폼의 경계가 아니다 — 창 안의 `<input>` 도 바깥 `<form>` 의 소유라
    Enter 가 그 폼을 **암묵적으로 제출한다**(§44.3). 실측: 챌린지 등록 폼에서 고르기
    창의 검색칸에 Enter 를 쳤더니 보상 없는 챌린지가 만들어지고 상세로 넘어갔다.
  */
  it('⚠️ 바깥 폼의 제출을 막는다', () => {
    const { container } = render(
      <form>
        <Dialog open onCancel={vi.fn()} title="고르기">
          <input aria-label="아이템 이름" />
        </Dialog>
      </form>,
    )
    expect(enter(container.querySelector('input')!)).toBe(true)
  })

  it('창이 자기 폼을 품고 있으면 그 Enter 는 건드리지 않는다', () => {
    const { container } = render(
      <Dialog open onCancel={vi.fn()} title="검색">
        <form>
          <input aria-label="검색어" />
        </form>
      </Dialog>,
    )
    expect(enter(container.querySelector('input')!)).toBe(false)
  })

  it('폼이 아예 없으면 건드리지 않는다', () => {
    const { container } = render(
      <Dialog open onCancel={vi.fn()} title="확인">
        <input aria-label="현재 코드" />
      </Dialog>,
    )
    expect(enter(container.querySelector('input')!)).toBe(false)
  })

  // 여러 줄 입력에서 Enter 는 줄바꿈이다 — 폼 안이어도 제출로 새지 않는다.
  it('textarea 의 Enter 는 줄바꿈이라 그대로 둔다', () => {
    const { container } = render(
      <form>
        <Dialog open onCancel={vi.fn()} title="사유">
          <textarea aria-label="사유" />
        </Dialog>
      </form>,
    )
    expect(enter(container.querySelector('textarea')!)).toBe(false)
  })
})
