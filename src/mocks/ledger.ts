/**
 * 지급·회수 목 데이터.
 *
 * 아이템마다 **결정적으로** 만든다 — 시드에 아이템 키를 섞어, 같은 아이템은
 * 새로고침해도 같은 이력이 나온다 (docs/ARCHITECTURE.md §7.2).
 */
import { rng } from '@/shared/lib/rng'

import type { LedgerEntry, LedgerKind } from '@/domain/ledger'

const TARGETS = ['별하늘_01', '루티조아', '깃털모아', 'nightowl', '해질녘', '코코넛', '민트초코', '구름한점']
const ADMINS = ['김운영', '박운영', '이운영']

const GRANT_REASONS = ['이벤트 보상', '문의 응대 보상', '시즌 패스 지급', '버그 보상', '사전예약 보상']
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
    const reasons = kind === 'GRANT' ? GRANT_REASONS : RECLAIM_REASONS
    out.push({
      key: i,
      at: stamp(daysAgo, 9 + Math.floor(r() * 11), Math.floor(r() * 60)),
      kind,
      target: TARGETS[Math.floor(r() * TARGETS.length)]!,
      qty: 1 + Math.floor(r() * 40),
      reason: reasons[Math.floor(r() * reasons.length)]!,
      by: ADMINS[Math.floor(r() * ADMINS.length)]!,
    })
  }
  return out
}

/** 보유 추이 8주치(%). 마지막 값이 현재 보유율과 맞아떨어지게 끝낸다. */
export function trendOf(itemKey: number, own: number): number[] {
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
