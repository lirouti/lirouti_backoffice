/**
 * 추이 축. **폭이 0 인 경우**가 핵심이다 — 새로 만든 아이템은 8주 내내 값이 같다.
 */
import { describe, expect, it } from 'vitest'

import { trendAxis } from './trend'

describe('trendAxis', () => {
  it('값을 담고 위아래로 여유를 둔다', () => {
    const { domain } = trendAxis([30, 40, 50])
    expect(domain[0]).toBeLessThan(30)
    expect(domain[1]).toBeGreaterThan(50)
  })

  it('⚠️ 전부 같은 값이어도 납작해지지 않는다', () => {
    const { domain } = trendAxis([37, 37, 37, 37])
    expect(domain[1] - domain[0]).toBeGreaterThanOrEqual(10)
    expect(domain[0]).toBeLessThan(37)
    expect(domain[1]).toBeGreaterThan(37)
  })

  it('보유율이라 0~100 밖으로 안 나간다', () => {
    expect(trendAxis([1, 2]).domain[0]).toBe(0)
    expect(trendAxis([98, 99, 100]).domain[1]).toBe(100)
  })

  it('한 점만 있어도 축이 선다', () => {
    const { domain, ticks } = trendAxis([50])
    expect(domain[0]).toBeLessThan(50)
    expect(domain[1]).toBeGreaterThan(50)
    expect(ticks.length).toBeGreaterThanOrEqual(2)
  })

  it('값이 없으면 0~100', () => {
    expect(trendAxis([])).toEqual({ domain: [0, 100], ticks: [0, 50, 100] })
  })

  it('눈금은 오름차순이고 범위 안에 있다', () => {
    for (const vs of [[10, 90], [37, 37], [0, 100], [5], [60, 61, 62]]) {
      const { domain, ticks } = trendAxis(vs)
      expect(ticks).toEqual([...ticks].sort((a, b) => a - b))
      expect(ticks[0]).toBe(domain[0])
      expect(ticks.at(-1)).toBe(domain[1])
    }
  })
})
