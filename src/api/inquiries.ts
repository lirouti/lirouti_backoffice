/**
 * 1:1 문의 파사드.
 *
 * **작성자 · 결제 · 지난 문의를 여기서 합친다.** 화면이 세 곳을 따로 부르면
 * 어느 하나가 늦게 와서 반쯤 그려진 상세가 보인다 (docs/ARCHITECTURE.md §28.2).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { nowAt } from '@/shared/lib/today'

import {
  canHold,
  canReply,
  filterInquiries,
  pastInquiries,
  summarizeInquiries,
  validateReply,
  type Inquiry,
  type InquiryFilter,
  type InquirySummary,
} from '@/domain/inquiry'
import type { Payment } from '@/domain/payment'
import type { User } from '@/domain/user'

import { allInquiries, holdInquiry, replyToInquiry } from '@/mocks/inquiries'
import { allPayments } from '@/mocks/payments'
import { allUsers } from '@/mocks/users'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export type InquiriesResult = {
  inquiries: Inquiry[]
  summary: InquirySummary
  /** 지표를 낸 기준 시각. 화면이 대기 시간을 그릴 때 같은 값을 쓴다 */
  now: string
  /** 회원 필터가 있을 때의 표시 정보. UID를 못 찾았으면 `null`, 필터가 없으면 생략한다. */
  filteredUser?: Pick<User, 'nick' | 'uid'> | null
}

export type InquiriesQuery = InquiryFilter & { userUid?: string }

export async function getInquiries({
  userUid,
  ...filter
}: InquiriesQuery): Promise<InquiriesResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allInquiries()
    const user = userUid ? allUsers().find((candidate) => candidate.uid === userUid) : undefined
    // UID가 있는데 회원을 못 찾으면 전체를 보여 주지 않는다. 잘못된 링크가 범위를 넓히면 안 된다.
    const scoped = userUid ? { ...filter, userKey: user?.key ?? -1 } : filter
    // 지표는 **거르기 전 전체**로 낸다 — 탭마다 「답변 대기」 가 바뀌면 안 된다.
    const now = nowAt()
    return {
      inquiries: filterInquiries(all, scoped),
      summary: summarizeInquiries(all, now),
      now,
      filteredUser: userUid ? (user ? { nick: user.nick, uid: user.uid } : null) : undefined,
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<InquiryDto[]>('/admin/support/inquiries')
  throw new Error('문의 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useInquiries(query: InquiriesQuery) {
  return useQuery({ queryKey: qk.inquiries.list(query), queryFn: () => getInquiries(query) })
}

export type InquiryDetail = {
  inquiry: Inquiry
  /** 보낸 사람. **탈퇴했거나 지워졌으면 `null`** */
  user: User | null
  /** 그 사람의 최근 결제. 없으면 빈 배열 */
  payments: Payment[]
  /** 그 사람의 다른 문의 */
  past: Inquiry[]
  now: string
}

export async function getInquiry(qnaId: string): Promise<InquiryDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allInquiries()
    const inquiry = all.find((i) => String(i.key) === qnaId)
    if (!inquiry) throw apiError('http', `문의 #${qnaId} 을(를) 찾을 수 없습니다.`, 404)

    const user = allUsers().find((u) => u.key === inquiry.userKey) ?? null
    return {
      inquiry,
      user,
      // 결제는 닉네임으로 붙는다. 회원을 못 찾으면 결제도 못 찾는다.
      payments: user
        ? allPayments()
            .filter((p) => p.who === user.nick)
            .slice(0, 3)
        : [],
      past: pastInquiries(all, inquiry),
      now: nowAt(),
    }
  }

  throw new Error('문의 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/** ⚠️ 빈 id 면 부르지 않는다 — 훅은 조기 반환보다 먼저 돈다 (§20.6) */
export function useInquiry(qnaId: string) {
  return useQuery({
    queryKey: qk.inquiries.detail(qnaId),
    queryFn: () => getInquiry(qnaId),
    enabled: qnaId !== '',
  })
}

export type ReplyVars = {
  qnaId: number
  text: string
  /**
   * 답변한 사람. **목에서만 쓴다** — 실서버는 세션에서 가져간다 (§25.3).
   */
  by: string
  /**
   * 앱 알림도 함께 보낼 것인가.
   *
   * ⚠️ **화면의 스위치가 이 값이다.** 계약에 없으면 스위치는 아무 일도 안 하면서
   *    운영자에게는 껐다고 믿게 한다 (docs/ARCHITECTURE.md §28.4).
   */
  notify: boolean
}

/**
 * 답변 발송.
 *
 * ⚠️ **보내면 유저에게 앱 알림이 간다.** 되돌릴 수 없어 화면이 확인 창을 받고,
 *    여기서도 검증을 한 번 더 한다 (§22.2.3).
 */
export async function replyInquiry({ qnaId, text, by, notify }: ReplyVars): Promise<Inquiry> {
  if (USE_MOCK) {
    await mockDelay()
    const first = Object.values(validateReply(text))[0]
    if (first) throw apiError('http', first, 400)

    const target = allInquiries().find((i) => i.key === qnaId)
    if (!target) throw apiError('http', `문의 #${qnaId} 을(를) 찾을 수 없습니다.`, 404)
    if (!canReply(target.status)) {
      throw apiError('http', '보류 건은 먼저 보류를 풀어야 답할 수 있습니다.', 409)
    }

    // ⚠️ **없거나 이미 탈퇴한 회원에게는 알림이 못 간다.** 켜져 있어도 갔다고
    //    기록하면 거짓이 된다 (§28.4).
    const author = allUsers().find((u) => u.key === target.userKey)
    const reachable = author !== undefined && author.status !== 'LEFT'
    const saved = replyToInquiry(qnaId, text.trim(), by, nowAt(), notify && reachable)
    if (!saved) throw apiError('http', `문의 #${qnaId} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  throw new Error('문의 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useReplyInquiry() {
  return useMutation({
    mutationFn: replyInquiry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.inquiries.all }),
  })
}

export type HoldVars = { qnaId: number; by: string }

export async function holdReply({ qnaId, by }: HoldVars): Promise<Inquiry> {
  if (USE_MOCK) {
    await mockDelay()
    const target = allInquiries().find((i) => i.key === qnaId)
    if (!target) throw apiError('http', `문의 #${qnaId} 을(를) 찾을 수 없습니다.`, 404)
    if (!canHold(target.status)) {
      throw apiError('http', `${target.status} 건은 보류로 넘길 수 없습니다.`, 409)
    }
    const saved = holdInquiry(qnaId, by)
    if (!saved) throw apiError('http', `문의 #${qnaId} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  throw new Error('문의 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useHoldInquiry() {
  return useMutation({
    mutationFn: holdReply,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.inquiries.all }),
  })
}
