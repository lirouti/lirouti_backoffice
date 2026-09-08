/**
 * 모더레이션 데이터 파사드 — 신고 처리와 AI 심사.
 *
 * **신고는 8건뿐이라 쪽을 자르지 않고 탭도 화면이 거른다.** 지표를 거르기 전 전체로
 * 내야 해서(docs/ARCHITECTURE.md §23.1) 어차피 전량을 받는다.
 * TODO(신고가 쌓이면): 서버가 탭·페이지를 처리하고 지표는 별도 엔드포인트로 뺀다
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  canDecide,
  sortReports,
  summarizeAi,
  summarizeReports,
  type AiDay,
  type AiReview,
  type AiSummary,
  type Report,
  type ReportState,
  type ReportSummary,
} from '@/domain/moderation'

import {
  allAiDays,
  allAiReviews,
  allReports,
  decideReport,
  isAiEnabled,
  setAiEnabled,
} from '@/mocks/moderation'

import { mockDelay, qk, queryClient, today, USE_MOCK } from './core'
import { apiError } from './error'

export type ReportsResult = {
  reports: Report[]
  summary: ReportSummary
}

/**
 * ⚠️ **순서는 파사드가 정한다.** 화면이 정렬하면 탭마다 순서가 갈리고, 같은 목록을 두
 *    곳에서 다르게 세게 된다. 지표도 **거르기 전 전체**로 내야 해서(§23.1) 어차피 여기서
 *    전량을 손에 쥔다.
 */
export async function getReports(): Promise<ReportsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allReports()
    // 지표는 정렬과 무관하지만, 같은 배열에서 내야 화면의 행 수와 어긋날 수 없다.
    return { reports: sortReports(all), summary: summarizeReports(all, today()) }
  }

  // TODO(백엔드 스펙 확정 후): http.get<ReportsDto>('/admin/moderation/reports')
  throw new Error('모더레이션 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useReports() {
  return useQuery({ queryKey: qk.moderation.reports(), queryFn: getReports })
}

export type DecideVars = { key: number; next: ReportState }

/**
 * 신고 처리 — 숨김 또는 노출 유지.
 *
 * ⚠️ **「숨김」 만 실제로 무언가를 바꾼다.** 자동 숨김을 걷어낸 뒤로 사진을 내리는 경로는
 *    이것 하나뿐이다 (docs/ARCHITECTURE.md §23.0).
 *
 * ⚠️ **열람 기록이 감사 로그에 남아야 한다.** 인증 사진은 개인 콘텐츠라, 누가 언제 열어
 *    무엇으로 판단했는지가 남지 않으면 이 화면 자체가 사각지대가 된다.
 * TODO(감사 로그 API 가 생기면): 사진을 연 시점과 결정을 함께 기록한다
 */
export async function decide({ key, next }: DecideVars): Promise<Report> {
  if (USE_MOCK) {
    await mockDelay()

    const target = allReports().find((r) => r.key === key)
    if (!target) throw apiError('http', `신고 #${key} 을(를) 찾을 수 없습니다.`, 404)
    // 같은 결정을 다시 누르면 아무 일도 안 일어나는데 버튼은 반응한 것처럼 보인다.
    if (!canDecide(target, next))
      throw apiError('http', `이미 「${next}」 로 처리된 건입니다.`, 409)

    const saved = decideReport(key, next)
    if (!saved) throw apiError('http', `신고 #${key} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  throw new Error('모더레이션 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useDecide() {
  return useMutation({
    mutationFn: decide,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.moderation.all }),
  })
}

export type AiResult = {
  days: AiDay[]
  reviews: AiReview[]
  summary: AiSummary
  /** 자동 심사가 켜져 있는가 */
  enabled: boolean
}

export async function getAi(): Promise<AiResult> {
  if (USE_MOCK) {
    await mockDelay()
    const days = allAiDays()
    const reviews = allAiReviews()
    return {
      days,
      reviews,
      summary: summarizeAi(days, reviews, today()),
      enabled: isAiEnabled(),
    }
  }

  throw new Error('모더레이션 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useAi() {
  return useQuery({ queryKey: qk.moderation.ai(), queryFn: getAi })
}

/**
 * 자동 심사를 켜고 끈다.
 *
 * ⚠️ **끄면 모든 인증이 심사 없이 즉시 승인된다.** 되돌릴 수 없는 종류의 설정이라
 *    화면에서 확인 창을 한 번 받는다 (§23.9).
 */
export async function toggleAi(on: boolean): Promise<boolean> {
  if (USE_MOCK) {
    await mockDelay()
    return setAiEnabled(on)
  }

  throw new Error('모더레이션 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useToggleAi() {
  return useMutation({
    mutationFn: toggleAi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.moderation.ai() }),
  })
}
