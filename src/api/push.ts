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
  directTargets,
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
import { parseUserIds } from '@/domain/user'

import { addPush, allPushes, cancelPush, openedByHour, pushConsent } from '@/mocks/push'
import { allUsers } from '@/mocks/users'

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

export type DirectCheck = {
  /** 실제로 보낼 회원 수 */
  count: number
  /** 회원 목록에 없는 id */
  missing: string[]
  /** 있지만 마케팅 수신 미동의로 빠지는 회원의 uid */
  blocked: string[]
}

/**
 * 「직접 지정」 대상을 실제 회원으로 풀어 본다.
 *
 * **화면의 「예상 대상」 은 상한**이라, 보내기 전에 누가 빠지는지 알려 줘야 한다
 * (docs/ARCHITECTURE.md §26.3.1).
 */
export async function checkDirect(input: PushInput): Promise<DirectCheck> {
  if (USE_MOCK) {
    await mockDelay()
    const { send, missing, blocked } = directTargets(parseUserIds(input.ids), allUsers(), input.kind)
    return { count: send.length, missing, blocked: blocked.map((u) => u.uid) }
  }

  throw new Error('푸시 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useCheckDirect() {
  return useMutation({ mutationFn: checkDirect })
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

    // ⚠️ **「직접 지정」 은 여기서 실제 회원으로 푼다.** 화면이 보여 준 수는 상한이고,
    //    마케팅이면 동의하지 않은 사람이 빠진다 (§26.3.1).
    const targeted = reachOf(input, consent, allUsers())
    if (targeted === 0) throw apiError('http', '보낼 대상이 없습니다.', 400)

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
