/** 페이지 계산. 마지막 쪽의 나머지와 범위 밖 입력이 전부다. */
import { describe, expect, it } from 'vitest'

import { clampPage, pageCount, pageRange } from './pagination'

describe('clampPage', () => {
  it('1 이상 totalPages 이하의 정수로 만든다', () => {
    expect(clampPage(0, 20)).toBe(1)
    expect(clampPage(99, 20)).toBe(20)
    expect(clampPage(2.9, 20)).toBe(2)
    expect(clampPage(NaN, 20)).toBe(1)
  })

  it('URL 파라미터처럼 문자열로 와도 받는다 — 3쪽을 보려는데 1쪽이 뜨면 안 된다', () => {
    expect(clampPage('3' as unknown as number, 20)).toBe(3)
    expect(clampPage('' as unknown as number, 20)).toBe(1)
    expect(clampPage('abc' as unknown as number, 20)).toBe(1)
  })

  it('totalPages 가 0 이어도 1 아래로 내려가지 않는다', () => {
    expect(clampPage(5, 0)).toBe(1)
  })
})

describe('pageCount', () => {
  it('나머지가 있으면 한 장 더', () => {
    expect(pageCount(31, 10)).toBe(4)
    expect(pageCount(30, 10)).toBe(3)
  })

  it('0건이면 0 — 빈 목록에는 페이지 바가 없다', () => {
    expect(pageCount(0, 10)).toBe(0)
  })

  it('perPage 가 0 이하면 0 (나누지 않는다)', () => {
    expect(pageCount(50, 0)).toBe(0)
    expect(pageCount(50, -1)).toBe(0)
  })
})

describe('pageRange', () => {
  it('첫 쪽은 1부터', () => {
    expect(pageRange(1, 20, 384)).toEqual({ from: 1, to: 20 })
  })

  it('가운데 쪽', () => {
    expect(pageRange(4, 20, 384)).toEqual({ from: 61, to: 80 })
  })

  it('마지막 쪽은 짧아진다 — 없는 건수를 있다고 말하면 안 된다', () => {
    expect(pageRange(20, 20, 384)).toEqual({ from: 381, to: 384 })
  })

  it('딱 나누어떨어지면 마지막 쪽도 가득 찬다', () => {
    expect(pageRange(3, 10, 30)).toEqual({ from: 21, to: 30 })
  })

  it('한 쪽에 다 들어오면 전부', () => {
    expect(pageRange(1, 20, 7)).toEqual({ from: 1, to: 7 })
  })

  it('범위를 벗어난 page 는 안쪽으로 당긴다', () => {
    expect(pageRange(0, 20, 384)).toEqual(pageRange(1, 20, 384))
    expect(pageRange(99, 20, 384)).toEqual(pageRange(20, 20, 384))
  })

  it('소수 쪽은 잘라 쓴다 — 2.5쪽이 31–50 이 되면 안 된다', () => {
    expect(pageRange(2.5, 20, 384)).toEqual(pageRange(2, 20, 384))
    expect(pageRange(2.9, 20, 384)).toEqual({ from: 21, to: 40 })
  })

  it('셀 수 없는 값은 첫 쪽으로', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(pageRange(bad, 20, 384)).toEqual({ from: 1, to: 20 })
    }
  })

  it('perPage 가 소수여도 구간이 정수로 나온다', () => {
    const r = pageRange(2, 7.5, 384)!
    expect(Number.isInteger(r.from) && Number.isInteger(r.to)).toBe(true)
    expect(r).toEqual({ from: 8, to: 14 })
  })

  it('보여줄 것이 없으면 null', () => {
    expect(pageRange(1, 20, 0)).toBeNull()
    expect(pageRange(1, 0, 384)).toBeNull()
  })

  it('구간이 빈틈없이 이어지고 마지막이 총 건수와 맞는다', () => {
    for (const [total, per] of [
      [384, 20],
      [30, 10],
      [7, 20],
      [101, 25],
    ] as const) {
      const pages = pageCount(total, per)
      let expected = 1
      for (let p = 1; p <= pages; p += 1) {
        const r = pageRange(p, per, total)!
        expect(r.from).toBe(expected)
        expect(r.to).toBeGreaterThanOrEqual(r.from)
        expected = r.to + 1
      }
      expect(expected - 1).toBe(total)
    }
  })
})
