// @vitest-environment jsdom
/**
 * ⚠️ **`onChange` 를 헛되이 부르면 로그인이 조용히 안 됐다.**
 *
 * 다 찬 뒤의 7번째 숫자는 잘려서 같은 값이 되는데, 그래도 부모를 부르면 호출부의
 * `reset()` 이 돌고 **react-query 가 진행 중인 mutation 에서 observer 를 떼어낸다** —
 * 검증이 성공해도 `onSuccess` 가 오지 않는다(docs/ARCHITECTURE.md §45).
 *
 * 이 파일이 고정하는 것은 **「같은 값이면 안 부른다」** 하나다. 나머지는 그 조건이
 * 성립하는 경계(자릿수 자르기·숫자만 남기기)를 지킨다.
 */
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OtpInput } from './OtpInput'

/**
 * 눈에 보이는 칸들은 `aria-hidden` 이고, 실제로 값을 받는 것은 그 위에 겹친 투명한
 * `<input>` 하나다 — 라벨로 찾는다.
 */
function setup(value: string, onChange = vi.fn()) {
  const { container } = render(
    <OtpInput value={value} onChange={onChange} length={6} aria-label="인증 코드" />,
  )
  const input = container.querySelector('input')
  if (!input) throw new Error('입력 칸을 찾지 못했습니다')
  return { input, onChange }
}

describe('OtpInput', () => {
  it('숫자를 받으면 부모에게 넘긴다', () => {
    const { input, onChange } = setup('12')
    fireEvent.change(input, { target: { value: '123' } })
    expect(onChange).toHaveBeenCalledWith('123')
  })

  /**
   * ⚠️ **이것이 이 파일의 이유다.** 6칸이 다 찬 뒤 한 글자를 더 치면 잘려서 같은 값이
   *    되는데, 그때 `onChange` 가 돌면 검증 중인 로그인이 통째로 삼켜졌다.
   */
  it('⚠️ 값이 그대로면 onChange 를 부르지 않는다 — 로그인 삼킴', () => {
    const { input, onChange } = setup('123456')
    // 7번째 숫자. `slice(0, 6)` 에 잘려 `'123456'` 그대로가 된다.
    fireEvent.change(input, { target: { value: '1234567' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('⚠️ 잘린 결과가 같으면 문자도 마찬가지다', () => {
    const { input, onChange } = setup('123456')
    fireEvent.change(input, { target: { value: '123456a' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('숫자가 아닌 글자는 버린다', () => {
    const { input, onChange } = setup('12')
    fireEvent.change(input, { target: { value: '12a3' } })
    expect(onChange).toHaveBeenCalledWith('123')
  })

  // 붙여넣기도 이 한 곳을 지난다 — 「123 456」 은 `123456` 이어야 한다.
  it('붙여넣은 공백은 지우고 이어 붙인다', () => {
    const { input, onChange } = setup('')
    fireEvent.change(input, { target: { value: '123 456' } })
    expect(onChange).toHaveBeenCalledWith('123456')
  })

  it('자릿수를 넘기면 자른다', () => {
    const { input, onChange } = setup('')
    fireEvent.change(input, { target: { value: '12345678' } })
    expect(onChange).toHaveBeenCalledWith('123456')
  })

  it('지우는 것은 값이 바뀌므로 넘긴다', () => {
    const { input, onChange } = setup('123')
    fireEvent.change(input, { target: { value: '12' } })
    expect(onChange).toHaveBeenCalledWith('12')
  })

  describe('onComplete', () => {
    it('다 차는 그 입력에서 한 번 부른다', () => {
      const onComplete = vi.fn()
      const { container } = render(
        <OtpInput
          value="12345"
          onChange={vi.fn()}
          onComplete={onComplete}
          length={6}
          aria-label="인증 코드"
        />,
      )
      fireEvent.change(container.querySelector('input')!, { target: { value: '123456' } })
      expect(onComplete).toHaveBeenCalledWith('123456')
    })

    // ⚠️ 이미 다 찬 뒤 한 글자를 더 치면 값이 그대로라 **검증이 두 번 가면 안 된다.**
    it('⚠️ 이미 다 찼는데 더 치면 다시 부르지 않는다', () => {
      const onComplete = vi.fn()
      const { container } = render(
        <OtpInput
          value="123456"
          onChange={vi.fn()}
          onComplete={onComplete}
          length={6}
          aria-label="인증 코드"
        />,
      )
      fireEvent.change(container.querySelector('input')!, { target: { value: '1234567' } })
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('덜 찼으면 부르지 않는다', () => {
      const onComplete = vi.fn()
      const { container } = render(
        <OtpInput
          value="123"
          onChange={vi.fn()}
          onComplete={onComplete}
          length={6}
          aria-label="인증 코드"
        />,
      )
      fireEvent.change(container.querySelector('input')!, { target: { value: '1234' } })
      expect(onComplete).not.toHaveBeenCalled()
    })
  })
})
