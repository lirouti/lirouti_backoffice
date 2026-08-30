/**
 * 챌린지 데이터 파사드.
 *
 * 챌린지는 18개뿐이라 **쪽을 자르지 않는다** — 원본에도 페이지 바가 없고, 주기 탭으로
 * 거른다. 아이템 목록(50개)과 다른 점이다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  byKind,
  challengeStatusOf,
  type Challenge,
  type ChallengeInput,
  type ChallengeKind,
} from '@/domain/challenge'

import { allChallenges, endChallenge, trendOfChallenge, upsertChallenge } from '@/mocks/challenges'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

/** `YYYY-MM-DD`. 상태 계산이 순수 함수라 오늘을 여기서 만들어 넘긴다 */
const today = (): string => new Date().toISOString().slice(0, 10)

export async function getChallenges(kind?: ChallengeKind): Promise<Challenge[]> {
  if (USE_MOCK) {
    await mockDelay()
    return byKind(allChallenges(), kind)
  }

  // TODO(백엔드 스펙 확정 후): http.get<ChallengeDto[]>('/admin/challenges', { params: { kind } })
  throw new Error('챌린지 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useChallenges(kind?: ChallengeKind) {
  return useQuery({ queryKey: qk.challenges.list({ kind }), queryFn: () => getChallenges(kind) })
}

export type ChallengeDetail = {
  challenge: Challenge
  /** 일자별 달성률 14일치 (%) */
  trend: number[]
  /**
   * 상세 지표 넷. 원본이 화면에서 지어낸 값이라 도메인 타입에 없다.
   * TODO(백엔드가 정의하면): 집계 API 로 옮긴다
   */
  stats: { k: string; v: string }[]
}

export async function getChallenge(chalId: string): Promise<ChallengeDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const challenge = allChallenges().find((c) => String(c.key) === chalId)
    // 없는 id 로 들어올 수 있다 — 북마크·잘못 친 주소.
    if (!challenge) throw apiError('http', `챌린지 #${chalId} 을(를) 찾을 수 없습니다.`, 404)

    return {
      challenge,
      trend: trendOfChallenge(challenge.key, challenge.rate),
      stats: [
        { k: '참여', v: '18,240' },
        { k: '달성', v: `${challenge.rate}%` },
        { k: '평균 소요', v: '2일 4시간' },
        { k: '보상 지급', v: '12,480건' },
      ],
    }
  }

  throw new Error('챌린지 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useChallenge(chalId: string) {
  return useQuery({ queryKey: qk.challenges.detail(chalId), queryFn: () => getChallenge(chalId) })
}

/** 등록이면 `chalId` 가 없다. 수정이면 있다. */
export type SaveChallengeVars = { chalId?: string; input: ChallengeInput }

export async function saveChallenge({ chalId, input }: SaveChallengeVars): Promise<Challenge> {
  if (USE_MOCK) {
    await mockDelay()
    const key = chalId == null ? undefined : Number(chalId)
    const prev = key == null ? undefined : allChallenges().find((c) => c.key === key)?.status
    // 상태는 기간이 정한다 — 등록과 수정이 같은 규칙을 쓴다.
    return upsertChallenge(input, challengeStatusOf(input, today(), prev), key)
  }

  // TODO(백엔드 스펙 확정 후): chalId 유무로 POST / PATCH
  throw new Error('챌린지 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveChallenge() {
  return useMutation({
    mutationFn: saveChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.challenges.all }),
  })
}

export async function stopChallenge(chalId: string): Promise<Challenge> {
  if (USE_MOCK) {
    await mockDelay()
    return endChallenge(Number(chalId))
  }

  throw new Error('챌린지 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useStopChallenge() {
  return useMutation({
    mutationFn: stopChallenge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.challenges.all }),
  })
}
