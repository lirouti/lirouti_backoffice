import { describe, expect, it } from 'vitest'

import { rng } from './rng'

/**
 * 목 데이터는 **결정적**이어야 한다. 새로고침마다 숫자가 튀면 디자인 대조도
 * 스크린샷 비교도 불가능해진다.
 */
describe('rng', () => {
  it('같은 시드는 같은 수열을 준다', () => {
    const a = Array.from({ length: 5 }, rng(7))
    const b = Array.from({ length: 5 }, rng(7))
    expect(a).toEqual(b)
  })

  it('다른 시드는 다른 수열을 준다', () => {
    expect(Array.from({ length: 5 }, rng(7))).not.toEqual(Array.from({ length: 5 }, rng(8)))
  })

  /**
   * JS 의 `%` 는 피연산자 부호를 따라간다. 정규화하지 않으면 음수 시드에서 음수가
   * 나오고, `Math.floor(next() * len)` 이 **음수 인덱스**가 되어 목 데이터가 조용히
   * 깨진다. 화면에는 `undefined` 로만 드러난다.
   */
  it('시드가 음수여도 [0, 1) 을 벗어나지 않는다', () => {
    for (const seed of [-1, -100, -233280, -999999]) {
      const next = rng(seed)
      for (let i = 0; i < 50; i++) {
        const v = next()
        expect(v, `seed=${seed}`).toBeGreaterThanOrEqual(0)
        expect(v, `seed=${seed}`).toBeLessThan(1)
      }
    }
  })

  it('양수 시드의 결과는 정규화 전후가 같다 — 목 데이터가 바뀌면 안 된다', () => {
    // `(x % M + M) % M` 은 양수에서 항등이다. 이 성질이 깨지면 기존 목이 전부 바뀐다.
    const next = rng(7)
    expect([next(), next(), next()]).toEqual([
      0.560789609053498, 0.11547496570644719, 0.24397719478737998,
    ])
  })
})
