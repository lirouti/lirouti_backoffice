/** 지급·회수 화면 query가 주소의 입력을 그대로 신뢰하지 않는지 확인한다. */
import { describe, expect, it } from 'vitest'

import { grantWhoFrom } from './query'

describe('grantWhoFrom', () => {
  it('회원 상세에서 넘긴 UID를 폼 값으로 읽는다', () => {
    expect(grantWhoFrom(new URLSearchParams('who=U-10240'))).toBe('U-10240')
  })

  it('공백·소문자·중복을 기존 회원 ID 규칙으로 정규화한다', () => {
    expect(grantWhoFrom(new URLSearchParams('who=u-10240%2C+U-10240%0Au-10253'))).toBe(
      'U-10240, U-10253',
    )
  })

  it('값이 없으면 빈 폼을 유지한다', () => {
    expect(grantWhoFrom(new URLSearchParams())).toBe('')
  })
})
