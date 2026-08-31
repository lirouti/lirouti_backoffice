/**
 * 감사 로그 파사드.
 *
 * ⚠️ **추가만 되는 기록이라 쓰기 함수가 없다.** 화면의 문구(「수정과 삭제는 할 수
 *    없습니다」)를 코드가 지키는 자리다 — 여기에 `PATCH`·`DELETE` 를 만들면 그 문구가
 *    거짓말이 된다 (docs/ARCHITECTURE.md §32.5).
 */
import { useQuery } from '@tanstack/react-query'

import {
  auditActors,
  filterAuditLogs,
  summarizeAudit,
  type AuditFilter,
  type AuditLog,
  type AuditSummary,
} from '@/domain/audit'

import { allAuditLogs } from '@/mocks/audit'

import { mockDelay, qk, today, USE_MOCK } from './core'

export type AuditResult = {
  logs: AuditLog[]
  summary: AuditSummary
  /** 관리자 선택지. **데이터에서 만든다** — 손으로 적으면 새 관리자가 빠진다 */
  actors: string[]
}

export async function getAuditLogs(filter: AuditFilter): Promise<AuditResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allAuditLogs()
    return {
      logs: filterAuditLogs(all, filter),
      // 지표는 **거르기 전 전체**로 낸다 — 탭마다 「민감 조작」 이 바뀌면 안 된다.
      summary: summarizeAudit(all, today()),
      actors: auditActors(all),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<AuditLogDto[]>('/admin/audit')
  throw new Error('감사 로그 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useAuditLogs(filter: AuditFilter) {
  return useQuery({ queryKey: qk.audit.list(filter), queryFn: () => getAuditLogs(filter) })
}
