/** 결제 도메인 규칙. */
import type { PayStatus, Payment, Pg } from './types'

export type PayFilter = {
  /** 주문번호 · 회원 · 상품 부분 일치 */
  q?: string
  status?: PayStatus
  pg?: Pg
}

export function filterPayments(list: Payment[], f: PayFilter): Payment[] {
  const q = f.q?.trim()
  return list.filter((p) => {
    if (f.status && p.status !== f.status) return false
    if (f.pg && p.pg !== f.pg) return false
    if (q && !p.orderNo.includes(q) && !p.who.includes(q) && !p.product.includes(q))
      return false
    return true
  })
}

/**
 * **확인이 필요한 건** — 결제사와 우리 원장이 어긋난 것.
 *
 * ⚠️ **이건 필터가 아니라 사고 후보 목록이다.** 목록 위에 따로 모아 두는 이유는,
 *    「준비」 가 전체에 섞여 있으면 **돈이 나갔는데 재화가 안 들어간 건**을 아무도 못 보기
 *    때문이다. 운영자가 매일 먼저 볼 자리다.
 */
export const stuckPayments = (list: Payment[]): Payment[] =>
  list.filter((p) => p.status === 'READY')

/** 목록 위 지표 */
export type PaySummary = {
  /** 원 */
  today: number
  /** 원. 지금 목에서는 전체 기간이다 */
  total: number
  stuck: number
  failed: number
}

/**
 * 지표. **거르기 전 전체로 낸다** — 필터마다 「확인 필요」 가 바뀌면 사고 건수가 아니라
 * 필터 결과가 된다.
 *
 * ⚠️ **매출에는 「완료」 만 센다.** 실패·준비는 돈이 우리에게 오지 않았고, 환불은 돌려줬다.
 *
 * @param today `YYYY-MM-DD`. 안에서 읽으면 테스트가 실행한 날에 따라 달라진다.
 */
export function summarizePayments(list: Payment[], today: string): PaySummary {
  const done = list.filter((p) => p.status === 'DONE')
  return {
    today: done.filter((p) => p.at.startsWith(today)).reduce((sum, p) => sum + p.amount, 0),
    total: done.reduce((sum, p) => sum + p.amount, 0),
    stuck: stuckPayments(list).length,
    failed: list.filter((p) => p.status === 'FAILED').length,
  }
}

/**
 * 환불할 수 있는 금액.
 *
 * ⚠️ **미사용 유상 재화만 청약철회 대상이다.** 이미 쓴 재화는 상품을 받은 것이라
 *    돌려줄 수 없고, 보너스(무상)는 **애초에 판 것이 아니라** 대상이 아니다.
 *    결제 금액을 그대로 환불하면 쓴 만큼을 공짜로 준 셈이 된다.
 *
 * 비율로 계산한다 — 1,100원에 100개를 줬는데 60개가 남았으면 660원이다.
 */
export function refundableAmount(p: Payment): number {
  if (p.give <= 0) return 0
  const usable = Math.min(p.unusedGem, p.give)
  return Math.floor((p.amount * usable) / p.give)
}

/** 환불할 수 있는 상태인가. 끝나지 않았거나 이미 돌려준 건은 대상이 아니다 */
export const canRefund = (p: Payment): boolean => p.status === 'DONE'

/** 어느 칸이 왜 막혔는가 */
export type RefundErrors = { reason?: string }

/**
 * 환불 폼 검증.
 *
 * ⚠️ **사유는 필수다.** 환불은 되돌릴 수 없고 감사 로그에 남는 행위라, 나중에 "왜 돌려줬나"
 *    를 답할 수 있어야 한다.
 */
export function validateRefund(reason: string): RefundErrors {
  const errors: RefundErrors = {}
  if (!reason.trim()) errors.reason = '환불 사유를 입력하세요.'
  return errors
}
