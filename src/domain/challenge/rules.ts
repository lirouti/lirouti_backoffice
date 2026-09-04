/** 챌린지 도메인 규칙. */
import { CHALLENGE_CONDS } from './labels'
import type { Challenge, ChallengeInput, ChallengeKind, ChallengeStatus } from './types'

/** 진행 중인 것만, 최대 N개. 음수는 0 으로 — `slice(0, -1)` 이 되면 계약과 반대가 된다 */
export function activeChallenges(list: Challenge[], n?: number): Challenge[] {
  const active = list.filter((c) => c.status === 'ACTIVE')
  return n == null ? active : active.slice(0, Math.max(0, n))
}

export function byKind(list: Challenge[], kind?: ChallengeKind): Challenge[] {
  return kind ? list.filter((c) => c.kind === kind) : list
}

/** 보상에 아이템이 붙는가 */
export const hasItemReward = (c: Challenge): boolean => c.rewardItem !== null

/**
 * 보상 표시. 「젬 · 아이템」 을 있는 것만 이어 붙인다.
 *
 * ⚠️ **`shared/lib` 의 `gem()` 을 그대로 쓰면 안 된다.** 그건 아이템 **가격** 포맷터라
 *    0 을 「무료」 로 옮기는데, 보상이 0 젬인 것은 "공짜" 가 아니라 **젬을 안 준다**는
 *    뜻이다. 「무료 · 금세공 왕관」 이라는 말이 안 되는 문구가 나온다.
 */
export function rewardLabel(c: Pick<Challenge, 'gem' | 'rewardItem'>): string {
  const parts: string[] = []
  if (c.gem > 0) parts.push(`${c.gem.toLocaleString()} 젬`)
  if (c.rewardItem) parts.push(c.rewardItem.name)
  // 검증이 막지만(둘 다 없을 수 없다) 표시 함수는 스스로 방어한다.
  return parts.length > 0 ? parts.join(' · ') : '없음'
}

/** 운영 기간 표시. 한쪽만 있으면 열린 구간으로 쓴다 */
export function periodLabel(c: Pick<Challenge, 'startAt' | 'endAt'>): string {
  if (!c.startAt && !c.endAt) return '제한 없음'
  if (!c.endAt) return `${c.startAt} ~`
  if (!c.startAt) return `~ ${c.endAt}`
  return `${c.startAt} ~ ${c.endAt}`
}

/**
 * 상태를 기간에서 정한다. **등록과 수정이 같은 규칙을 쓴다.**
 *
 * `today` 를 받는 이유는 순수 함수로 두기 위해서다 — 안에서 `new Date()` 를 부르면
 * 테스트가 실행한 날에 따라 달라진다. 부르는 쪽(파사드)이 오늘을 준다.
 *
 * ⚠️ **「중단」 만 되살아나지 않는다.** 사람이 내린 결정이라 날짜가 뒤집으면 안 된다.
 *    반대로 **종료일이 지나 자동으로 끝난 것은 날짜를 고치면 되살아나야 한다** — 그게
 *    운영자가 종료일을 미래로 미는 이유다. 둘을 `status` 하나로 묶으면 구분할 수 없어
 *    `stopped` 를 따로 받는다.
 *
 * @param today `YYYY-MM-DD`
 * @param stopped 사람이 「중단」 을 눌렀는가. 등록이면 `false`.
 */
export function challengeStatusOf(
  input: Pick<ChallengeInput, 'startAt' | 'endAt'>,
  today: string,
  stopped = false,
): ChallengeStatus {
  if (stopped) return 'ENDED'
  if (input.startAt && input.startAt > today) return 'SCHEDULED'
  if (input.endAt && input.endAt < today) return 'ENDED'
  return 'ACTIVE'
}

/** 어느 칸이 왜 막혔는가. 비어 있으면 저장할 수 있다 */
export type ChallengeInputErrors = Partial<Record<keyof ChallengeInput, string>>

/**
 * 등록·수정 폼의 검증.
 *
 * ⚠️ **화면의 체크리스트도 이걸 쓴다** — 규칙이 갈라지면 체크는 초록인데 저장이 막힌다
 * (docs/ARCHITECTURE.md §18.7).
 */
export function validateChallenge(input: ChallengeInput): ChallengeInputErrors {
  const errors: ChallengeInputErrors = {}

  if (!input.title.trim()) errors.title = '제목을 입력하세요.'

  // 목록에 없는 조건은 서버가 셀 수 없다 — 달성이 영영 안 잡힌다.
  if (!CHALLENGE_CONDS.includes(input.cond)) errors.cond = '조건을 목록에서 고르세요.'

  // 0 이면 조건을 걸어 놓고 아무것도 세지 않는 챌린지가 된다.
  if (!Number.isFinite(input.goal) || input.goal <= 0)
    errors.goal = '목표치는 1 이상이어야 합니다.'

  // 보상이 아예 없으면 달성해도 받는 게 없다. 젬이 0 이면 아이템이라도 있어야 한다.
  // ⚠️ `NaN`·`Infinity` 는 `< 0` 도 `=== 0` 도 아니라 두 검사를 **모두 빠져나간다.**
  if (!Number.isFinite(input.gem) || input.gem < 0)
    errors.gem = '젬 보상은 0 이상인 수여야 합니다.'
  else if (input.gem === 0 && !input.rewardItem)
    errors.gem = '젬이 0 이면 보상 아이템을 골라야 합니다.'

  // 둘 다 있을 때만 본다 — 빈 값은 「제한 없음」 이라 비교 대상이 아니다.
  if (input.startAt && input.endAt && input.endAt < input.startAt) {
    errors.endAt = '종료가 시작보다 빠릅니다.'
  }

  return errors
}

/** 등록 화면의 초기값. 주기·조건은 원본처럼 첫 번째가 골라져 있다 */
export function emptyChallengeInput(): ChallengeInput {
  return {
    title: '',
    kind: 'DAILY',
    cond: CHALLENGE_CONDS[0]!,
    goal: 3,
    gem: 30,
    startAt: '',
    endAt: '',
    target: '전체 유저',
    desc: '',
    rewardItem: null,
  }
}

/** `Challenge` 에서 폼이 편집하는 부분만 (수정 화면의 초기값) */
export function toChallengeInput(c: Challenge): ChallengeInput {
  const { title, kind, cond, goal, gem, startAt, endAt, target, desc, rewardItem } = c
  return { title, kind, cond, goal, gem, startAt, endAt, target, desc, rewardItem }
}
