/**
 * 지급·회수 한 줄.
 *
 * 아이템 상세의 「최근 지급·회수 이력」이 첫 사용처지만, 재화·쿠폰 같은 다른 것도
 * 같은 모양으로 오간다. 나중에 운영 화면(지급·회수 관리)이 이 타입을 그대로 쓴다.
 *
 * 규칙(정렬·필터)이 아직 없어 **폴더가 아니라 파일**이다 —
 * 생기면 `domain/ledger/{types,rules,labels}` 로 승격한다 (docs/ARCHITECTURE.md §4.4.1).
 */
import type { BadgeTone } from '@/shared/ui/tone'

/** 준 것인가 거둔 것인가 */
export type LedgerKind = 'GRANT' | 'RECLAIM'

export type LedgerEntry = {
  key: number
  /**
   * 일시. **`YYYY-MM-DD HH:mm`** — 서버(Spring)의 `LocalDateTime` 이 이 모양으로 온다.
   * 초는 안 온다. 표에 그대로 찍는다.
   */
  at: string
  kind: LedgerKind
  /**
   * 받은/거둔 대상. **개별 계정(`별하늘_01`)이거나 세그먼트(`전체 유저`)다.**
   * 세그먼트로 한 번에 뿌리는 것이 운영에서 훨씬 흔하다.
   */
  target: string
  /**
   * ⚠️ **몇 **계정**에 나갔는가.** 한 사람이 받은 개수가 아니다 —
   *    착용 아이템은 한 계정에 하나뿐이라 "한 명이 21개" 같은 건 없다.
   *    그래서 `target` 이 개별 계정이면 이 값은 **항상 1** 이고,
   *    세그먼트일 때만 그 규모(수백)가 된다.
   *
   * 나중에 재화(젬) 원장이 이 타입을 쓰면 거기서는 **계정당 금액**이 된다.
   * 뜻이 달라지는 자리라 화면마다 열 이름을 정확히 붙일 것.
   *
   * **항상 양수다** — 방향은 `kind` 가 갖는다. 회수를 음수로 두면 합계를 낼 때
   * 부호를 두 번 뒤집는 실수가 난다.
   */
  qty: number
  reason: string
  /** 처리한 관리자 */
  by: string
}

export const LEDGER_KIND_LABEL: Record<LedgerKind, string> = {
  GRANT: '지급',
  RECLAIM: '회수',
}

export const LEDGER_KIND_TONE: Record<LedgerKind, BadgeTone> = {
  GRANT: 'success',
  RECLAIM: 'danger',
}
