/**
 * 모더레이션 엔티티 — 신고 처리와 AI 심사.
 *
 * 두 화면이 한 내비 그룹(`mod`)이고 **같은 대상**(회원이 올린 인증 사진)을 다룬다.
 * AI 가 자동으로 가린 것을 사람이 되돌리는 자리가 신고 처리다.
 */

/**
 * 신고 처리 결과.
 *
 * ⚠️ **「숨김 해제」 는 되돌림이지 무죄가 아니다.** 오신고로 가려진 인증을 다시 보이게
 *    하는 것뿐이고, 작성자 이력에는 「피신고」 로 남는다.
 */
export type ReportState = '대기' | '숨김 유지' | '숨김 해제'

/** 신고자가 고른 사유. **우리가 정하는 값이 아니라 앱의 신고 폼이 정한다** */
export type ReportReason =
  | '실제와 무관한 사진'
  | '예전 사진 재사용'
  | '타인 사진 도용'
  | '스팸 · 광고'
  | '기타'

export type Reporter = {
  nick: string
  /** `YYYY-MM-DD HH:mm` */
  at: string
  why: ReportReason
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

/** AI 심사 결과. **「반려」 가 없다** — 반려는 기록을 남기지 않는다 (§23.3) */
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
 *    `AiReview` 목록에는 나타나지 않는다 (§23.3). 통과율을 낼 수 있는 것은
 *    심사 API 가 성공·실패 **수**는 세기 때문이다.
 */
export type AiDay = {
  /** `YYYY-MM-DD` */
  date: string
  passed: number
  rejected: number
}
