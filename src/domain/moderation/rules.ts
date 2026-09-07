/** 모더레이션 도메인 규칙. */
import type { AiDay, AiReview, AiVerdict, Report, ReportState } from './types'

/** 신고 목록 탭. **「미검토」 가 기본**이다 — 이 화면에 오는 이유가 그것이다 */
export const REPORT_TABS = ['미검토', '검토 완료', '전체'] as const
export type ReportTab = (typeof REPORT_TABS)[number]

/**
 * 신고 건수. **신고자 배열의 길이**이지 따로 든 숫자가 아니다.
 *
 * ⚠️ 원본은 건수를 별도 필드로 들고 있어서 「신고 5건」 옆에 신고자가 3명만 나왔다.
 *    운영자가 "2명은 어디 갔나" 를 물을 수 없는 화면이 된다 (docs/ARCHITECTURE.md §23.1).
 */
export const reportCount = (r: Report): number => r.reporters.length

/**
 * 이 수 이상 신고가 쌓이면 **먼저 볼 것**이 된다.
 *
 * **고정이 소수여야 고정이다.** 3으로 낮추면 목 8건 중 6건이 걸리는데, 목록 대부분에
 * 붙은 표시는 아무것도 구별하지 못한다.
 *
 * ⚠️ **넘겼다고 가려지지 않는다.** 이건 처분이 아니라 **보라는 신호**다 — 자동 숨김을
 *    걷어낸 것이 이 정책의 출발점이다(§23.0).
 * TODO(운영 설정 API 가 생기면): `ops` 설정 테이블의 한 행으로 뺀다
 */
export const REPORT_THRESHOLD = 5

/**
 * 기준치를 넘겼는가.
 *
 * ⚠️ **단조 증가다.** 신고를 취소하는 경로가 없어서 한 번 넘으면 계속 넘는다 —
 *    「기준 초과」 는 시점이 아니라 **누적된 사실**이라, 검토를 마친 건에서도 지우지 않는다.
 */
export const isOverThreshold = (r: Report): boolean => reportCount(r) >= REPORT_THRESHOLD

export function filterReports(list: Report[], tab: ReportTab): Report[] {
  if (tab === '미검토') return list.filter((r) => r.state === '미검토')
  if (tab === '검토 완료') return list.filter((r) => r.state !== '미검토')
  return list
}

/**
 * 큐 순서. **먼저 볼 것이 위로 온다.**
 *
 * 자동 숨김이 없어진 뒤로 「빨리 보는 것」 이 유일한 방어선이라, 기준을 넘긴 미검토 건을
 * 맨 위로 끌어올린다 (docs/ARCHITECTURE.md §23.4).
 *
 * ⚠️ **검토가 끝난 건은 기준을 넘겼어도 올리지 않는다.** 판단이 끝나 급할 것이 없고,
 *    올리면 「먼저 볼 것」 신호가 희석된다.
 *
 * ⚠️ **원본 배열을 건드리지 않는다.** `Array#sort` 는 제자리 정렬이라 캐시된 배열을 그대로
 *    넘기면 **다음 조회의 순서까지 바뀐다** (§25.2 에서 이미 밟은 함정).
 */
export function sortReports(list: Report[]): Report[] {
  return [...list].sort(
    (a, b) =>
      queueRank(a) - queueRank(b) ||
      reportCount(b) - reportCount(a) ||
      b.at.localeCompare(a.at) ||
      // 동률을 key 로 고정한다 — 새로고침마다 순서가 바뀌면 안 된다.
      a.key - b.key,
  )
}

/** 목록 위 지표 */
export type ReportSummary = {
  /**
   * 기준 초과 & 미검토. **`waiting` 의 부분집합이다** — 둘을 더하면 안 된다.
   * 이 화면에 온 이유라서 첫 칸에 놓는다.
   */
  urgent: number
  /** 아직 사람이 안 본 건수 */
  waiting: number
  /** 오늘 올라온 인증 중 신고된 건수 */
  today: number
  /** 관리자가 실제로 내린 건수 */
  hidden: number
}

/**
 * 지표. **거르기 전 전체로 낸다** — 탭마다 「우선 검토」 가 바뀌면 밀린 양이 아니라
 * 지금 보고 있는 탭의 행 수가 된다.
 *
 * @param today `YYYY-MM-DD`. 안에서 읽으면 테스트가 실행한 날에 따라 달라진다.
 */
