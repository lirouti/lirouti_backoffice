/**
 * 모더레이션 목 데이터. 디자인 원본 `riruti-admin-mod.dc.html` 의 `REPORTS` 8행과
 * AI 심사 14일 시리즈를 옮겼다.
 *
 * ⚠️ **날짜는 오늘 기준으로 만든다.** 원본처럼 `8/13` 을 박아 두면 「오늘 접수」 가
 *    영원히 0 이 된다 (docs/ARCHITECTURE.md §21.3).
 */
import { daysAgo } from '@/shared/lib/today'

import type { AiDay, AiReview, Report, ReportReason, ReportState } from '@/domain/moderation'

/** 원본 `WHY` — 신고 폼의 선택지 순서 그대로 */
const WHY: ReportReason[] = [
  '실제와 무관한 사진',
  '예전 사진 재사용',
  '타인 사진 도용',
  '스팸 · 광고',
  '기타',
]

/** 원본 `NICKS` — 신고자로 돌려 쓰는 닉네임 풀 */
const NICKS = ['소이', '하루뭉치', '도토리', '버들', '풀잎', '해든', '모카', '밤톨']

type Row = [
  /** 며칠 전인가 */
  ago: number,
  /** `HH:mm` */
  time: string,
  /** 챌린지 이름. 제목은 날짜를 붙여 만든다 — 박아 두면 `at` 과 어긋난다 */
  challenge: string,
  who: string,
  state: ReportState,
  /**
   * 신고 사유 인덱스. **길이가 곧 신고 건수다.**
   *
   * ⚠️ 원본은 건수를 별도 숫자로 들어서 「신고 5건」 옆에 신고자가 3명만 나왔다.
   *    여기서는 원본의 앞자리를 그대로 두고 **건수만큼 늘렸다** (§23.1).
   */
  why: number[],
  /** 작성자 이력 — 누적 인증 · 피신고 · 숨김 확정 · 제재 */
  author: [certs: number, reports: number, hidden: number, bans: number],
]

/** ⚠️ **최신순으로 둔다.** 서버가 정렬해 주는 자리라 목이 흐트러져 있으면 화면만 이상해진다 */
// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const ROWS: Row[] = [
  [0, '20:14', '주 3회 러닝', '새벽러너', '대기', [2, 0, 1], [302, 1, 0, 0]],
  [0, '06:58', '아침 6시 기상', '민트초코', '대기', [0, 1, 0, 2, 0], [41, 6, 2, 1]],
  [1, '22:41', '하루 한 챕터', '모카', '대기', [3, 3, 1, 0], [55, 3, 1, 0]],
  [1, '07:02', '아침 6시 기상', '콩순이', '대기', [1, 1, 0, 4, 2, 3], [8, 4, 3, 1]],
  [2, '19:30', '물 2L 마시기', '밤톨', '대기', [4, 0, 1], [174, 1, 0, 0]],
  [3, '08:22', '스트레칭', '도토리', '숨김 유지', [2, 2, 1, 0, 3, 4, 1], [213, 5, 4, 1]],
  [4, '11:20', '러닝', '민트초코', '숨김 해제', [1, 0, 3, 2], [41, 6, 2, 1]],
  [5, '21:55', '독서', '해든', '숨김 해제', [3, 4, 0], [89, 2, 0, 0]],
]

/** `YYYY-MM-DD HH:mm` 에 분을 더한다. 날짜를 넘어가면 다음 날로 넘긴다 */
function addMinutes(at: string, minutes: number): string {
  const [d, t] = at.split(' ')
  const [y, mo, dd] = d!.split('-').map(Number)
  const [h, mi] = t!.split(':').map(Number)
  const ms = Date.UTC(y!, mo! - 1, dd!, h!, mi!) + minutes * 60_000
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
}

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * 전체 신고. 모듈 캐시라 새로고침하면 처리 결과가 사라진다 — 목이라서다.
 *
 * ⚠️ **`decideReport` 가 이 배열을 직접 고친다.** 매번 새로 만들면 처리한 결과가
 *    다음 조회에서 되돌아간다.
 */
const REPORTS: Report[] = ROWS.map(([ago, time, challenge, who, state, why, author], key) => {
  const date = daysAgo(ago)
  const at = `${date} ${time}`
  const [, m, d] = date.split('-')
  return {
    key,
    code: `rep_${4820 + key * 31}`,
    title: `${Number(m)}/${pad(Number(d))} ${challenge} 인증`,
    who,
    at,
    state,
    // 신고는 인증보다 나중이다 — 원본은 전부 인증 시각으로 찍어서 같은 분에 다섯 명이 신고한 꼴이었다.
    reporters: why.map((w, k) => ({
      nick: NICKS[(key + k) % NICKS.length]!,
      at: addMinutes(at, (k + 1) * 37),
      why: WHY[w]!,
    })),
    author: { certs: author[0], reports: author[1], hidden: author[2], bans: author[3] },
  }
})

