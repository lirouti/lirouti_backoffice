/** 모더레이션 코드값 → 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { AiVerdict, ReportState } from './types'

/**
 * ⚠️ **「미검토」 가 경고색이다.** 처리 완료 둘과 나란히 회색으로 두면 "아직 안 봤다" 가
 *    "볼 필요 없다" 로 읽힌다 — 게다가 지금은 **미검토인 동안 사진이 계속 보이므로**
 *    예전보다 더 급하다 (docs/ARCHITECTURE.md §23.0).
 *
 * ⚠️ **「숨김」 이 위험색인 것은 나쁘다는 뜻이 아니라 되돌리기 어렵다는 뜻이다.**
 *    사진을 실제로 내리는 유일한 조작이다.
 */
export const REPORT_STATE_TONE: Record<ReportState, BadgeTone> = {
  미검토: 'warn',
  '노출 유지': 'success',
  숨김: 'danger',
}

export const AI_VERDICT_TONE: Record<AiVerdict, BadgeTone> = {
  승인: 'success',
  대기: 'warn',
}
