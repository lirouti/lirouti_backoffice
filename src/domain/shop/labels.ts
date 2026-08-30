/** 재화 · 상점 코드값 → 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { GemStatus } from './types'

export const GEM_STATUS_TONE: Record<GemStatus, BadgeTone> = {
  판매중: 'success',
  예약: 'warn',
  중단: 'neutral',
}
