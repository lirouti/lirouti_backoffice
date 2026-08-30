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

/**
 * 달성 조건. 원본의 `CT` 배열 그대로다.
 *
 * ⚠️ **목록 밖의 값은 서버가 셀 수 없다.** 자유 입력으로 두면 달성이 영영 안 잡히는
 *    챌린지가 만들어지므로 고르는 것만 받는다.
 * TODO(조건 코드 체계가 정해지면): 한글 대신 코드값으로 바꾸고 여기는 라벨만 남긴다
 */
export const CHALLENGE_CONDS: string[] = [
  '출석',
  '착용 변경',
  '챌린지 달성',
  '젬 사용',
  '이모티콘 사용',
  '친구 초대',
  '도감 수집',
  '배경 변경',
]

/**
 * 반복 규칙 — **주기가 정한다.**
 *
 * 운영 기간(`startAt`/`endAt`)과 다른 축이다. 일상 챌린지는 기간이 「제한 없음」 이어도
 * 매일 05:00 에 초기화된다.
 */
export const REPEAT_LABEL: Record<ChallengeKind, string> = {
  DAILY: '매일 05:00 초기화',
  WEEKLY: '월 05:00 ~ 일 24:00',
  SEASON: '없음',
}
