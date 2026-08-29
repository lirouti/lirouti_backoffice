/**
 * 지급·회수 목 데이터.
 *
 * 아이템마다 **결정적으로** 만든다 — 시드에 아이템 키를 섞어, 같은 아이템은
 * 새로고침해도 같은 이력이 나온다 (docs/ARCHITECTURE.md §7.2).
 *
 * ⚠️ **수량은 계정 수다.** 착용 아이템은 한 계정에 하나뿐이라 개별 계정에 준
 *    줄은 언제나 1 이고, 여럿이 되는 건 세그먼트로 뿌렸을 때뿐이다.
 *    (원본도 `who: '전체 유저' | 'u_10240'`, `qty: 100.. | '1'` 로 같은 규칙이다.)
 */
import { rng } from '@/shared/lib/rng'

import type { LedgerEntry, LedgerKind } from '@/domain/ledger'

/**
 * 한 번에 뿌리는 대상. 이때만 계정 수가 여럿이 된다.
 *
 * ⚠️ **규모를 세그먼트마다 정해 둔다.** 무작위로 굴리면 「전체 유저 91명」이
 *    「시즌 패스 구매자 202명」보다 적게 나온다 — 부분집합이 전체보다 클 수는 없다.
 *    사유도 여기 묶는다. 시즌 패스를 전체 유저에게 지급하지는 않는다.
 */
const SEGMENTS = [
  { name: '전체 유저', min: 1200, span: 1800, reasons: ['서버 점검 보상', '이벤트 보상'] },
  { name: '시즌 패스 구매자', min: 300, span: 600, reasons: ['시즌 패스 지급'] },
  { name: '8월 신규 가입자', min: 120, span: 280, reasons: ['사전예약 보상', '이벤트 보상'] },
  { name: '휴면 복귀 유저', min: 40, span: 120, reasons: ['복귀 보상'] },
]

const ACCOUNTS = ['별하늘_01', '루티조아', '깃털모아', 'nightowl', '해질녘', '코코넛', '민트초코', '구름한점']
const ADMINS = ['김운영', '박운영', '이운영']

/** 개별 계정에 주는 사유. 한 사람에게 "서버 점검 보상"을 주지는 않는다. */
const ACCOUNT_REASONS = ['문의 응대 보상', '버그 보상', '개별 지급 요청']
const RECLAIM_REASONS = ['중복 지급 정정', '결제 취소', '어뷰징 회수', '오지급 정정']

/** 목 기준일. `Date.now()` 를 쓰면 새로고침마다 날짜가 밀려 디자인 대조가 안 된다. */
const BASE = new Date('2026-08-20T14:30:00')

function stamp(daysAgo: number, hour: number, minute: number): string {
  const d = new Date(BASE)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)]!

/** 이 아이템의 최근 지급·회수. **최신이 먼저다.** */
export function ledgerOf(itemKey: number): LedgerEntry[] {
  const r = rng(itemKey * 31 + 5)
  const count = 6 + Math.floor(r() * 6)

  const out: LedgerEntry[] = []
  let daysAgo = 0
  for (let i = 0; i < count; i += 1) {
    daysAgo += 1 + Math.floor(r() * 5)
    // 회수는 드물다 — 원본의 분포를 따른다.
    const kind: LedgerKind = r() < 0.25 ? 'RECLAIM' : 'GRANT'
    // 세그먼트로 뿌리는 편이 더 흔하다.
    const seg = r() < 0.55 ? pick(r, SEGMENTS) : null

    out.push({
      key: i,
      at: stamp(daysAgo, 9 + Math.floor(r() * 11), Math.floor(r() * 60)),
      kind,
      target: seg ? seg.name : pick(r, ACCOUNTS),
      // 개별 계정이면 하나뿐이다. 세그먼트일 때만 그 규모가 된다.
      qty: seg ? seg.min + Math.floor(r() * seg.span) : 1,
      reason:
        kind === 'RECLAIM'
          ? pick(r, RECLAIM_REASONS)
          : pick(r, seg ? seg.reasons : ACCOUNT_REASONS),
      by: pick(r, ADMINS),
    })
  }
  return out
}

/** 보유 추이 8주치(%). 마지막 값이 현재 보유율과 맞아떨어지게 끝낸다. */
export function trendOf(itemKey: number, own: number): number[] {
  // ⚠️ **보유율 0 이면 전부 0 이다.** 아래의 `Math.max(1, …)` 은 반올림이 0 으로 떨어지는
  //    것을 막으려고 둔 것인데, 방금 등록해서 보유가 아예 없는 아이템(`own: 0`)에는
  //    `1,1,1,1,1,1,1,0` 을 만들어 **있지도 않은 하락**을 차트에 그린다.
  if (own === 0) return Array(8).fill(0)

  const r = rng(itemKey * 17 + 3)
  const out: number[] = []
  // 8주 전부터 현재까지 완만히 올라오게 만든다. 마지막 칸은 실제 보유율.
  for (let i = 0; i < 7; i += 1) {
    const ratio = 0.55 + (i / 7) * 0.4 + (r() - 0.5) * 0.08
    out.push(Math.max(1, Math.round(own * ratio)))
  }
  out.push(own)
  return out
}
