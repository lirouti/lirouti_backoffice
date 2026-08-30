/** 푸시 코드값 → 한글 표시 + 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { PushKind, PushStatus } from './types'

export const PUSH_KIND_LABEL: Record<PushKind, string> = {
  service: '서비스 알림',
  marketing: '마케팅 알림',
  routine: '루틴 리마인더',
}

/** 종류를 고를 때 옆에 붙는 설명. **수신 동의를 볼지 말지를 여기서 말한다** */
export const PUSH_KIND_HINT: Record<PushKind, string> = {
  service: '점검 · 장애 · 문의 답변. 수신 동의와 무관하게 발송됩니다',
  marketing: '이벤트 · 신규 아이템. 동의한 회원에게만 갑니다',
  routine: '예약한 루틴 시각에 자동으로 나갑니다',
}

export const PUSH_KIND_TONE: Record<PushKind, BadgeTone> = {
  service: 'brand',
  marketing: 'purple',
  routine: 'teal',
}

export const PUSH_STATUS_TONE: Record<PushStatus, BadgeTone> = {
  '발송 완료': 'success',
  예약: 'warn',
  취소: 'neutral',
  실패: 'danger',
}
