/**
 * 모더레이션 엔티티 — 신고 처리와 AI 심사.
 *
 * 두 화면이 한 내비 그룹(`mod`)이고 **같은 대상**(회원이 올린 인증 사진)을 다룬다.
 * AI 는 **올라오는 시점**을 심사하고, 신고는 **올라온 뒤**에 들어온다.
 */

/**
 * 신고 처리 결과.
 *
 * ⚠️ **신고만으로는 아무것도 가려지지 않는다.** 예전에는 신고가 기준치를 넘으면 자동으로
 *    숨겨졌지만(그래서 상태가 「대기 · 숨김 유지 · 숨김 해제」 였다), 지금은 가리는 것이
 *    **관리자의 조작뿐**이다 (docs/ARCHITECTURE.md §23.0).
 *
 * ⚠️ **그래서 위험의 방향이 바뀌었다.** 예전의 사고는 「오신고로 정상 인증이 가려짐」
 *    이었고 숨김을 풀면 원상복구였다. 지금의 사고는 「문제 사진이 계속 보임」 이고
 *    **되돌릴 수 없다** — 이미 본 사람은 봤다. 기준 초과 표시(§23.3)와 최상단
 *    정렬(§23.4)이 그 몫을 대신한다.
 */
export type ReportState =
  /** 신고만 들어왔다. **사진은 보이는 중이다** */
  | '미검토'
  /** 관리자가 보고 오신고로 판단했다. 사진은 그대로 보인다 */
  | '노출 유지'
  /** 관리자가 내렸다. **여기서만 사진이 안 보이게 된다** */
  | '숨김'

/**
 * 신고자가 고른 사유. **우리가 정하는 값이 아니라 앱의 신고 폼이 정한다.**
 *
 * 「기타」 만 글을 따로 받는다 — 나머지 넷은 문구가 이것으로 확정이라 덧붙을 것이 없다.
 */
export type ReportReason =
  '실제와 무관한 사진' | '예전 사진 재사용' | '타인 사진 도용' | '스팸 · 광고' | '기타'

/** 글을 따로 받는 사유. 이 값일 때만 `Reporter.detail` 이 채워진다 */
export const REASON_WITH_DETAIL: ReportReason = '기타'

/**
 * 「기타」 본문의 최대 길이(자). **앱의 입력 폼이 막는 값**이라 우리가 정하지 않는다.
 *
 * 화면이 이 수를 아는 이유는 딱 하나 — 신고자 일곱이 각자 이만큼 쓰면 카드가 화면 밖까지
 * 늘어나므로 접어 두어야 하기 때문이다 (docs/ARCHITECTURE.md §23.7).
 */
export const REASON_DETAIL_MAX = 500

export type Reporter = {
  nick: string
  /** `YYYY-MM-DD HH:mm` */
  at: string
  why: ReportReason
  /**
   * 「기타」 를 고른 사람이 직접 쓴 글. 최대 `REASON_DETAIL_MAX` 자.
   *
   * ⚠️ **`why !== '기타'` 면 빈 문자열이다.** 정해진 문구를 고른 사람에게는 받는 칸 자체가
   *    없다. 옵셔널로 두지 않은 이유는 「안 왔다」 와 「비어 있다」 를 화면이 구분할 필요가
   *    없어서다 — 둘 다 그릴 것이 없다.
   *
   * ⚠️ **유저가 쓴 글이다.** 줄바꿈이 들어 있고 길이가 제각각이라 배지로 그리면 안 된다
   *    (docs/ARCHITECTURE.md §23.7).
   */
  detail: string
}

/**
 * 작성자의 누적 이력. **이 신고 하나가 아니라 사람을 본다** — 처음 걸린 사람과
 * 상습범을 같은 화면에서 구분해야 판단이 달라진다.
 */
export type AuthorHistory = {
  /** 누적 인증 횟수 */
  certs: number
  /** 피신고 건수 */
  reports: number
  /** 숨김으로 확정된 건수 */
  hidden: number
  /** 제재 횟수. `0` 이면 이력 없음 */
  bans: number
}

export type Report = {
  key: number
  /** `rep_4820` — 문의·감사 로그와 맞춰 보는 값이라 등폭으로 쓴다 */
  code: string
  /** 인증 제목. 챌린지 이름이 그대로 들어온다 */
  title: string
  /** 작성자 닉네임 */
  who: string
  /** `YYYY-MM-DD HH:mm` — 인증이 올라온 시각 */
  at: string
  state: ReportState
  /**
   * 이 인증을 신고한 사람들.
   *
   * ⚠️ **신고 건수는 이 배열의 길이다.** 따로 든 숫자를 쓰지 말 것 —
   *    원본이 그렇게 했다가 「신고 5건」 옆에 신고자 3명이 나왔다
   *    (docs/ARCHITECTURE.md §23.1).
   */
  reporters: Reporter[]
  author: AuthorHistory
}

/** AI 심사 결과. **「반려」 가 없다** — 반려는 기록을 남기지 않는다 (§23.8) */
export type AiVerdict = '승인' | '대기'

export type AiReview = {
  key: number
  /** `YYYY-MM-DD HH:mm` */
  at: string
  who: string
  /** 챌린지 이름 */
  title: string
  verdict: AiVerdict
  /**
   * 심사에 걸린 시간(초). **아직 대기 중이면 `null`** — 0 이 아니다.
   * 0 으로 두면 "즉시 끝났다" 로 읽히고 평균 소요를 끌어내린다.
   */
  tookSec: number | null
}

/**
 * 하루치 심사 집계.
 *
 * ⚠️ **반려는 건수만 안다.** 어느 회원의 무엇이 왜 반려됐는지는 남지 않아서
 *    `AiReview` 목록에는 나타나지 않는다 (§23.8). 통과율을 낼 수 있는 것은
 *    심사 API 가 성공·실패 **수**는 세기 때문이다.
 */
export type AiDay = {
  /** `YYYY-MM-DD` */
  date: string
  passed: number
  rejected: number
}
