/** 페이지 번호 계산. 경계(첫 장·끝 장·생략)가 전부다. */
import { describe, expect, it } from 'vitest'

import { pageCount, pageWindow } from './pagination'

describe('pageWindow', () => {
  it('최대 너비 안에 들어오면 다 펼친다 — 접어도 자리를 못 줄인다', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    // span 이 넓어지면 경계도 함께 밀린다 (2*span+5)
    expect(pageWindow(5, 9, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('첫 장과 끝 장은 항상 있다 — 200 페이지에서 1 로 돌아갈 길이 없으면 안 된다', () => {
    const w = pageWindow(100, 200)
    expect(w[0]).toBe(1)
    expect(w.at(-1)).toBe(200)
    expect(w).toEqual([1, 'gap', 99, 100, 101, 'gap', 200])
  })

  it('양끝에 붙으면 그쪽 생략이 사라진다', () => {
    expect(pageWindow(1, 200)).toEqual([1, 2, 'gap', 200])
    expect(pageWindow(200, 200)).toEqual([1, 'gap', 199, 200])
  })

  it('한 장만 건너뛰는 자리는 `…` 대신 그 번호', () => {
    // 1 … 3 4 5 … 8 이 아니라 1 2 3 4 5 … 8 — `…` 하나가 3 을 감출 이유가 없다
    expect(pageWindow(4, 8)).toEqual([1, 2, 3, 4, 5, 'gap', 8])
  })

  it('두 장 이상 건너뛰면 `…`', () => {
    expect(pageWindow(5, 9)).toEqual([1, 'gap', 4, 5, 6, 'gap', 9])
  })

  it('span 을 넓히면 양옆이 더 펼쳐진다', () => {
    expect(pageWindow(10, 20, 2)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 20])
  })

  it('범위를 벗어난 current 는 안쪽으로 당긴다', () => {
    expect(pageWindow(0, 5)).toEqual(pageWindow(1, 5))
    expect(pageWindow(99, 5)).toEqual(pageWindow(5, 5))
  })

  it('한 장뿐이면 중복 없이 한 번만', () => {
    expect(pageWindow(1, 1)).toEqual([1])
  })

  it('페이지가 없으면 빈 배열', () => {
    expect(pageWindow(1, 0)).toEqual([])
    expect(pageWindow(1, -3)).toEqual([])
  })

  it('번호는 오름차순이고 같은 번호가 두 번 나오지 않는다', () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let cur = 1; cur <= total; cur += 1) {
        const nums = pageWindow(cur, total).filter((p): p is number => p !== 'gap')
        expect(nums).toEqual([...new Set(nums)])
        expect(nums).toEqual([...nums].sort((a, b) => a - b))
        expect(nums).toContain(cur)
      }
    }
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
