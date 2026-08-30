/** 챌린지 엔티티 타입. */
import type { Slot } from '../item/types'

/** 주기 */
export type ChallengeKind = 'DAILY' | 'WEEKLY' | 'SEASON'

/** 진행 상태 */
export type ChallengeStatus = 'ACTIVE' | 'SCHEDULED' | 'ENDED'

export type Challenge = {
  key: number
  code: string
  kind: ChallengeKind
  title: string
  /** 달성 조건 (조건 코드 체계는 서버 스펙 확정 후) */
  cond: string
  goal: number
  /** 보상 젬 */
  gem: number
  /** 달성률 (%) */
  rate: number
  status: ChallengeStatus
  /**
   * **사람이 「중단」 을 눌렀는가.**
   *
   * ⚠️ 종료일이 지나 자동으로 끝난 것과 구분해야 한다. 둘을 `status: 'ENDED'` 하나로
   *    묶으면, 만료된 챌린지의 종료일을 미래로 고쳐도 되살아나지 않는다 — 운영자가
   *    분명히 고쳤는데 화면이 아무 반응을 안 한다.
   */
  stopped: boolean
  /**
   * 운영 기간. `YYYY-MM-DD`, 빈 문자열이면 「제한 없음」.
   *
   * ⚠️ **반복 주기와 다르다.** 「매일 05:00 초기화」 같은 건 `kind` 가 정하는 규칙이고
   *    (`REPEAT_LABEL`), 이건 그 챌린지가 언제부터 언제까지 살아 있는가다.
   */
  startAt: string
  endAt: string
  /** 누구에게 열려 있는가 */
  target: string
  desc: string
  rewardItem: { assetId: string; name: string; slot: Slot } | null
}

export const CHALLENGE_KINDS: ChallengeKind[] = ['DAILY', 'WEEKLY', 'SEASON']

/**
 * 폼이 편집하는 부분만.
 *
 * `key`·`code`·`rate`·`status` 는 **서버가 소유한다** — 달성률은 집계 결과이고
 * 상태는 기간에서 나온다(`challengeStatusOf`).
 */
export type ChallengeInput = Pick<
  Challenge,
  'title' | 'kind' | 'cond' | 'goal' | 'gem' | 'startAt' | 'endAt' | 'target' | 'desc' | 'rewardItem'
>
