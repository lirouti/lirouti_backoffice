/**
 * 감사 로그 규칙.
 *
 * 이 화면은 **「누가 무엇을 왜 했는가」에 답하는 자리**다. 여기가 틀리면 사고를 조사할 때
 * 없는 일을 보거나 있는 일을 못 본다 — 기록은 고칠 수 없으니 화면이 마지막 방어선이다.
 */
import type { AuditCategory, AuditKind, AuditLog } from './types'

/**
 * 조작 종류 → 분류. **민감도에서 떼어냈다.**
 *
 * ⚠️ 원본은 「민감 목록에 없으면 전부 콘텐츠」 였다. 그래서 **쿠폰 12,000개 발급이
 *    「콘텐츠」 로 분류**됐다 — 분류가 자기 기준이 아니라 다른 축에 얹혀 있었기 때문이다
 *    (docs/ARCHITECTURE.md §32.2).
 */
export const AUDIT_CATEGORY: Record<AuditKind, AuditCategory> = {
  환불: '재화 · 결제',
  '재화 지급': '재화 · 결제',
  '재화 회수': '재화 · 결제',
  '결제 재처리': '재화 · 결제',
  '쿠폰 발급': '재화 · 결제',
  '계정 제재': '회원 · 신고',
  '숨김 해제': '회원 · 신고',
  '숨김 유지': '회원 · 신고',
  '권한 변경': '권한',
  '관리자 초대': '권한',
  '코드 값 추가': '콘텐츠',
  '아이템 수정': '콘텐츠',
  '챌린지 수정': '콘텐츠',
  '업적 수정': '콘텐츠',
  '배경 수정': '콘텐츠',
}

/**
 * **민감 조작** — 되돌리기 어렵거나 돈·권한이 움직이는 것.
 *
 * ⚠️ **판정은 종류 하나에서만 나온다.** 원본은 목록(`RISKY`)과 줄마다의 플래그를 **둘 다**
 *    들고 있었다 — 지금은 우연히 일치하지만 같은 사실이 두 곳에 있으면 언젠가 어긋나고,
 *    그때 **민감한 조작이 안 민감한 것으로 쌓인다** (docs/ARCHITECTURE.md §32.3).
 */
export const RISKY_KINDS: AuditKind[] = [
  '환불',
  '재화 지급',
  '재화 회수',
  '결제 재처리',
  '계정 제재',
  '숨김 해제',
  '숨김 유지',
  '권한 변경',
  '관리자 초대',
]

export const isRisky = (log: AuditLog): boolean => RISKY_KINDS.includes(log.kind)

/**
 * **값이 바뀌지 않은 기록인가.**
 *
 * ⚠️ 「숨김 유지」 처럼 **살펴보고 그대로 두기로 한** 조작이 있다. 원본은 이것도
 *    `숨김 → 숨김` 으로 빨강·초록 화살표를 그려서 **바뀐 것처럼 읽혔다**
 *    (docs/ARCHITECTURE.md §32.4).
 */
export const isUnchanged = (log: AuditLog): boolean => log.from === log.to

export const AUDIT_CATEGORIES: AuditCategory[] = [
  '재화 · 결제',
  '회원 · 신고',
  '권한',
  '콘텐츠',
]

export type AuditFilter = {
  /** 관리자 · 대상 · 사유 · 조작 부분 일치 */
  q?: string
  /** 관리자 이름. 비어 있으면 전체 */
  by?: string
  category?: AuditCategory
  /** 민감 조작만 보기 */
  riskyOnly?: boolean
}

export function filterAuditLogs(list: AuditLog[], f: AuditFilter): AuditLog[] {
  const q = f.q?.trim().toLowerCase()
  return list.filter((log) => {
    if (f.riskyOnly && !isRisky(log)) return false
    if (f.by && log.by !== f.by) return false
    if (f.category && AUDIT_CATEGORY[log.kind] !== f.category) return false
    if (q && ![log.by, log.target, log.why, log.kind].join(' ').toLowerCase().includes(q))
      return false
    return true
  })
}

/** 관리자 선택지. **데이터에서 만든다** — 손으로 적으면 새 관리자가 목록에 안 나온다 */
export const auditActors = (list: AuditLog[]): string[] =>
  [...new Set(list.map((log) => log.by))].sort((a, b) => a.localeCompare(b, 'ko'))

/** 목록 위 지표 */
export type AuditSummary = {
  /** 오늘 쌓인 기록 수 */
  today: number
  /** **전체 기간**의 민감 조작 수 */
  risky: number
  /** 기록을 남긴 관리자 수 */
  actors: number
}

/**
 * 지표. **거르기 전 전체로 낸다** — 필터마다 「민감 조작」 이 바뀌면 사고 건수가 아니라
 * 필터 결과가 된다.
 *
 * ⚠️ **「오늘」 과 「전체 기간」 이 한 줄에 섞여 있다.** 라벨에 기간을 적어 두 칸이 서로
 *    다른 것을 잰다는 사실을 드러낸다 (docs/ARCHITECTURE.md §32.1).
 *
 * @param today `YYYY-MM-DD`. 안에서 읽으면 테스트가 실행한 날에 따라 달라진다
 */
export function summarizeAudit(list: AuditLog[], today: string): AuditSummary {
  return {
    today: list.filter((log) => log.at.startsWith(today)).length,
    risky: list.filter(isRisky).length,
    actors: auditActors(list).length,
  }
}
