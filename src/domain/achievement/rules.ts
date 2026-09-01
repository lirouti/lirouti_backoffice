/** 업적 도메인 규칙 (docs/ARCHITECTURE.md §40). */
import type { Achievement, AchievementInput } from './types'

/** 어느 칸이 왜 막혔는가. 비어 있으면 저장할 수 있다. */
export type AchievementInputErrors = Partial<Record<keyof AchievementInput, string>>

/**
 * 등록·수정 폼의 검증.
 *
 * ⚠️ **화면의 체크리스트도 이걸 쓴다.** 따로 계산하면 **체크는 초록인데 저장이 막히는**
 *    화면이 만들어진다 (§18.7 과 같은 규칙).
 *
 * 형식만 본다 — "이미 쓰는 이름인가" 같은 것은 서버가 안다.
 */
export function validateAchievement(input: AchievementInput): AchievementInputErrors {
  const errors: AchievementInputErrors = {}

  if (!input.name.trim()) errors.name = '업적명을 입력하세요.'

  // 원본이 「수집함에서 형태만으로 구분됩니다」 라고 못박은 화면이다. 그림이 없으면
  // 목록이 `?` 타일로 차서 **화면의 전제가 깨진다.**
  if (!input.assetId) errors.assetId = '에셋을 고르세요.'

  // 조건이 없으면 **영원히 달성되지 않는 업적**이 만들어진다. 등록은 되는데 아무도 못 딴다.
  if (!input.cond.trim()) errors.cond = '달성 조건을 입력하세요.'

  // 표에 「보상」 열이 있고 「없음」을 표현할 방법이 없다. 비워 두면 "보상이 없는 업적" 이
  // 아니라 **"아직 안 정한 업적"** 으로 읽힌다.
  if (!input.reward.trim()) errors.reward = '보상을 입력하세요.'

  return errors
}

/** 등록 화면의 초기값 */
export function emptyAchievementInput(): AchievementInput {
  return { assetId: '', name: '', sub: '', cond: '', reward: '' }
}

/** `Achievement` 에서 폼이 편집하는 부분만 떼어낸다 (수정 화면의 초기값). */
export function toAchievementInput(a: Achievement): AchievementInput {
  const { assetId, name, sub, cond, reward } = a
  return { assetId, name, sub, cond, reward }
}
