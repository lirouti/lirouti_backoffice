/**
 * 회원 엔티티.
 *
 * ⚠️ **재화가 둘이다** — 파란보석(유상 위주)과 노란보석(무상 위주). 하나로 합쳐 보이면
 *    환불 계산이 틀어진다(유상만 환불 대상이다). 그래서 화면도 항상 나눠 보여 준다.
 */

/** 소셜 로그인 제공자 */
export type Social = 'KAKAO' | 'GOOGLE'

/**
 * 계정 상태.
 *
 * `LEFT`(탈퇴)는 되돌릴 수 없고 목록에서 기본으로 숨긴다 — 나머지 셋과 성질이 다르다.
 */
export type UserStatus = 'ACTIVE' | 'BANNED' | 'DORMANT' | 'LEFT'

export type Wallet = {
  /** 파란보석 — 결제로 사는 유상 재화 */
  gem: number
  /** 노란보석 — 챌린지·업적으로 얻는 무상 재화 */
  topaz: number
}

export type User = {
  key: number
  /** `U-10240`. 사람이 옮겨 적는 값이라 화면에서는 등폭으로 쓴다 */
  uid: string
  nick: string
  email: string
  social: Social
  status: UserStatus
  wallet: Wallet
  /** 누적 결제 금액 (원) */
  paid: number
  /** 누적 인증 수 — 이 서비스의 참여 지표다 */
  certs: number
  /** `YYYY-MM-DD` */
  joinedAt: string
  lastSeenAt: string
  /** 탈퇴일. `LEFT` 가 아니면 빈 문자열 */
  leftAt: string
}

/** 재화 이력 한 줄. 유상·무상이 따로 쌓인다 */
export type CoinLedgerRow = {
  /** `YYYY-MM-DD HH:mm` */
  at: string
  kind: string
  coin: '파란보석' | '노란보석'
  /**
   * 증감. **부호가 방향이다** — 화면에서 색보다 부호를 먼저 읽히게 쓴다
   * (색맹에게도 남는 정보다).
   */
  delta: number
  /** 그 뒤의 잔액 */
  balance: number
  why: string
}

/** 결제 한 줄 */
export type OrderRow = {
  at: string
  orderNo: string
  product: string
  /** 원 */
  amount: number
  status: '완료' | '환불'
}
