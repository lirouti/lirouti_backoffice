/** 모더레이션 코드값 → 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { AiVerdict, ReportState } from './types'

/**
 * ⚠️ **「대기」 가 경고색이다.** 처리 완료 둘과 나란히 회색으로 두면 "아직 안 봤다" 가
 *    "볼 필요 없다" 로 읽힌다 — 가려진 인증은 사람이 볼 때까지 계속 가려져 있다.
 */
export const REPORT_STATE_TONE: Record<ReportState, BadgeTone> = {
  대기: 'warn',
  '숨김 유지': 'danger',
  '숨김 해제': 'success',
}

export const AI_VERDICT_TONE: Record<AiVerdict, BadgeTone> = {
  승인: 'success',
  대기: 'warn',
}
