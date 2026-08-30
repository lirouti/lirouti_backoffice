/** 운영 규칙 — 공지 · 이벤트 · 지급/회수. */
import type { User } from '../user/types'
import type {
  GrantAsset,
  GrantInput,
  GrantLog,
  Notice,
  OpsEvent,
  PeriodStatus,
} from './types'

/**
 * 기간에서 상태를 낸다. **저장하지 않는다** — 손으로 들고 있으면 기간이 지나도
 * 「게시중」 인 채로 남는다.
 *
 * `endAt` 이 비면 상시라 끝나지 않는다.
 *
 * @param today `YYYY-MM-DD`. 안에서 읽으면 테스트가 실행한 날에 따라 달라진다.
 */
export function periodStatusOf(startAt: string, endAt: string, today: string): PeriodStatus {
  if (startAt && startAt > today) return 'SCHEDULED'
  if (endAt && endAt < today) return 'ENDED'
  return 'ACTIVE'
}

/** `2026-08-01 ~ 2026-08-14` → `08-01 ~ 08-14`. 상시면 「상시」 */
export function periodLabel(startAt: string, endAt: string): string {
  if (!endAt) return '상시'
  return `${startAt.slice(5)} ~ ${endAt.slice(5)}`
}

/** 앱 공지 맨 위에 붙일 수 있는 권장 개수 */
export const PIN_LIMIT = 2

/**
 * 고정한 공지 수. **게시 중인 것만 센다.**
 *
 * ⚠️ 끝난 공지에 고정 표시가 남아 있어도 앱에는 안 뜬다. 그것까지 세면 자리가
 *    남았는데도 「가득 참」 으로 보인다.
 *
 * @param today `YYYY-MM-DD`
 */
export const pinnedCount = (list: Notice[], today: string): number =>
  list.filter((n) => n.pinned && periodStatusOf(n.startAt, n.endAt, today) === 'ACTIVE').length

/** 목록 위 지표 */
export type NoticeSummary = {
  active: number
  scheduled: number
  pinned: number
  /** 고정이 권장치를 넘었는가 */
  overPinned: boolean
}

export function summarizeNotices(list: Notice[], today: string): NoticeSummary {
  const count = (s: PeriodStatus): number =>
    list.filter((n) => periodStatusOf(n.startAt, n.endAt, today) === s).length
  const pinned = pinnedCount(list, today)
  return { active: count('ACTIVE'), scheduled: count('SCHEDULED'), pinned, overPinned: pinned > PIN_LIMIT }
}

/** 진행 중인 이벤트가 먼저, 그다음 예약, 끝난 것이 뒤 */
const EVENT_ORDER: Record<PeriodStatus, number> = { ACTIVE: 0, SCHEDULED: 1, ENDED: 2 }

/**
 * 카드 정렬. **지금 돌아가는 것이 위**여야 한다 — 끝난 이벤트가 섞여 있으면
 * 무엇이 라이브인지 한눈에 안 보인다.
 */
export function sortEvents(list: OpsEvent[], today: string): OpsEvent[] {
  return [...list].sort((a, b) => {
    const d = EVENT_ORDER[periodStatusOf(a.startAt, a.endAt, today)] -
      EVENT_ORDER[periodStatusOf(b.startAt, b.endAt, today)]
    // 같은 상태 안에서는 최근 시작한 것이 위. 동률이면 key 로 고정한다.
    return d || b.startAt.localeCompare(a.startAt) || a.key - b.key
  })
}

/**
 * 쉼표로 적은 회원 uid 를 목록으로. **공백과 빈 칸을 버리고 중복을 없앤다.**
 *
 * ⚠️ 운영자는 스프레드시트에서 복사해 붙인다 — 줄바꿈과 뒤따르는 쉼표가 섞여 온다.
 */
export function parseUserIds(raw: string): string[] {
  const seen = new Set<string>()
  for (const piece of raw.split(/[,\s]+/)) {
    const id = piece.trim().toUpperCase()
    if (id) seen.add(id)
  }
  return [...seen]
}

/** 적어 낸 id 가 실제로 있는가 */
export type TargetCheck = {
  found: User[]
  /** 회원 목록에 없는 id. **오타가 여기서 잡힌다** */
  missing: string[]
}

/**
 * 「개별」 대상 확인.
 *
 * ⚠️ **탈퇴 회원도 못 찾은 것으로 본다.** 계정이 없으니 줄 곳도 없는데, 조용히
 *    넘어가면 운영자는 준 줄 안다 (docs/ARCHITECTURE.md §25.3).
 */
export function checkTargets(ids: string[], users: User[]): TargetCheck {
  const found: User[] = []
  const missing: string[] = []
  for (const id of ids) {
    const hit = users.find((u) => u.uid === id && u.status !== 'LEFT')
    if (hit) found.push(hit)
    else missing.push(id)
  }
  return { found, missing }
}

/** 「전체」 대상 수. **탈퇴는 뺀다** */
export const activeUserCount = (users: User[]): number =>
  users.filter((u) => u.status !== 'LEFT').length

/** 어느 칸이 왜 막혔는가 */
export type GrantErrors = Partial<Record<'who' | 'qty' | 'itemKey' | 'why', string>>

/** 재화인가 (수량을 받는가) */
export const isCoin = (asset: GrantAsset): boolean => asset !== '아이템'

/**
 * 지급·회수 폼 검증.
 *
 * ⚠️ **사유는 언제나 필수다.** 되돌릴 수 없고 감사 로그에 남는 처리라, 나중에
 *    "왜 줬나" 를 답할 수 있어야 한다.
 */
export function validateGrant(input: GrantInput): GrantErrors {
  const errors: GrantErrors = {}

  if (input.target === '개별' && parseUserIds(input.who).length === 0) {
    errors.who = '대상 회원 ID 를 입력하세요.'
  }
  if (isCoin(input.asset) && input.qty <= 0) {
    errors.qty = '수량은 1 이상이어야 합니다.'
  }
  if (!isCoin(input.asset) && input.itemKey === null) {
    errors.itemKey = '지급할 아이템을 고르세요.'
  }
  if (!input.why.trim()) {
    errors.why = '사유를 입력하세요.'
  }
  return errors
}

/** 목록 위 지표 */
export type GrantSummary = {
  granted: number
  reclaimed: number
  /** 지급한 재화 총량. 아이템은 안 센다 */
  coins: number
}

/**
 * ⚠️ **아이템과 재화를 한 숫자로 더하지 않는다.** 「젬 1,000 + 아이템 1」 을 1,001 로
 *    세면 아무 뜻도 없는 값이 된다.
 */
export function summarizeGrants(list: GrantLog[]): GrantSummary {
  const coinRows = list.filter((g) => g.kind === '지급' && isCoin(g.asset))
  return {
    granted: list.filter((g) => g.kind === '지급').length,
    reclaimed: list.filter((g) => g.kind === '회수').length,
    coins: coinRows.reduce((sum, g) => sum + g.qty, 0),
  }
}
