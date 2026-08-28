/** 페이지 번호 계산. 경계(첫 장·끝 장·생략)와 **길이 불변**이 전부다. */
import { describe, expect, it } from 'vitest'

import { pageCount, pageWindow, slotCount } from './pagination'

describe('pageWindow', () => {
  it('칸 수에 다 들어오면 전부 펼친다', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
    // span 이 넓어지면 칸 수도 함께 늘어난다 (2*span+5)
    expect(pageWindow(5, 9, 2)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('모양은 셋뿐 — 앞에 붙음 · 가운데 · 뒤에 붙음', () => {
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20])
    expect(pageWindow(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20])
    expect(pageWindow(19, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20])
  })

  it('첫 장과 끝 장은 항상 있다 — 200 페이지에서 1 로 돌아갈 길이 없으면 안 된다', () => {
    for (const c of [1, 2, 57, 100, 199, 200]) {
      const w = pageWindow(c, 200)
      expect(w[0]).toBe(1)
      expect(w.at(-1)).toBe(200)
    }
  })

  it('⚠️ 길이가 변하지 않는다 — 변하면 바 전체가 가로로 밀린다', () => {
    for (const span of [1, 2, 3]) {
      const n = slotCount(span)
      for (const total of [n + 1, n + 5, 20, 200]) {
        const lengths = new Set(
          Array.from({ length: total }, (_, i) => pageWindow(i + 1, total, span).length),
        )
        expect(lengths).toEqual(new Set([n]))
      }
    }
  })

  it('양끝 몇 장은 아예 같은 목록이라 연달아 눌러도 번호가 안 움직인다', () => {
    const head = pageWindow(1, 20)
    for (const c of [2, 3, 4]) expect(pageWindow(c, 20)).toEqual(head)
    const tail = pageWindow(20, 20)
    for (const c of [17, 18, 19]) expect(pageWindow(c, 20)).toEqual(tail)
  })

  it('`…` 가 한 장만 감추는 일은 없다 — 그럴 바엔 그 번호를 보여준다', () => {
    for (let total = 8; total <= 60; total += 1) {
      for (let c = 1; c <= total; c += 1) {
        const w = pageWindow(c, total)
        w.forEach((p, i) => {
          if (p !== 'gap') return
          const before = w[i - 1]
          const after = w[i + 1]
          expect(typeof before === 'number' && typeof after === 'number' && after - before).toBeGreaterThan(2)
        })
      }
    }
  })

  it('범위를 벗어난 current 는 안쪽으로 당긴다', () => {
    expect(pageWindow(0, 20)).toEqual(pageWindow(1, 20))
    expect(pageWindow(99, 20)).toEqual(pageWindow(20, 20))
  })

  it('한 장뿐이면 중복 없이 한 번만', () => {
    expect(pageWindow(1, 1)).toEqual([1])
  })

  it('페이지가 없으면 빈 배열', () => {
    expect(pageWindow(1, 0)).toEqual([])
    expect(pageWindow(1, -3)).toEqual([])
  })

  it('번호는 오름차순이고 같은 번호가 두 번 나오지 않으며 현재 페이지를 포함한다', () => {
    for (let total = 1; total <= 40; total += 1) {
      for (let c = 1; c <= total; c += 1) {
        const nums = pageWindow(c, total).filter((p): p is number => p !== 'gap')
        expect(nums).toEqual([...new Set(nums)])
        expect(nums).toEqual([...nums].sort((a, b) => a - b))
        expect(nums).toContain(c)
      }
    }
  })
})

describe('slotCount', () => {
  it('span 양옆 + 생략 둘 + 첫 장·끝 장', () => {
    expect(slotCount(1)).toBe(7)
    expect(slotCount(2)).toBe(9)
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
