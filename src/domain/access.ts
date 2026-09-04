/**
 * 권한 도메인.
 *
 * 이 규칙들은 원래 `stores/viewerStore.ts` 안에 있었다. zustand 스토어는 상태를 담는
 * 그릇일 뿐인데 권한 판정 규칙이 거기 얹혀 있으면 스토어를 바꿀 때 규칙이 딸려 간다.
 * 상태(누가 보고 있나)와 규칙(무엇을 볼 수 있나)을 분리한다.
 *
 * ⚠️ **UI 게이팅일 뿐 보안이 아니다.** 실제 검증은 서버에서 해야 한다.
 */
import { NAV, type NavGroup } from './nav'
import { SCREENS, type ScopeId, type ScreenId } from './screens'

export type ViewerRole = 'top' | 'operator'

export type Viewer = {
  role: ViewerRole
  name: string
  /** 로그인 아이디. 인증 앱에 표시될 계정 이름이기도 하다 (`domain/totp.ts`) */
  email: string
  /** operator 일 때만 의미가 있다. top 은 전체 접근. */
  scopes: ScopeId[]
}

export const TOP_VIEWER: Viewer = {
  role: 'top',
  name: '김하늘',
  email: 'sky@riruti.co',
  scopes: [],
}

export type Credentials = {
  email: string
  password: string
  /**
   * "로그인 상태 유지" 체크 여부.
   *
   * **결정은 서버가 한다** — 세션 쿠키의 Max-Age 를 길게 줄지 브라우저를 닫으면
   * 사라지게 할지는 HttpOnly 쿠키를 심는 쪽의 몫이다. 클라이언트는 사용자의
   * 선택을 전달만 한다. 이 값을 안 보내면 체크박스가 아무 일도 하지 않는
   * 장식이 된다.
   */
  keepSignedIn?: boolean
}

/**
 * 로그인 1차(비번) 결과.
 *
 * 2FA 가 켜진 계정은 여기서 끝나지 않는다 — `challenge` 를 들고 코드 검증으로 넘어간다.
 * challenge 는 짧게 사는 일회용 토큰이라 **저장하지 않는다** (메모리에만).
 */
export type LoginResult =
  { status: 'authenticated'; viewer: Viewer } | { status: 'totp_required'; challenge: string }

/** 로그인 입력 오류. 다른 `validate*` 와 같은 모양이다 */
export type CredentialErrors = Partial<Record<'email' | 'password', string>>

/**
 * 로그인 입력 검증. 통과하면 빈 객체.
 *
 * 서버도 같은 검증을 하지만 여기서 먼저 걸러 왕복을 아낀다.
 * 규칙(회사 이메일 형식·8자 이상)은 디자인 원본에서 가져왔다.
 *
 * ⚠️ **칸별로 나눠서 돌려준다.** 예전에는 문자열 하나였는데, 그러면 화면이
 *    **어느 칸이 틀렸는지 말할 수 없어서** 배너 한 줄로만 알릴 수 있었다.
 *    「아이디와 비밀번호를 모두 입력해 주세요」 처럼 둘을 뭉친 문구가 나온 것도 그래서다
 *    (docs/ARCHITECTURE.md §52).
 *
 * (2단계 인증 코드 검증은 `domain/totp.ts` — 인가가 아니라 인증 수단이다.)
 */
export function validateCredentials(c: Credentials): CredentialErrors {
  const errors: CredentialErrors = {}
  const email = c.email.trim()

  if (!email) errors.email = '아이디를 입력해 주세요.'
  else if (!/\S+@\S+\.\S+/.test(email)) errors.email = '아이디는 회사 이메일 형식이어야 합니다.'

  if (!c.password) errors.password = '비밀번호를 입력해 주세요.'
  else if (c.password.length < 8)
    errors.password = '비밀번호는 8자 이상입니다. 다시 확인해 주세요.'

  return errors
}

/**
 * 서버가 준 값이 정말 `Viewer` 인가.
 *
 * `http.get<Viewer>()` 는 **타입 단언이지 검증이 아니다.** 서버가 다른 모양을 주면
 * 아무도 막지 않은 채 `viewerStore` 에 들어가고, 그때부터 `viewer.name.charAt(0)`
 * 같은 곳이 터지거나 권한 판정이 조용히 어긋난다. 인증 경계에서만은 확인한다.
 *
 * **스코프 문자열 하나하나가 아는 값인지는 보지 않는다.** 서버가 우리보다 먼저 새
 * 스코프를 추가할 수 있고, 모르는 스코프는 `canAccess` 에서 어차피 아무것과도
 * 매칭되지 않아 해가 없다. 여기서 막으면 배포 순서에 결합이 생긴다.
 */
export function isViewer(v: unknown): v is Viewer {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    (o.role === 'top' || o.role === 'operator') &&
    typeof o.name === 'string' &&
    typeof o.email === 'string' &&
    Array.isArray(o.scopes) &&
    o.scopes.every((x) => typeof x === 'string')
  )
}

/** 1차 로그인 응답이 두 갈래 중 하나인가 */
export function isLoginResult(v: unknown): v is LoginResult {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  if (o.status === 'authenticated') return isViewer(o.viewer)
  // challenge 가 빈 문자열이면 2차에서 쓸 수 없다 — 여기서 걸러야 화면이 헛돈다.
  if (o.status === 'totp_required') return typeof o.challenge === 'string' && o.challenge !== ''
  return false
}

/** 해당 스코프에 접근 가능한가 */
export function canAccess(viewer: Viewer, scope: ScopeId): boolean {
  // 자기 계정 설정은 권한과 무관하다 — 스코프가 하나도 없는 사람도 2단계 인증은 켤 수 있어야 한다.
  if (scope === 'me') return true
  if (viewer.role === 'top') return true
  if (scope === 'admin') return false // 관리자 모듈은 최고 관리자 전용
  return viewer.scopes.includes(scope)
}

/** 해당 화면에 접근 가능한가 */
export function canOpen(viewer: Viewer, id: ScreenId): boolean {
  return canAccess(viewer, SCREENS[id].scope)
}

/** 뷰어 권한으로 걸러낸 내비 트리 */
export function visibleNav(viewer: Viewer): NavGroup[] {
  return NAV.filter((g) => canAccess(viewer, g.scope))
}

/**
 * 뷰어가 접근할 수 있는 첫 화면 — 권한 밖 URL 진입 시 보낼 곳.
 *
 * ⚠️ **여기가 권한 밖이면 리다이렉트가 무한히 돈다.** `AdminLayout` 이 "못 여는 화면 →
 *    firstScreen" 으로 보내는데, 보낸 곳도 못 열면 같은 판정이 다시 나서 에러도 없이 멈춘다.
 *
 * 스코프가 하나도 없는 계정(모듈 배정 전의 새 관리자)은 내비가 비어서 예전에는 `dash` 로
 * 보냈는데, `dash` 도 스코프가 필요해서 정확히 그 루프에 빠졌다. `me` 스코프인
 * 내 계정 보안은 **누구나 열 수 있어** 안전한 착지점이고, 거기서 2단계 인증이라도 켤 수 있다.
 */
export function firstScreen(viewer: Viewer): ScreenId {
  const first = visibleNav(viewer)[0]
  if (!first) return 'security'
  return first.screen ?? first.children![0]!.screen
}
