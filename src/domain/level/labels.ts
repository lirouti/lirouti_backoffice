/** 레벨 코드값 → 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { LevelStatus } from './types'

/**
 * ⚠️ **「검수 중」 은 경고색이다.** 회색으로 두면 "아직 안 봤다" 가 "안 봐도 된다" 로
 *    읽히는데, 검수를 건너뛴 상수가 그대로 나가면 **이미 그 레벨에 있는 회원**이 영향을 받는다.
 */
export const LEVEL_STATUS_TONE: Record<LevelStatus, BadgeTone> = {
  적용: 'success',
  '검수 중': 'warn',
}
