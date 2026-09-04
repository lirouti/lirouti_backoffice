/**
 * 색 형식 검사.
 *
 * 캐릭터 종의 대표 색과 이벤트 강조색이 **같은 정규식을 따로** 들고 있던 것을 하나로
 * 모으면서 옮겨 온 테스트다 (docs/ARCHITECTURE.md §53).
 */
import { describe, expect, it } from 'vitest'

import { isHexColor } from './color'

describe('isHexColor', () => {
  it('#RRGGBB 만 받는다 — 대소문자는 가리지 않는다', () => {
    expect(isHexColor('#2F7CEF')).toBe(true)
    expect(isHexColor('#2f7cef')).toBe(true)
    expect(isHexColor('#2f7CEF')).toBe(true)
  })

  // 넓히면 같은 색이 두 표기로 저장돼 문자열 비교가 어긋난다.
  it('세 자리 축약은 막는다', () => {
    expect(isHexColor('#abc')).toBe(false)
  })

  it('# 이 없거나 자릿수가 다르면 아니다', () => {
    expect(isHexColor('2F7CEF')).toBe(false)
    expect(isHexColor('#2F7CE')).toBe(false)
    expect(isHexColor('#2F7CEFF')).toBe(false)
    expect(isHexColor('')).toBe(false)
  })

  // 붙여넣기로 딸려 오는 자리다 — `$` 만 쓰면 정규식이 줄바꿈을 통과시킨다.
  it('앞뒤에 공백·줄바꿈이 붙으면 아니다', () => {
    expect(isHexColor('#2F7CEF\n')).toBe(false)
    expect(isHexColor(' #2F7CEF')).toBe(false)
  })

  it('16진수가 아닌 글자는 아니다', () => {
    expect(isHexColor('#GGGGGG')).toBe(false)
  })
})
