/** 챌린지 도메인 규칙. */
import type { Challenge, ChallengeKind } from './types'

/** 진행 중인 것만, 최대 N개. 음수는 0 으로 — `slice(0, -1)` 이 되면 계약과 반대가 된다 */
export function activeChallenges(list: Challenge[], n?: number): Challenge[] {
  const active = list.filter((c) => c.status === 'ACTIVE')
  return n == null ? active : active.slice(0, Math.max(0, n))
}

export function byKind(list: Challenge[], kind?: ChallengeKind): Challenge[] {
  return kind ? list.filter((c) => c.kind === kind) : list
}

/** 보상에 아이템이 붙는가 */
export const hasItemReward = (c: Challenge): boolean => c.rewardItem !== null