export const allReports = (): Report[] => REPORTS

/** 신고 하나의 처리 결과를 바꾼다. 없는 key 면 `undefined` */
export function decideReport(key: number, next: ReportState): Report | undefined {
  const found = REPORTS.find((r) => r.key === key)
  if (!found) return undefined
  found.state = next
  return found
}

/**
 * 일별 심사 건수와 통과율. 원본 `aiSeries`(73–94) 를 **통과율(%)** 로 읽었다.
 *
 * ⚠️ **원본은 이 값을 「승인」 막대 높이로 쓰면서 옆에 「대기」 를 쌓았다.** 그러면
 *    통과율 선(87%)의 분모가 화면 어디에도 없다 — 반려가 빠져 있기 때문이다.
 *    여기서는 **승인 + 반려**로 쌓아 선과 막대가 같은 것을 말하게 했다 (§23.3).
 */
const RATE = [82, 76, 91, 88, 79, 94, 86, 90, 73, 88, 92, 85, 89, 87]
const JUDGED = [
  1120, 1043, 1288, 1197, 1064, 1352, 1216, 1301, 986, 1244, 1330, 1178, 1259, 1284,
]

export const allAiDays = (): AiDay[] =>
  RATE.map((rate, i) => {
    const judged = JUDGED[i]!
    const passed = Math.round((judged * rate) / 100)
    return { date: daysAgo(RATE.length - 1 - i), passed, rejected: judged - passed }
  })

type ReviewRow = [time: string, who: string, title: string, tookSec: number | null]

/**
 * 최근 심사. **대기 11건은 아침 인증이 몰린 08시대**라 아직 큐에 남아 있다.
 *
 * ⚠️ **「심사 대기」 지표를 이 목록에서 세므로 둘이 어긋날 수 없다.** 원본은 지표에
 *    11 을 적고 목록에는 대기 2건만 뒀다 (§23.3).
 */
// prettier-ignore
const TODAY_REVIEWS: ReviewRow[] = [
  ['08:14', '풀잎', '아침 6시 기상', null],
  ['08:13', '소이', '아침 6시 기상', null],
  ['08:12', '밤톨', '주 3회 러닝', null],
  ['08:11', '도토리', '물 2L 마시기', null],
  ['08:10', '해든', '아침 6시 기상', null],
  ['08:09', '모카', '독서 30분', null],
  ['08:08', '버들', '스트레칭', null],
  ['08:07', '하루뭉치', '하루 한 챕터', null],
  ['08:06', '콩순이', '아침 6시 기상', null],
  ['08:05', '새벽러너', '야간 러닝', null],
  ['08:04', '민트초코', '아침 6시 기상', null],
  ['08:02', '소이', '아침 6시 기상', 2.1],
  ['07:58', '밤톨', '주 3회 러닝', 1.8],
  ['07:41', '도토리', '물 2L 마시기', 2.9],
  ['07:22', '버들', '스트레칭', 3.4],
  ['06:59', '해든', '아침 6시 기상', 2.0],
  ['06:44', '모카', '독서 30분', 2.2],
]

// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const YESTERDAY_REVIEWS: ReviewRow[] = [
  ['22:15', '새벽러너', '야간 러닝', 2.6],
  ['21:04', '하루뭉치', '하루 한 챕터', 1.9],
  ['20:31', '풀잎', '물 2L 마시기', 2.3],
]

const toReview =
  (ago: number) =>
  ([time, who, title, tookSec]: ReviewRow, i: number): AiReview => ({
    key: ago * 100 + i,
    at: `${daysAgo(ago)} ${time}`,
    who,
    title,
    verdict: tookSec === null ? '대기' : '승인',
    tookSec,
  })

export const allAiReviews = (): AiReview[] => [
  ...TODAY_REVIEWS.map(toReview(0)),
  ...YESTERDAY_REVIEWS.map(toReview(1)),
]

/**
 * AI 심사 스위치. **모듈 변수라 새로고침하면 켜진 상태로 돌아간다** — 목이라서다.
 * 서버가 생기면 운영 설정 테이블의 한 행이 된다.
 */
let aiEnabled = true

export const isAiEnabled = (): boolean => aiEnabled

export function setAiEnabled(on: boolean): boolean {
  aiEnabled = on
  return aiEnabled
}
