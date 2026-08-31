/** 문의 코드값 → 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { InquiryCategory, InquiryStatus } from './types'

/**
 * ⚠️ **「대기」 가 경고색이다.** 답변완료와 나란히 회색으로 두면 밀린 문의가
 *    눈에 안 띈다 — 이 화면에 오는 이유가 그것이다.
 */
export const INQUIRY_STATUS_TONE: Record<InquiryStatus, BadgeTone> = {
  대기: 'warn',
  보류: 'neutral',
  답변완료: 'success',
}

export const INQUIRY_CATEGORY_TONE: Record<InquiryCategory, BadgeTone> = {
  계정: 'brand',
  결제: 'teal',
  버그: 'danger',
  캐릭터: 'purple',
  챌린지: 'gold',
  기타: 'neutral',
}
