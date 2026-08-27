/** 챌린지 엔티티 타입. */
import type { Slot } from '../item/types'

/** 주기 */
export type ChallengeKind = 'DAILY' | 'WEEKLY' | 'SEASON'

/** 진행 상태 */
export type ChallengeStatus = 'ACTIVE' | 'SCHEDULED' | 'ENDED'

export type Challenge = {
  key: number
  code: string
  kind: ChallengeKind
  title: string
  /** 달성 조건 (조건 코드 체계는 서버 스펙 확정 후) */
  cond: string
  goal: number
  /** 보상 젬 */
  gem: number
  /** 달성률 (%) */
  rate: number
  status: ChallengeStatus
  period: string
  repeat: string
  target: string
  desc: string
  rewardItem: { assetId: string; name: string; slot: Slot } | null
}

export const CHALLENGE_KINDS: ChallengeKind[] = ['DAILY', 'WEEKLY', 'SEASON']