export function summarizeReports(list: Report[], today: string): ReportSummary {
  const waiting = list.filter((r) => r.state === '미검토')
  return {
    urgent: waiting.filter(isOverThreshold).length,
    waiting: waiting.length,
    today: list.filter((r) => r.at.startsWith(today)).length,
    hidden: list.filter((r) => r.state === '숨김').length,
  }
}

/**
 * 이 결정을 내릴 수 있는가.
 *
 * **이미 그 상태면 못 누른다.** 「숨김」 인 건에 다시 「숨김」 을 누르면 아무 일도
 * 안 일어나는데 버튼은 반응한 것처럼 보인다.
 *
 * ⚠️ **반대 결정은 막지 않는다.** 잘못 내린 건을 되돌리는 것이 이 화면의 목적이라,
 *    한 번 숨긴 건도 다시 노출로 바꿀 수 있어야 한다.
 */
export const canDecide = (r: Report, next: ReportState): boolean => r.state !== next

/**
 * 지금 보던 행이 목록에서 빠졌을 때 다음에 고를 행.
 *
 * 「미검토」 탭에서 처리하면 그 행이 목록에서 사라진다. 아무것도 안 고르면 오른쪽이
 * 빈 화면이 되어 **매번 다음 건을 손으로 눌러야 한다** — 밀린 걸 훑는 화면에서
 * 그건 일을 두 배로 만든다.
 *
 * 뒤 행을 먼저 고르고, 마지막 행이었으면 앞 행으로 간다. 남은 게 없으면 `null`.
 */
export function nextAfterRemoved(list: Report[], removedKey: number): number | null {
  const at = list.findIndex((r) => r.key === removedKey)
  if (at === -1) return list[0]?.key ?? null
  const rest = list.filter((r) => r.key !== removedKey)
  if (rest.length === 0) return null
  return (list[at + 1] ?? list[at - 1])!.key
}

/** AI 심사 목록 탭 */
export const AI_TABS = ['전체', '승인', '대기'] as const
export type AiTab = (typeof AI_TABS)[number]

export function filterAiReviews(list: AiReview[], tab: AiTab): AiReview[] {
  if (tab === '전체') return list
  return list.filter((r) => r.verdict === (tab as AiVerdict))
}

/** 목록 위 지표 */
export type AiSummary = {
  /** 오늘 심사한 건수 (승인 + 반려) */
  judgedToday: number
  /** 통과율 (%). 정수로 반올림 */
  passRate: number
  /** 지금 큐에 남아 있는 건수 */
  queued: number
  /** 평균 소요 (초). 소수 첫째 자리 */
  avgSec: number
}

/**
 * 통과율 (%).
 *
 * ⚠️ **분모는 승인 + 반려다.** 대기는 아직 결과가 없어서 넣으면 통과율이 시간에 따라
 *    저절로 오른다 — 심사가 나아진 게 아니라 큐가 비워진 것뿐인데 그렇게 읽힌다.
 */
export function passRate(days: AiDay[]): number {
  const judged = days.reduce((sum, d) => sum + d.passed + d.rejected, 0)
  if (judged === 0) return 0
  return Math.round((days.reduce((sum, d) => sum + d.passed, 0) / judged) * 100)
}

/**
 * 평균 소요 (초).
 *
 * ⚠️ **대기 건은 빼고 낸다.** `tookSec` 이 `null` 인 것을 0 으로 세면 아직 안 끝난
 *    심사가 "0초에 끝났다" 가 되어 평균을 끌어내린다.
 */
export function avgTookSec(list: AiReview[]): number {
  const done = list.filter((r) => r.tookSec !== null)
  if (done.length === 0) return 0
  const sum = done.reduce((acc, r) => acc + (r.tookSec ?? 0), 0)
  return Math.round((sum / done.length) * 10) / 10
}

/**
 * @param today `YYYY-MM-DD`. 오늘 자 집계 행을 고르는 데 쓴다
 */
export function summarizeAi(days: AiDay[], list: AiReview[], today: string): AiSummary {
  const t = days.find((d) => d.date === today)
  return {
    judgedToday: t ? t.passed + t.rejected : 0,
    passRate: passRate(days),
    queued: list.filter((r) => r.verdict === '대기').length,
    avgSec: avgTookSec(list),
  }
}

/** 큐 묶음 번호. 낮을수록 위로 온다 */
function queueRank(r: Report): number {
  if (r.state !== '미검토') return 2
  return isOverThreshold(r) ? 0 : 1
}
