/** 감사 로그 표시 어휘. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { AuditKind } from './types'

/** 조작 종류의 배지 색. 원본 `kindPal` 을 그대로 옮겼다 */
export const AUDIT_KIND_TONE: Record<AuditKind, BadgeTone> = {
  환불: 'danger',
  '재화 지급': 'success',
  '재화 회수': 'danger',
  '결제 재처리': 'brand',
  '계정 제재': 'danger',
  '숨김 해제': 'success',
  '숨김 유지': 'warn',
  '권한 변경': 'purple',
  '관리자 초대': 'purple',
  '쿠폰 발급': 'teal',
  '코드 값 추가': 'teal',
  '아이템 수정': 'neutral',
  '챌린지 수정': 'neutral',
  '업적 수정': 'neutral',
  '배경 수정': 'neutral',
}

/** 기록을 몇 년 보관하는가. 정책값이라 데이터에서 나오지 않는다 */
export const AUDIT_KEEP_YEARS = 3
