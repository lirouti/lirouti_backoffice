/**
 * 에셋 규격 검사 (docs/ARCHITECTURE.md §8).
 *
 * 여기서 막지 못한 파일은 **미리보기가 깨진 채로 저장된다** — 목록에서 `?` 로 뜨는
 * 아이템이 그렇게 생긴다.
 */
import { describe, expect, it } from 'vitest'

import {
  acceptAttr,
  assetHint,
  ASSET_SPECS,
  kindOfSlot,
  validateAssetFile,
  type AssetFileInfo,
} from './asset'

const file = (over: Partial<AssetFileInfo> = {}): AssetFileInfo => ({
  name: '왕관.svg',
  type: 'image/svg+xml',
  size: 12_000,
  ...over,
})

describe('validateAssetFile', () => {
  const head = ASSET_SPECS.head

  it('허용 형식 + 크기 안이면 통과', () => {
    expect(validateAssetFile(file(), head)).toBeNull()
  })

  it('허용하지 않는 형식은 막는다', () => {
    expect(validateAssetFile(file({ name: 'a.gif', type: 'image/gif' }), head)).toMatch(/SVG · PNG/)
  })

  // 브라우저·OS 에 따라 `File.type` 이 빈 문자열로 온다. 그때 확장자로 짐작하지 않으면
  // 정상 SVG 가 거부된다.
  it('⚠️ MIME 이 비어 있으면 확장자로 짐작한다', () => {
    expect(validateAssetFile(file({ type: '' }), head)).toBeNull()
    expect(validateAssetFile(file({ name: 'a.PNG', type: '' }), head)).toBeNull()
  })

  it('확장자도 MIME 도 없으면 막는다', () => {
    expect(validateAssetFile(file({ name: '왕관', type: '' }), head)).toMatch(/SVG · PNG/)
  })

  it('크기를 넘으면 막고, 한도와 실제 크기를 함께 알려 준다', () => {
    const msg = validateAssetFile(file({ size: head.maxBytes + 1 }), head)
    expect(msg).toContain('512KB 이하')
    // 반올림하면 「512KB 이하만… (512KB)」 가 되어 말이 안 된다. 넘긴 쪽은 올린다.
    expect(msg).toContain('(513KB)')
  })

  it('한도와 정확히 같으면 통과 — 경계는 포함이다', () => {
    expect(validateAssetFile(file({ size: head.maxBytes }), head)).toBeNull()
  })

  // 0바이트는 형식·크기 검사를 모두 통과하지만 그리면 아무것도 안 나온다.
  it('⚠️ 빈 파일은 막는다', () => {
    expect(validateAssetFile(file({ size: 0 }), head)).toBe('빈 파일입니다.')
  })

  it('종류마다 한도가 다르다 — 의상은 막히는 크기가 배경은 통과한다', () => {
    const big = file({ size: 1024 * 1024 })
    expect(validateAssetFile(big, ASSET_SPECS.head)).not.toBeNull()
    expect(validateAssetFile(big, ASSET_SPECS.bg)).toBeNull()
  })
})

describe('kindOfSlot', () => {
  it('슬롯이 곧 종류다', () => {
    expect(kindOfSlot('HEAD')).toBe('head')
    expect(kindOfSlot('FACE')).toBe('face')
  })

  it('네 슬롯 모두 규격이 있다', () => {
    for (const slot of ['HEAD', 'BODY', 'HAND', 'FACE'] as const) {
      expect(ASSET_SPECS[kindOfSlot(slot)]).toBeDefined()
    }
  })
})

describe('안내 문구', () => {
  it('accept 는 input 에 그대로 넣을 수 있는 모양', () => {
    expect(acceptAttr(ASSET_SPECS.head)).toBe('image/svg+xml,image/png')
  })

  it('힌트는 형식 · 비율 · 한도를 말한다', () => {
    expect(assetHint(ASSET_SPECS.head)).toBe('SVG · PNG · 341:491 · 512KB 이하')
    expect(assetHint(ASSET_SPECS.ach)).toBe('SVG · PNG · 200:200 · 256KB 이하')
  })

  // 2048KB 를 「2048KB」 로 쓰면 한도가 큰지 작은지 감이 안 온다.
  it('1MB 를 넘으면 MB 로 쓴다', () => {
    expect(assetHint(ASSET_SPECS.bg)).toContain('2MB 이하')
  })
})
