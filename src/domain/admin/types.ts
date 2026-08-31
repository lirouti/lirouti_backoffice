/** 관리자 계정 엔티티. */
import type { ScopeId } from '../screens'

export type AdminRole = 'top' | 'operator'

/**
 * 계정이 지나온 상태. **정지는 여기 없다** — 아래를 볼 것.
 *
 * - `활성` — 쓰고 있다
 * - `휴면` — 오래 안 들어왔다. 막힌 건 아니다
 * - `대기` — 초대만 하고 **한 번도 로그인하지 않았다**
 */
export type AdminState = '활성' | '휴면' | '대기'

/** 화면에 보이는 상태. `AdminState` 에 정지를 덮은 것이다 (`adminStatusOf`) */
export type AdminStatus = AdminState | '정지'

/**
 * 2차 인증 수단.
 *
 * ⚠️ **`이메일 코드` 는 없다.** 원본 데이터에는 3명이 그 값이었는데, 우리 로그인은
 *    인증 앱(TOTP)과 백업 코드뿐이라 **그 계정은 2차를 통과할 방법이 없다**
 *    (docs/ARCHITECTURE.md §31.1).
 */
export type AdminMfa = '앱 OTP' | '미설정'

export type Admin = {
  adminId: number
  name: string
  /** 로그인 아이디. 사내 이메일이고 **계정을 가르는 값**이라 중복될 수 없다 */
  email: string
  role: AdminRole
  /**
   * 담당 모듈. **`operator` 일 때만 의미가 있다** — `top` 은 전체 접근이라 빈 배열이다.
   *
   * ⚠️ `admin` 과 `me` 는 여기 들어오지 않는다 (`ASSIGNABLE_SCOPES` 참고).
   */
  scopes: ScopeId[]
  /**
   * 등록된 패스키 기기. 없으면 `''`.
   *
   * ⚠️ **패스키는 아직 미구현이다** — 이 값은 화면에 보여 주기만 하고 로그인에 쓰이지
   *    않는다. 붙일 때는 2차가 아니라 비번+TOTP 를 통째로 대체하는 경로다.
   */
  passkey: '' | 'mac' | 'iphone'
  /** 사람이 읽는 상대 시각(`5분 전`). **`—` 는 한 번도 접속하지 않았다는 뜻** */
  seenAt: string
  state: AdminState
  /**
   * 최고 관리자가 막았는가.
   *
   * ⚠️ **`state` 를 `정지` 로 덮어쓰지 않는다.** 덮으면 원래 상태를 잃어서, 한 번도
   *    로그인하지 않은 계정(`대기`)을 정지했다 풀 때 **「활성」 으로 되살아난다.**
   *    화면에 보일 값은 `adminStatusOf` 가 둘을 합쳐 만든다 (docs/ARCHITECTURE.md §31.3).
   */
  suspended: boolean
  /** 발급한 사람의 이름 */
  invitedBy: string
  /** `YYYY-MM-DD` */
  invitedAt: string
  /** `YYYY-MM-DD HH:mm`. **대기 계정은 `''`** — 아직 없는 것이지 0시가 아니다 */
  firstLoginAt: string
  mfa: AdminMfa
}

/** 초대 폼이 채우는 값 */
export type AdminInput = {
  name: string
  email: string
  role: AdminRole
  /** `operator` 일 때만 쓴다 */
  scopes: ScopeId[]
}

export type AdminLogKind = '로그인' | '수정' | '등록' | '지급'

/**
 * 상세의 「최근 활동」 한 줄.
 *
 * ⚠️ **감사 로그(`/audit`)와 다른 것이다.** 저기는 조작 전체를 남기는 원장이고, 여기는
 *    이 사람의 최근 것만 보여 주는 발췌다.
 */
export type AdminLog = {
  /** `YYYY-MM-DD HH:mm` */
  at: string
  kind: AdminLogKind
  what: string
  /** 브라우저 · OS */
  device: string
}
