/**
 * 종 표시 규칙 — 배지 색과 텍스트.
 *
 * `BadgeTone` 은 디자인 시스템 어휘(shared/ui/tone)라 아래층에서 가져온다.
 */
import type { BadgeTone } from '@/shared/ui/tone'

import type { Rarity } from './types'

/**
 * 희귀도 배지.
 *
 * 원본의 `RAR` 표와 같은 쌍이다. 전설이 `gold` 인 것은 유료라서가 아니라
 * **"가장 귀함" 을 유료 등급과 같은 색으로 말하기** 때문이다.
 */
export const RARITY_TONE: Record<Rarity, BadgeTone> = {
  기본: 'neutral',
  희귀: 'teal',
  영웅: 'purple',
  전설: 'gold',
}

/** 뽑기 풀에 들어 있는가 */
export const appearanceLabel = (hidden: boolean): string => (hidden ? '미출현' : '출현 중')

/** 출현 상태 배지 */
export const appearanceTone = (hidden: boolean): BadgeTone => (hidden ? 'neutral' : 'success')
