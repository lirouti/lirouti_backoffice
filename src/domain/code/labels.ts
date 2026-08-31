/** 코드 표시값 → 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { CodeLog, CodeTone } from './types'

/**
 * 코드 그룹이 고르는 색 → 우리 배지 tone.
 *
 * ⚠️ **운영자가 고르는 값이라 자유 색이 아니다.** 여섯 색으로 묶어 두면 어느 조합이든
 *    대비가 보장된다 — 임의 hex 를 받으면 `check-contrast.ts` 가 못 본다(docs/ARCHITECTURE.md §25.2 와 같은 이유).
 */
export const CODE_TONE_BADGE: Record<CodeTone, BadgeTone> = {
  파랑: 'brand',
  빨강: 'danger',
  노랑: 'warn',
  초록: 'success',
  보라: 'purple',
  회색: 'neutral',
}

export const CODE_LOG_TONE: Record<CodeLog['kind'], BadgeTone> = {
  '그룹 생성': 'brand',
  '값 추가': 'success',
  '이름 변경': 'teal',
  '색 변경': 'purple',
  '순서 변경': 'neutral',
  숨김: 'warn',
}
