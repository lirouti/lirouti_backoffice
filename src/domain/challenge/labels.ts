/** 챌린지 코드값 → 한글 표시 매핑 + 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { ChallengeKind, ChallengeStatus } from './types'

export const CHALLENGE_KIND_LABEL: Record<ChallengeKind, string> = {
  DAILY: '일상',
  WEEKLY: '주간',
  SEASON: '시즌',
}
export const CHALLENGE_KIND_TONE: Record<ChallengeKind, BadgeTone> = {
  DAILY: 'brand',
  WEEKLY: 'purple',
  SEASON: 'teal',
}

export const CHALLENGE_STATUS_LABEL: Record<ChallengeStatus, string> = {
  ACTIVE: '진행',
  SCHEDULED: '예약',
  ENDED: '종료',
}
export const CHALLENGE_STATUS_TONE: Record<ChallengeStatus, BadgeTone> = {
  ACTIVE: 'success',
  SCHEDULED: 'warn',
  ENDED: 'neutral',
}
