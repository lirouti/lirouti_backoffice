/**
 * 푸시 알림.
 *
 * ⚠️ **마케팅 알림은 법이 시간을 제한한다.** 정보통신망법상 광고성 정보는 21시–08시에
 *    보내려면 별도 동의가 필요하다 — 우리는 그 동의를 받지 않으므로 **아예 막는다**
 *    (docs/ARCHITECTURE.md §26.2).
 */

/**
 * 알림 종류. **수신 동의를 볼지 말지가 여기서 갈린다.**
 *
 * `service` 는 점검·장애·문의 답변이라 동의와 무관하게 나간다(정보성).
 * `marketing` 은 동의한 회원에게만, `routine` 은 본인이 켠 리마인더다.
 */
export type PushKind = 'service' | 'marketing' | 'routine'

export type PushStatus = '발송 완료' | '예약' | '취소' | '실패'

/** 대상 조건 */
export type PushAudience = '전체' | '30일 내 접속' | '미인증 회원' | '휴면 회원' | '직접 지정'

/** 눌렀을 때 이동할 곳. 앱이 아는 화면 이름이라 우리가 늘릴 수 없다 */
export type PushLink =
  '앱 열기' | '오늘의 루틴' | '상점' | '내 캐릭터' | '월간 리포트' | '1:1 문의'

/**
 * 수신 동의 모수. **서버가 집계해 준다.**
 *
 * ⚠️ **`push` 는 이미 「전체 중 푸시를 켠 사람」 이다.** 여기에 다시 푸시 거부를
 *    빼면 두 번 빼는 것이 된다 (§26.3).
 */
export type PushConsent = {
  /** 전체 회원 */
  all: number
  /** 푸시 알림을 켠 회원 */
  push: number
  /** 마케팅 수신에 동의한 회원. **항상 `push` 이하** */
  marketing: number
  /**
   * 대상 조건별 모수. **이미 푸시 허용을 거른 수**다.
   * 「직접 지정」 은 운영자가 적은 id 수라 여기 없다.
   */
  byAudience: Record<Exclude<PushAudience, '직접 지정'>, number>
}

/** 운영자가 채우는 값 */
export type PushInput = {
  kind: PushKind
  title: string
  body: string
  link: PushLink
  audience: PushAudience
  /** 「직접 지정」 일 때 쉼표로 적은 회원 uid */
  ids: string
  /** 지금 보낼 것인가 */
  now: boolean
  /** 예약 시각 `YYYY-MM-DD HH:mm`. `now` 면 안 쓴다 */
  at: string
}

export type Push = {
  key: number
  title: string
  body: string
  kind: PushKind
  audience: PushAudience
  link: PushLink
  /**
   * **수신 동의를 거른 뒤** 실제로 보낸(보낼) 사람 수.
   *
   * ⚠️ 전체 회원 수를 넣으면 안 된다 — 원본이 마케팅 푸시에 41,200(전체)을 적어
   *    두고 작성 화면에서는 28,600(동의)을 세고 있었다 (§26.3).
   */
  targeted: number
  /** 단말에 도착한 수. **아직 안 보냈으면 0** */
  delivered: number
  opened: number
  /** `YYYY-MM-DD HH:mm` — 보낸 시각 또는 예약 시각 */
  at: string
  status: PushStatus
  /** 보낸 사람. 자동 발송이면 「시스템」 */
  by: string
}

/** 도달하지 못한 이유 한 줄 */
export type PushFailure = {
  why: string
  count: number
}
