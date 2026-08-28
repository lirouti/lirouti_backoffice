import { describe, expect, it } from 'vitest'

import { topSelling } from './rules'
import type { Item } from './types'

const item = (key: number, sold: number): Item =>
  ({ key, sold, code: `IT-${key}`, name: `아이템 ${key}` }) as Item

const items = [item(1, 10), item(2, 50), item(3, 30)]

describe('topSelling', () => {
  it('판매량 내림차순 상위 N개', () => {
    expect(topSelling(items, 2).map((i) => i.key)).toEqual([2, 3])
  })

  it('원본 배열을 건드리지 않는다', () => {
    const before = items.map((i) => i.key)
    topSelling(items, 2)
    expect(items.map((i) => i.key)).toEqual(before)
  })

  /**
   * `slice(0, -1)` 은 **마지막만 빠진 전체 목록**을 준다 — "상위 N개" 계약과 정반대다.
   * 지금 호출부는 리터럴을 넘기지만, 목록 화면의 페이지 크기가 URL 에서 오면 닿는다.
   */
  it('음수 N 은 0 으로 다룬다', () => {
    expect(topSelling(items, -1)).toEqual([])
    expect(topSelling(items, 0)).toEqual([])
  })

  it('N 이 개수보다 크면 전부', () => {
    expect(topSelling(items, 99)).toHaveLength(3)
  })
})
