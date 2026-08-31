/**
 * 한글 초성 (docs/ARCHITECTURE.md §36.2).
 *
 * 여기가 틀리면 **팔레트가 아무것도 못 찾는다** — 조용히 빈 목록이 나오고, 쓰는 사람은
 * 「이 검색은 안 되는구나」 로 배운다.
 */
import { describe, expect, it } from 'vitest'

import { chosung, isChosungQuery, squash } from './hangul'

describe('chosung', () => {
  it('음절을 초성으로 바꾼다', () => {
    expect(chosung('감사 로그')).toBe('ㄱㅅ ㄹㄱ')
    expect(chosung('회원 목록')).toBe('ㅎㅇ ㅁㄹ')
  })

  // 초성 검색은 덧붙이는 길이지 대체하는 길이 아니다.
  it('⚠️ 한글이 아닌 글자는 그대로 둔다', () => {
    expect(chosung('FAQ 편집')).toBe('FAQ ㅍㅈ')
    expect(chosung('1:1 문의')).toBe('1:1 ㅁㅇ')
  })

  // 종성이 있는 글자와 없는 글자가 같은 초성을 가져야 한다.
  it('⚠️ 받침이 있어도 초성은 같다', () => {
    expect(chosung('가')).toBe('ㄱ')
    expect(chosung('각')).toBe('ㄱ')
    expect(chosung('갛')).toBe('ㄱ')
  })

  it('쌍자음 초성도 낸다', () => {
    expect(chosung('까치')).toBe('ㄲㅊ')
    expect(chosung('빵')).toBe('ㅃ')
  })

  // 영역의 양 끝이 어긋나면 첫 글자나 마지막 글자에서만 틀린다.
  it('⚠️ 한글 영역의 처음과 끝', () => {
    expect(chosung('가')).toBe('ㄱ')
    expect(chosung('힣')).toBe('ㅎ')
  })

  it('빈 문자열은 빈 문자열', () => {
    expect(chosung('')).toBe('')
  })
})

describe('isChosungQuery', () => {
  it('자음만이면 초성 검색이다', () => {
    expect(isChosungQuery('ㄱㅅ')).toBe(true)
    expect(isChosungQuery('ㅎ')).toBe(true)
  })

  // 「감사」 까지 치고 나면 초성으로 볼 이유가 없다.
  it('⚠️ 음절이나 모음이 섞이면 아니다', () => {
    expect(isChosungQuery('감사')).toBe(false)
    expect(isChosungQuery('ㄱ사')).toBe(false)
    expect(isChosungQuery('ㅏ')).toBe(false)
    expect(isChosungQuery('faq')).toBe(false)
  })

  it('빈 문자열은 아니다', () => {
    expect(isChosungQuery('')).toBe(false)
  })
})

describe('squash', () => {
  it('공백을 지우고 소문자로', () => {
    expect(squash('아이템 목록')).toBe('아이템목록')
    expect(squash(' FAQ 편집 ')).toBe('faq편집')
  })
})
