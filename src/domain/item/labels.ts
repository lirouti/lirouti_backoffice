/**
 * 아이템 코드값 → 한글 표시 매핑.
 *
 * 화면에 한글 문자열을 직접 쓰지 말고 여기를 거친다. 배지 색(tone)도 같이 정의한다 —
 * 원본은 상태마다 fg/bg 변수 쌍을 화면 코드에서 직접 골랐는데(`s === '노출' ? C.gFg : …`)
 * 그 분기를 여기 한 곳으로 모은다.
 *
 * `BadgeTone` 은 디자인 시스템 어휘(shared/ui/tone)라 아래층에서 가져온다.
 */
import type { BadgeTone } from '@/shared/ui/tone'

import type { ItemSource, ItemStatus, Slot, Tier } from './types'

export const SLOT_LABEL: Record<Slot, string> = {
  HEAD: '머리',
  BODY: '몸',
  HAND: '손',
  FACE: '얼굴',
}

export const TIER_LABEL: Record<Tier, string> = { FREE: '무료', PAID: '유료' }
export const TIER_TONE: Record<Tier, BadgeTone> = { FREE: 'neutral', PAID: 'gold' }

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  VISIBLE: '노출',
  SCHEDULED: '예약',
  HIDDEN: '미노출',
}
export const ITEM_STATUS_TONE: Record<ItemStatus, BadgeTone> = {
  VISIBLE: 'success',
  SCHEDULED: 'warn',
  HIDDEN: 'neutral',
}

export const ITEM_SOURCE_LABEL: Record<ItemSource, string> = {
  SHOP: '상점',
  CHALLENGE: '챌린지 보상',
  ACHIEVEMENT: '업적 보상',
  LEVEL: '레벨 해금',
  SEASON_PASS: '시즌 패스',
}
