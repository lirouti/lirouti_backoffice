/** 회원 코드값 → 한글 표시 + 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { Social, UserStatus } from './types'

export const SOCIAL_LABEL: Record<Social, string> = { KAKAO: '카카오', GOOGLE: '구글' }
export const SOCIAL_TONE: Record<Social, BadgeTone> = { KAKAO: 'warn', GOOGLE: 'teal' }

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: '정상',
  BANNED: '제재',
  DORMANT: '휴면',
  LEFT: '탈퇴',
}

/** ⚠️ 휴면과 탈퇴는 **같은 회색**이다 — 원본 규칙이고, 둘 다 "지금 쓰지 않는 계정" 이다 */
export const USER_STATUS_TONE: Record<UserStatus, BadgeTone> = {
  ACTIVE: 'success',
  BANNED: 'danger',
  DORMANT: 'neutral',
  LEFT: 'neutral',
}
