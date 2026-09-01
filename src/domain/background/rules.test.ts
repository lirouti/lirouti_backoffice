/**
 * 배경 규칙 (docs/ARCHITECTURE.md §41).
 *
 * 등급과 가격이 어긋나면 **유료 배경이 상점에서 공짜로 나간다.** 등록 단계에서 막지 못하면
 * 그 뒤로는 아무도 못 잡는다.
 */
import { describe, expect, it } from 'vitest'

import {
  backgroundMeta,
  emptyBackgroundInput,
  toBackgroundInput,
  validateBackground,
} from './rules'
import type { Background, BackgroundInput } from './types'

const input = (over: Partial<BackgroundInput> = {}): BackgroundInput => ({
  assetId: 'as_bg_0',
  name: '스튜디오',
  tier: 'FREE',
  price: 0,
  ...over,
})

describe('validateBackground', () => {
  it('무료 0원 · 유료 유가는 통과한다', () => {
    expect(validateBackground(input())).toEqual({})
    expect(validateBackground(input({ tier: 'PAID', price: 900 }))).toEqual({})
  })

  it('⚠️ 유료인데 0원이면 막는다 — 상점에서 공짜로 나간다', () => {
    expect(validateBackground(input({ tier: 'PAID', price: 0 })).price).toBeTruthy()
  })

  // 무료인데 가격이 남아 있으면, 등급만 바꿔 저장했을 때 값이 따라오지 않는다.
  it('⚠️ 무료인데 가격이 있으면 막는다', () => {
    expect(validateBackground(input({ tier: 'FREE', price: 900 })).price).toBeTruthy()
  })

  // ⚠️ 309자리 이상을 붙여넣으면 `Number` 가 Infinity 가 된다. `Infinity > 0` 은 참이라
  //    아래 규칙을 그냥 통과하고 목록에 「∞ 젬」 이 찍힌다.
  it('⚠️ 숫자로 다룰 수 없는 가격은 막는다', () => {
    const huge = Number('9'.repeat(400))
    expect(Number.isFinite(huge)).toBe(false)
    expect(validateBackground(input({ tier: 'PAID', price: huge })).price).toBeTruthy()
  })

  it('⚠️ 이름과 에셋은 필수', () => {
    expect(validateBackground(input({ name: '  ' })).name).toBeTruthy()
    expect(validateBackground(input({ assetId: '' })).assetId).toBeTruthy()
  })
})

describe('emptyBackgroundInput', () => {
  // 빈 폼이 그대로 저장되면 위 규칙이 무의미하다.
  it('⚠️ 초기값은 저장할 수 없는 상태다', () => {
    expect(Object.keys(validateBackground(emptyBackgroundInput()))).not.toEqual([])
  })

  // 등급 기본값이 유료면 초기 폼이 「가격을 입력하세요」로 시작해 혼난 기분을 준다.
  it('등급 기본값은 무료라 가격은 막히지 않는다', () => {
    expect(validateBackground(emptyBackgroundInput()).price).toBeUndefined()
  })
})

describe('toBackgroundInput', () => {
  // 서버가 소유하는 값이 폼으로 새면 수정 저장 때 되쏘아 덮어쓴다.
  it('⚠️ key 는 담지 않는다', () => {
    const b: Background = { key: 7, ...input() }
    expect(toBackgroundInput(b)).toEqual(input())
  })
})

describe('backgroundMeta', () => {
  // 원본은 `i < 16` 이라는 **순서**로 정했다. 등록으로 무료가 하나 늘면 그대로 어긋난다.
  it('⚠️ 순서가 아니라 등급에서 끌어온다', () => {
    expect(backgroundMeta({ tier: 'FREE' })).toBe('무료 해금')
    expect(backgroundMeta({ tier: 'PAID' })).toBe('유료 · 시즌')
  })
})
