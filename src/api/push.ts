/**
 * 푸시 알림 파사드.
 *
 * ⚠️ **보내면 되돌릴 수 없다.** 화면이 확인 창을 띄우고, 여기서도 검증을 한 번 더
 *    한다 — 잠근 버튼은 검증이 아니다 (docs/ARCHITECTURE.md §22.2.3).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { nowAt } from '@/shared/lib/today'

import {
  canCancel,
  failuresOf,
  filterPushes,
  reachOf,
  summarizePushes,
  validatePush,
  type Push,
  type PushConsent,
  type PushFailure,
  type PushInput,
  type PushSummary,
  type PushTab,
} from '@/domain/push'

import { addPush, allPushes, cancelPush, openedByHour, pushConsent } from '@/mocks/push'

import { mockDelay, qk, queryClient, today, USE_MOCK } from './core'
import { apiError } from './error'

export type PushesResult = {
  pushes: Push[]
  summary: PushSummary
  consent: PushConsent
}

export type PushQuery = { tab: PushTab; q: string }

export async function getPushes({ tab, q }: PushQuery): Promise<PushesResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allPushes()
    // 지표는 **거르기 전 전체**로 낸다 — 탭마다 「예약 대기」 가 바뀌면 안 된다.
    return { pushes: filterPushes(all, tab, q), summary: summarizePushes(all, today()), consent: pushConsent() }
  }

  // TODO(백엔드 스펙 확정 후): http.get<PushDto[]>('/admin/ops/push')
  throw new Error('푸시 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function usePushes(query: PushQuery) {
  return useQuery({ queryKey: qk.push.list(query), queryFn: () => getPushes(query) })
}

export async function getConsent(): Promise<PushConsent> {
  if (USE_MOCK) {
    await mockDelay()
    return pushConsent()
  }

  throw new Error('푸시 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useConsent() {
  return useQuery({ queryKey: qk.push.consent(), queryFn: getConsent })
}

export type PushDetail = {
  push: Push
  /** 발송 후 12시간의 시간대별 열림 건수 */
  hours: number[]
  failures: PushFailure[]
}

export async function getPush(pushId: string): Promise<PushDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const found = allPushes().find((p) => String(p.key) === pushId)
    if (!found) throw apiError('http', `알림 #${pushId} 을(를) 찾을 수 없습니다.`, 404)
    return { push: found, hours: openedByHour(found), failures: failuresOf(found) }
  }

  throw new Error('푸시 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/** ⚠️ 빈 id 면 부르지 않는다 — 훅은 조기 반환보다 먼저 돈다 (§20.6) */
export function usePush(pushId: string) {
  return useQuery({
    queryKey: qk.push.detail(pushId),
    queryFn: () => getPush(pushId),
    enabled: pushId !== '',
  })
}

export type SendVars = {
  input: PushInput
  /**
   * 보낸 사람. **목에서만 쓴다** — 실서버는 세션에서 가져간다 (§25.3).
   */
  by: string
}

/**
 * 발송 또는 예약.
 *
 * ⚠️ **야간 마케팅 발송은 여기서도 막는다.** 「지금 발송」 의 「지금」 은 **서버가 정할
 *    값**이라 클라이언트가 보낸 시각을 믿지 않는다 (§26.2).
 */
export async function sendPush({ input, by }: SendVars): Promise<Push> {
  if (USE_MOCK) {
    await mockDelay()

    const consent = pushConsent()
    // 「지금」 은 보내는 쪽이 아니라 처리하는 쪽이 정한다.
    const sendAt = input.now ? nowAt() : input.at
    const errors = validatePush(input, consent, sendAt)
    const first = Object.values(errors)[0]
    if (first) throw apiError('http', first, 400)

    const targeted = reachOf(input, consent)
    return addPush({
      title: input.title.trim(),
      body: input.body.trim(),
      kind: input.kind,
      audience: input.audience,
      link: input.link,
      targeted,
      // 예약은 아직 안 갔다. 「보낸 것처럼」 채우면 열림률이 0% 로 잡힌다.
      delivered: 0,
      opened: 0,
      at: sendAt,
      status: input.now ? '발송 완료' : '예약',
      by,
    })
  }

  throw new Error('푸시 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSendPush() {
  return useMutation({
    mutationFn: sendPush,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.push.all }),
  })
}

/** 예약 취소. **보낸 것은 되돌릴 수 없다** */
export async function cancelSchedule(pushId: string): Promise<Push> {
  if (USE_MOCK) {
    await mockDelay()
    const target = allPushes().find((p) => String(p.key) === pushId)
    if (!target) throw apiError('http', `알림 #${pushId} 을(를) 찾을 수 없습니다.`, 404)
    if (!canCancel(target.status)) {
      throw apiError('http', `${target.status} 건은 취소할 수 없습니다.`, 409)
    }
    const saved = cancelPush(target.key)
    if (!saved) throw apiError('http', `알림 #${pushId} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  throw new Error('푸시 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useCancelSchedule() {
  return useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.push.all }),
  })
}
