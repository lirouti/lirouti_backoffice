/**
 * 색 문자열 형식.
 *
 * `domain/` 이 아니라 여기 있는 이유는 **리루티를 몰라도 말이 되기 때문**이다
 * (docs/ARCHITECTURE.md §4.4 의 `format.ts` 와 같은 기준).
 */

/**
 * `#RRGGBB` 인가.
 *
 * 세 자리 축약(`#abc`)은 **일부러 막는다** — 넓히면 같은 색이 두 표기로 저장돼서
 * 문자열 비교가 어긋난다.
 *
 * ⚠️ **같은 정규식이 두 곳에 복사돼 있었다** — 캐릭터 종의 대표 색(`HEX`)과 이벤트
 *    강조색(`isEventAccent`). 규칙이 하나인데 정의가 둘이면 한쪽만 고쳐지고 조용히 갈린다.
 */
export const isHexColor = (value: string): boolean => /^#[0-9a-fA-F]{6}$/.test(value)
