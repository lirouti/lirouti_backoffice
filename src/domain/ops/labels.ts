/** 운영 코드값 → 한글 표시 + 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { GrantKind, NoticeCategory, PeriodStatus } from './types'

/** 공지 작성에서 고를 수 있는 분류 */
export const NOTICE_CATEGORIES: NoticeCategory[] = ['시즌', '점검', '업데이트', '밸런스', '재화']

/** 공지에서 쓰는 말 */
export const NOTICE_STATUS_LABEL: Record<PeriodStatus, string> = {
  ACTIVE: '게시중',
  SCHEDULED: '예약',
  ENDED: '종료',
}

/** 이벤트에서 쓰는 말. **같은 상태를 다르게 부른다** — 공지는 게시하고 이벤트는 돌아간다 */
export const EVENT_STATUS_LABEL: Record<PeriodStatus, string> = {
  ACTIVE: '진행',
  SCHEDULED: '예약',
  ENDED: '종료',
}

export const PERIOD_STATUS_TONE: Record<PeriodStatus, BadgeTone> = {
  ACTIVE: 'success',
  SCHEDULED: 'warn',
  ENDED: 'neutral',
}

/** ⚠️ **회수는 위험색이다.** 지급과 나란히 회색으로 두면 이력에서 구분되지 않는다 */
export const GRANT_KIND_TONE: Record<GrantKind, BadgeTone> = {
  지급: 'success',
  회수: 'danger',
}
