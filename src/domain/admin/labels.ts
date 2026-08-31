/** 관리자 계정 표시 어휘 — 코드값 → 사람이 읽는 말 · 배지 색. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { ScopeId } from '../screens'
import type { AdminLogKind, AdminRole, AdminStatus } from './types'

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  top: '최고 관리자',
  operator: '운영자',
}

export const ADMIN_ROLE_TONE: Record<AdminRole, BadgeTone> = {
  top: 'purple',
  operator: 'neutral',
}

export const ADMIN_ROLE_DESC: Record<AdminRole, string> = {
  top: '전체 권한 · 계정 발급',
  operator: '담당 모듈만 접근',
}

export const ADMIN_STATUS_TONE: Record<AdminStatus, BadgeTone> = {
  활성: 'success',
  휴면: 'neutral',
  대기: 'warn',
  정지: 'danger',
}

/** 담당 모듈 이름과 한 줄 설명. 원본 `SCOPES` 를 그대로 옮겼다 */
export const SCOPE_LABEL: Record<ScopeId, string> = {
  dash: '지표',
  char: '캐릭터',
  items: '아이템',
  bg: '배경 · 둥지',
  levels: '레벨',
  chal: '챌린지',
  ach: '업적',
  shop: '재화 · 상점',
  ops: '운영',
  cs: '고객 소통',
  code: '코드',
  user: '회원',
  mod: '모더레이션',
  pay: '결제',
  admin: '관리자',
  me: '내 계정',
}

export const SCOPE_NOTE: Record<ScopeId, string> = {
  dash: '읽기 전용',
  char: '리그 · 성장',
  items: '등록 · 수정',
  bg: '등록 · 수정',
  levels: '밸런싱 값',
  chal: '등록 · 중단',
  ach: '등록 · 수정',
  shop: '가격 · 진열',
  ops: '공지 · 지급',
  cs: '문의 · FAQ',
  code: '공통 코드 · 쿠폰',
  user: '목록 · 상세',
  mod: '신고 · AI 심사',
  pay: '내역 · 환불',
  admin: '계정 · 감사 로그',
  me: '2단계 인증',
}

/** 패스키 기기 이름. `''` 이면 등록한 기기가 없다 */
export const DEVICE_LABEL: Record<'mac' | 'iphone', string> = {
  mac: 'MacBook · Touch ID',
  iphone: 'iPhone · Face ID',
}

export const ADMIN_LOG_TONE: Record<AdminLogKind, BadgeTone> = {
  로그인: 'teal',
  수정: 'neutral',
  등록: 'success',
  지급: 'warn',
}
