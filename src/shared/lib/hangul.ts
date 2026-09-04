/**
 * 한글 초성 — 「ㄱㅅㄹㄱ」 로 「감사 로그」 를 찾기 위한 것.
 *
 * 한국어 어드민에서 초성 검색은 장식이 아니다. 화면이 48개고 이름이 대부분 두세 글자라,
 * 「감사」 를 다 치는 것과 「ㄱㅅ」 을 치는 것의 차이가 곧 팔레트를 쓰느냐 마느냐가 된다.
 */

/** 유니코드 한글 음절 영역. `가`(U+AC00) 부터 `힣`(U+D7A3) 까지 */
const BASE = 0xac00
const LAST = 0xd7a3
/** 한 초성이 덮는 음절 수 = 중성 21 × 종성 28 */
const PER_CHO = 21 * 28

const CHO = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]

/**
 * 음절은 초성으로, 나머지는 그대로.
 *
 * ⚠️ **한글이 아닌 글자를 버리지 않는다.** 「FAQ 편집」 을 `ㅍㅈ` 으로만 만들면 `FAQ` 로는
 *    못 찾는다 — 초성 검색은 **덧붙이는 길**이지 대체하는 길이 아니다.
 */
export function chosung(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    out += code >= BASE && code <= LAST ? CHO[Math.floor((code - BASE) / PER_CHO)]! : ch
  }
  return out
}

/**
 * 자음만으로 이루어진 검색어인가 — 초성으로 찾으려는 뜻인가.
 *
 * ⚠️ **모음이 섞이면 초성 검색이 아니다.** 「가」 를 치는 중에 `ㄱ` 이 잠깐 보이는 건
 *    IME 조합 과정이고, 「감사」 까지 치고 나면 초성으로 볼 이유가 없다.
 */
export const isChosungQuery = (q: string): boolean => q !== '' && /^[ㄱ-ㅎ]+$/.test(q)

/** 공백을 지운 소문자. 「아이템목록」 으로도 「아이템 목록」 을 찾게 한다 */
export const squash = (text: string): string => text.replace(/\s+/g, '').toLowerCase()
