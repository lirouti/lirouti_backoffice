/**
 * ⚠️ **이 파일이 고정하는 것은 「이어 붙이지 않는다」 하나다.**
 *
 * 예전 코드(`replace(/\D/g, '')`)는 여기 시험 대부분을 통과한다 — 다른 것은 답이 같기
 * 때문이다. 실제로 갈리는 것은 `1.5` 와 `-1` 뿐이고, **그 둘이 이 함수의 존재 이유다**
 * (docs/ARCHITECTURE.md §59.6).
 */
import { describe, expect, it } from 'vitest'

import { parseCount } from './parseCount'

describe('parseCount', () => {
  it('숫자는 그대로 읽는다', () => {
    expect(parseCount('9000')).toBe(9000)
    expect(parseCount('0')).toBe(0)
  })

  it('빈 칸은 0', () => {
    expect(parseCount('')).toBe(0)
  })

  // ⚠️ 예전 코드는 `15` 를 돌려줬다 — 오타가 **열 배 값**이 되어 저장된다.
  it('⚠️ 소수점에서 자른다 — 1.5 는 1 이지 15 가 아니다', () => {
    expect(parseCount('1.5')).toBe(1)
    expect(parseCount('19.99')).toBe(19)
    expect(parseCount('0.5')).toBe(0)
  })

  // ⚠️ 예전 코드는 `1` 을 돌려줬다 — 음수가 양수로 둔갑한다.
  it('⚠️ 부호는 안 받는다 — -1 은 0 이다', () => {
    expect(parseCount('-1')).toBe(0)
    expect(parseCount('-9000')).toBe(0)
    expect(parseCount('+5')).toBe(0)
  })

  // 표에서 「1,000」 을 복사해 붙여 넣는 경로가 있다.
  it('자릿수 쉼표와 공백은 지운다', () => {
    expect(parseCount('1,000')).toBe(1000)
    expect(parseCount(' 89 000 ')).toBe(89000)
  })

  it('글자가 섞이면 앞의 자릿수까지만', () => {
    expect(parseCount('12개')).toBe(12)
    expect(parseCount('abc')).toBe(0)
    expect(parseCount('e5')).toBe(0)
  })

  // 지수 표기가 살아남으면 `1e3` 이 1000 이 된다 — 칸에 그럴 뜻으로 치는 사람은 없다.
  it('⚠️ 지수 표기를 숫자로 읽지 않는다', () => {
    expect(parseCount('1e3')).toBe(1)
  })
})
