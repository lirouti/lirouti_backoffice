/**
 * 회원 상세의 이력 표들. 시드 RNG 로 결정적이다.
 *
 * 원본이 화면에서 지어내던 값이라 도메인 규칙이 아니다 — 백엔드 스펙이 나오면
 * 통째로 갈아 끼운다.
 */
import { rng } from '@/shared/lib/rng'

import type { CoinLedgerRow, OrderRow } from '@/domain/user'

const KINDS = ['챌린지 보상', '업적 보상', '상점 구매', '출석 보상', '이벤트 지급'] as const
const PRODUCTS = ['파란보석 100', '파란보석 550', '파란보석 1,200', '시즌 패스'] as const

/** 재화 이력 8줄. 잔액이 위로 갈수록 커지게 거꾸로 쌓는다 */
export function coinLedgerOf(userKey: number, gem: number, topaz: number): CoinLedgerRow[] {
  const r = rng(userKey * 31 + 5)
  const out: CoinLedgerRow[] = []
  let blue = gem
  let yellow = topaz

  for (let i = 0; i < 8; i += 1) {
    const isBlue = r() < 0.5
    const kind = KINDS[Math.floor(r() * KINDS.length)]!
    // 구매는 파란보석이 늘고, 상점 사용은 준다. 나머지는 얻는 쪽이다.
    const spend = kind === '상점 구매'
    const size = Math.max(10, Math.round((isBlue ? 60 : 120) * (0.4 + r())))
    const delta = spend ? -size : size
    const balance = isBlue ? blue : yellow
    out.push({
      at: `2026-08-${String(14 - i).padStart(2, '0')} ${String(9 + (i % 10)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
      kind,
      coin: isBlue ? '파란보석' : '노란보석',
      delta,
      balance: Math.max(0, balance),
      why: spend ? '상점에서 사용' : `${kind}으로 지급`,
    })
    // 위로 갈수록 최근이므로, 아래로 내려가며 이전 잔액을 되짚는다.
    if (isBlue) blue = Math.max(0, blue - delta)
    else yellow = Math.max(0, yellow - delta)
  }
  return out
}

/**
 * 결제 내역. 누적 결제가 0 이면 **빈 배열이다** — 없는 결제를 지어내지 않는다.
 *
 * ⚠️ **「완료」 한 건들의 합이 `paid` 와 정확히 같아야 한다.** 상세 화면이 둘을 나란히
 *    보여 주므로 어긋나면 바로 보인다. 두 군데를 조심한다.
 *
 *    - `Math.round(paid / count)` 로 나누면 나머지가 남는다 (62,000 / 3 → 합이 62,001).
 *      **내림으로 나누고 마지막 한 건이 나머지를 가져간다.**
 *    - **환불된 건은 누적 결제에 안 들어간다.** 그래서 `paid` 는 완료 건들에만 나누고,
 *      환불 건은 그 밖에 따로 붙인다.
 */
export function orderRowsOf(userKey: number, paid: number): OrderRow[] {
  if (paid <= 0) return []

  const r = rng(userKey * 17 + 11)
  const done = Math.min(4, 1 + Math.floor(paid / 30000))
  // 환불은 가끔만. 완료 건이 하나뿐일 때도 붙일 수 있다 — 그건 그 밖의 결제다.
  const refunded = r() < 0.25 ? 1 : 0

  const each = Math.floor(paid / done)
  const at = (i: number) =>
    `2026-0${7 - (i % 3)}-${String(4 + i * 5).padStart(2, '0')} 1${i % 10}:${String((i * 17) % 60).padStart(2, '0')}`
  const row = (i: number, amount: number, status: OrderRow['status']): OrderRow => ({
    at: at(i),
    orderNo: `ORD-${20260000 + userKey * 100 + i}`,
    product: PRODUCTS[Math.floor(r() * PRODUCTS.length)]!,
    amount,
    status,
  })

  const rows = Array.from({ length: done }, (_, i) =>
    // 마지막 한 건이 나머지를 가져간다 — 합이 `paid` 와 정확히 맞아야 한다.
    row(i, i === done - 1 ? paid - each * (done - 1) : each, '완료'),
  )
  if (refunded) rows.push(row(done, each, '환불'))
  return rows
}
