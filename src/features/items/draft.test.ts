/**
 * 초안 읽기. **남이 고친 값**이 전부다 — `sessionStorage` 는 손으로 열 수 있고,
 * 우리가 타입을 바꾸면 예전 초안이 그대로 남아 있다.
 */
import { describe, expect, it } from 'vitest'

import { emptyItemInput } from '@/domain/item'

import { draftKey, readDraft, writeDraft } from './draft'

const ok = { ...emptyItemInput(), name: '성좌의 로브', price: 0 }

describe('draftKey', () => {
  it('화면마다 다른 칸을 쓴다', () => {
    expect(draftKey('new')).not.toBe(draftKey('3'))
    expect(draftKey('new')).toContain('new')
  })
})

describe('readDraft', () => {
  it('쓴 것을 그대로 돌려준다', () => {
    expect(readDraft(writeDraft(ok))).toEqual(ok)
  })

  it('없거나 JSON 이 아니면 null', () => {
    expect(readDraft(null)).toBeNull()
    expect(readDraft('')).toBeNull()
    expect(readDraft('{')).toBeNull()
    expect(readDraft('"문자열"')).toBeNull()
    expect(readDraft('null')).toBeNull()
  })

  it('⚠️ 칸이 빠지면 버린다 — 그대로 폼에 넣으면 undefined 인 채로 저장된다', () => {
    for (const missing of ['name', 'slot', 'tier', 'price', 'flags', 'visibleFrom']) {
      const broken = { ...ok } as Record<string, unknown>
      delete broken[missing]
      expect(readDraft(JSON.stringify(broken))).toBeNull()
    }
  })

  it('모르는 값이 들어 있으면 버린다', () => {
    expect(readDraft(JSON.stringify({ ...ok, slot: 'WING' }))).toBeNull()
    expect(readDraft(JSON.stringify({ ...ok, tier: 'LEGENDARY' }))).toBeNull()
  })

  it('타입이 다르면 버린다', () => {
    expect(readDraft(JSON.stringify({ ...ok, price: '720' }))).toBeNull()
    expect(readDraft(JSON.stringify({ ...ok, price: Number.NaN }))).toBeNull()
    expect(readDraft(JSON.stringify({ ...ok, name: 123 }))).toBeNull()
    expect(readDraft(JSON.stringify({ ...ok, flags: { shop: 'yes', gacha: false, gift: true } }))).toBeNull()
  })
})
