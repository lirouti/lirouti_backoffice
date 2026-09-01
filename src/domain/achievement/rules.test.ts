/**
 * 업적 규칙 (docs/ARCHITECTURE.md §40).
 *
 * 검증이 느슨하면 **달성될 수 없는 업적**이나 `?` 타일이 목록에 들어앉는다. 등록 단계에서
 * 막지 못하면 그 뒤로는 아무도 못 잡는다.
 */
import { describe, expect, it } from 'vitest'

import { emptyAchievementInput, toAchievementInput, validateAchievement } from './rules'
import type { Achievement, AchievementInput } from './types'

const input = (over: Partial<AchievementInput> = {}): AchievementInput => ({
  assetId: 'as_ach_0',
  name: '첫 알',
  sub: '금속 메달 · 월계관',
  cond: '계정 생성',
  reward: '젬 50',
  ...over,
})

describe('validateAchievement', () => {
  it('다 채우면 통과한다', () => {
    expect(validateAchievement(input())).toEqual({})
  })

  // 「수집함에서 형태만으로 구분됩니다」 가 이 화면의 전제다. 그림이 없으면 전제가 깨진다.
  it('⚠️ 에셋은 필수', () => {
    expect(validateAchievement(input({ assetId: '' })).assetId).toBeTruthy()
  })

  // 조건이 없으면 등록은 되는데 아무도 못 따는 업적이 생긴다.
  it('⚠️ 달성 조건은 필수', () => {
    expect(validateAchievement(input({ cond: '' })).cond).toBeTruthy()
  })

  // 빈 칸이 "보상 없음" 이 아니라 "아직 안 정함" 으로 읽힌다.
  it('⚠️ 보상은 필수', () => {
    expect(validateAchievement(input({ reward: '' })).reward).toBeTruthy()
  })

  // 공백만 넣어 검증을 우회할 수 있으면 필수가 아니다.
  it('⚠️ 공백만 있는 것은 빈 것이다', () => {
    const errors = validateAchievement(input({ name: '  ', cond: ' ', reward: '\t' }))
    expect(Object.keys(errors).sort()).toEqual(['cond', 'name', 'reward'])
  })

  // 조형 설명은 카드에 붙을 뿐이라 없어도 화면이 성립한다 (아이템의 `sub` 와 같다).
  it('조형 설명은 필수가 아니다', () => {
    expect(validateAchievement(input({ sub: '' }))).toEqual({})
  })
})

describe('emptyAchievementInput', () => {
  // 빈 폼이 그대로 저장되면 위 규칙이 무의미하다.
  it('⚠️ 초기값은 저장할 수 없는 상태다', () => {
    expect(Object.keys(validateAchievement(emptyAchievementInput()))).not.toEqual([])
  })
})

describe('toAchievementInput', () => {
  // 서버가 소유하는 값이 폼으로 새면 수정 저장 때 되쏘아 덮어쓴다.
  it('⚠️ key · earned · rate 는 담지 않는다', () => {
    const a: Achievement = { key: 3, earned: 24180, rate: 96, ...input() }
    expect(toAchievementInput(a)).toEqual(input())
  })
})
