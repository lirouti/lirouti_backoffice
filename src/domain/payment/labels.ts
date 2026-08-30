/** 결제 코드값 → 한글 표시 + 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { PayStatus, Pg } from './types'

export const PG_LABEL: Record<Pg, string> = { TOSS: '토스', KAKAOPAY: '카카오페이' }

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  DONE: '완료',
  READY: '준비',
  FAILED: '실패',
  REFUNDED: '환불',
}

/**
 * ⚠️ **「준비」 는 경고색(`warn`)이다.** 「완료」 와 나란히 회색으로 두면 그냥 진행 중으로
 *    읽히는데, 실제로는 **돈이 나갔는데 재화가 안 들어간** 사고 후보다.
 */
export const PAY_STATUS_TONE: Record<PayStatus, BadgeTone> = {
  DONE: 'success',
  READY: 'warn',
  FAILED: 'danger',
  REFUNDED: 'neutral',
}
