import { describe, expect, it } from 'vitest'

import { emptyItemInput, toItemInput, topSelling, validateItem } from './rules'
import type { Item, ItemInput } from './types'

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

describe('validateItem', () => {
  const ok = (): ItemInput => ({ ...emptyItemInput(), name: '성좌의 로브', assetId: 'as_body_0' })

  it('다 채우면 오류가 없다', () => {
    expect(validateItem(ok())).toEqual({})
  })

  it('⚠️ 에셋은 필수 — 없으면 목록에서 `?` 로 뜬다', () => {
    expect(validateItem({ ...ok(), assetId: '' }).assetId).toBeTruthy()
    expect(emptyItemInput().assetId).toBe('')
  })

  it('이름은 필수 — 공백만 있는 것도 빈 것이다', () => {
    expect(validateItem({ ...ok(), name: '' }).name).toBeTruthy()
    expect(validateItem({ ...ok(), name: '   ' }).name).toBeTruthy()
  })

  it('⚠️ 유료인데 0원이면 막는다 — 상점에서 공짜로 나간다', () => {
    expect(validateItem({ ...ok(), tier: 'PAID', price: 0 }).price).toBeTruthy()
    expect(validateItem({ ...ok(), tier: 'PAID', price: 720 }).price).toBeUndefined()
  })

  it('무료인데 가격이 붙어 있으면 막는다', () => {
    expect(validateItem({ ...ok(), tier: 'FREE', price: 720 }).price).toBeTruthy()
  })

  it('노출 종료가 시작보다 빠르면 막는다', () => {
    expect(validateItem({ ...ok(), visibleFrom: '2026-09-01', visibleTo: '2026-08-01' }).visibleTo).toBeTruthy()
    expect(validateItem({ ...ok(), visibleFrom: '2026-08-01', visibleTo: '2026-09-01' }).visibleTo).toBeUndefined()
  })

  it('한쪽만 비어 있으면 기간 검사를 하지 않는다 — 빈 값은 "제한 없음" 이다', () => {
    expect(validateItem({ ...ok(), visibleFrom: '2026-09-01', visibleTo: '' }).visibleTo).toBeUndefined()
    expect(validateItem({ ...ok(), visibleFrom: '', visibleTo: '2026-01-01' }).visibleTo).toBeUndefined()
  })
})

describe('toItemInput', () => {
  it('서버가 소유한 필드는 떼어낸다', () => {
    const item = { ...emptyItemInput(), key: 3, code: 'IT-1004', sold: 10, own: 5, status: 'VISIBLE', madeAt: '2026-01-01' } as never
    expect(Object.keys(toItemInput(item)).sort()).toEqual(Object.keys(emptyItemInput()).sort())
  })
})
