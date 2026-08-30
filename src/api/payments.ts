/**
 * 결제 데이터 파사드.
 *
 * 12건뿐이라 **쪽을 자르지 않는다** — 원본에도 페이지 바가 없다.
 * TODO(결제 건수가 늘면): `ItemsQuery` 처럼 page·perPage 를 받는다
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  canRefund,
  PAY_STATUS_LABEL,
  filterPayments,
  stuckPayments,
  summarizePayments,
  type PayFilter,
  type PaySummary,
  type Payment,
} from '@/domain/payment'

import { allPayments, refundPayment } from '@/mocks/payments'

import { mockDelay, qk, queryClient, today, USE_MOCK } from './core'
import { apiError } from './error'

export type PaymentsResult = {
  payments: Payment[]
  /** 확인이 필요한 건. **거르기 전 전체**에서 뽑는다 — 필터에 가려지면 안 된다 */
  stuck: Payment[]
  summary: PaySummary
}

export async function getPayments(filter: PayFilter): Promise<PaymentsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allPayments()
    return {
      payments: filterPayments(all, filter),
      stuck: stuckPayments(all),
      summary: summarizePayments(all, today()),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<PaymentsDto>('/admin/payments', { params: filter })
  throw new Error('결제 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function usePayments(filter: PayFilter) {
  return useQuery({ queryKey: qk.payments.list(filter), queryFn: () => getPayments(filter) })
}

export async function getPayment(payId: string): Promise<Payment> {
  if (USE_MOCK) {
    await mockDelay()
    const found = allPayments().find((p) => String(p.key) === payId)
    // 없는 id 로 들어올 수 있다 — 북마크·잘못 친 주소.
    if (!found) throw apiError('http', `결제 #${payId} 을(를) 찾을 수 없습니다.`, 404)
    return found
  }

  throw new Error('결제 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/** ⚠️ 빈 id 면 부르지 않는다 — 훅은 조기 반환보다 먼저 돈다 (docs/ARCHITECTURE.md §20.6) */
export function usePayment(payId: string) {
  return useQuery({
    queryKey: qk.payments.detail(payId),
    queryFn: () => getPayment(payId),
    enabled: payId !== '',
  })
}

export type RefundVars = { payId: string; reason: string }

/**
 * 환불.
 *
 * ⚠️ **결제사 취소와 재화 회수는 함께 일어나야 한다.** 둘 중 하나만 성공하면 사고다 —
 *    돈은 돌려줬는데 재화가 남거나, 재화만 걷고 돈은 안 돌려준 상태가 된다.
 * TODO(결제 API 가 생기면): 서버가 한 트랜잭션으로 처리하고 우리는 결과만 받는다
 */
export async function refund({ payId, reason }: RefundVars): Promise<Payment> {
  if (USE_MOCK) {
    await mockDelay()
    if (!reason.trim()) throw apiError('http', '환불 사유를 입력하세요.', 400)

    // 상태 검증은 목(변이 경계)에도 있다. 여기서 먼저 보는 것은 **화면이 읽을 메시지**를
    // 주기 위해서다 — 목이 던지는 것은 개발자용 문구다.
    const target = await getPayment(payId)
    if (!canRefund(target)) {
      throw apiError('http', `${PAY_STATUS_LABEL[target.status]} 건은 환불할 수 없습니다.`, 409)
    }

    return refundPayment(Number(payId))
  }

  throw new Error('결제 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useRefund() {
  return useMutation({
    mutationFn: refund,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.payments.all }),
  })
}
