/**
 * 인증 파사드.
 *
 * 인증은 **HttpOnly 쿠키 세션**이다 — 로그인 응답이 쿠키를 심고, 이후 요청은
 * `withCredentials` 로 자동으로 실려 간다. 클라이언트가 토큰을 들고 있지 않는다.
 *
 * 그래서 `viewerStore` 는 **서버 세션의 캐시**일 뿐이다. 진실은 서버에 있고,
 * 부팅 시 `getSession()` 으로 맞춘다.
 *
 * 로그인은 **두 경로**다 (§16):
 *   1. 비번 → TOTP 코드     어디서든. 낯선 기기
 *   2. 패스키               등록한 기기. 한 번에  ← 아직 미구현
 */
import { useMutation } from '@tanstack/react-query'

import {
  isLoginResult,
  isViewer,
  TOP_VIEWER,
  validateCredentials,
  type Credentials,
  type LoginResult,
  type Viewer,
} from '@/domain/access'
import { validateTotpCode } from '@/domain/totp'

import { http, mockDelay, queryClient, USE_MOCK } from './core'
import { apiError, isApiError } from './error'

/** 목 계정의 역할 — `op@` 로 시작하면 운영자, 그 외 최고 관리자. */
function mockViewer(email: string): Viewer {
  const id = email.trim()
  return id.startsWith('op@')
    ? { role: 'operator', name: '박라이브', email: id, scopes: ['items', 'chal', 'ops', 'cs'] }
    : { ...TOP_VIEWER, email: id }
}

/**
 * 1차 인증(비밀번호).
 *
 * 2FA 가 켜진 계정이면 여기서 끝나지 않고 `totp_required` 와 challenge 를 돌려준다.
 * 세션 쿠키는 **2차까지 통과해야** 심긴다 — 1차만으로 들어올 수 있으면 2FA 가 무의미하다.
 */
export async function login(c: Credentials): Promise<LoginResult> {
  const invalid = validateCredentials(c)
  if (invalid) throw apiError('http', invalid, 400)

  if (USE_MOCK) {
    await mockDelay(600)
    // 목에서는 모든 계정이 2FA 를 쓴다 — 실제로도 어드민은 전원 필수가 맞다.
    // `keepSignedIn` 은 쿠키 수명을 정하는 값이라 목에서는 할 일이 없다.
    // 그래도 화면에서 여기까지 실어 보낸다 — 서버가 붙는 순간 동작하게.
    return { status: 'totp_required', challenge: `mock-${c.email.trim()}` }
  }

  // TODO(백엔드 스펙 확정 후): 서버 DTO 필드명이 다르면 여기서 LoginResult 로 매핑한다.
  const res = await http.post<unknown>('/admin/auth/login', c, { skipSessionExpiry: true })
  return asLoginResult(res)
}

/**
 * 응답이 우리가 아는 모양인지 확인한다.
 *
 * `http.post<LoginResult>` 의 제네릭은 **타입 단언일 뿐 런타임 검증이 아니다.**
 * 서버가 다른 모양을 주면 `status` 분기가 엉뚱하게 갈리고 `undefined` 가 그대로
 * `viewerStore` 에 들어간다. 인증 경계에서만은 값을 믿지 않고 확인한다.
 *
 * 넓은 스키마 검증(zod)은 폼이 들어올 때 함께 도입한다 (ARCHITECTURE.md §2.4).
 * 지금은 **우리 코드가 실제로 의존하는 최소한**만 본다.
 */
function asLoginResult(v: unknown): LoginResult {
  if (!isLoginResult(v)) {
    throw apiError('parse', '로그인 응답을 이해할 수 없습니다. 잠시 후 다시 시도해 주세요.')
  }
  return v
}

function asViewer(v: unknown): Viewer {
  if (!isViewer(v)) {
    throw apiError('parse', '사용자 정보를 이해할 수 없습니다. 잠시 후 다시 시도해 주세요.')
  }
  return v
}

export type TotpVerification = {
  /** `login()` 이 준 일회용 토큰 */
  challenge: string
  code: string
  /** 인증 앱 대신 백업 코드를 쓰는가 */
  isBackup?: boolean
}

/** 2차 인증(TOTP 코드 또는 백업 코드). 통과하면 세션이 열린다. */
export async function verifyTotp(v: TotpVerification): Promise<Viewer> {
  const invalid = validateTotpCode(v.code, v.isBackup)
  if (invalid) throw apiError('http', invalid, 400)

  if (USE_MOCK) {
    await mockDelay(500)
    // 디자인 원본과 같은 규칙 — 000000 은 실패 코드다.
    if (v.code.trim() === '000000') {
      throw apiError('http', '코드가 일치하지 않습니다. 다시 확인해 주세요.', 401)
    }
    return mockViewer(v.challenge.replace(/^mock-/, ''))
  }

  return asViewer(await http.post<unknown>('/admin/auth/totp/verify', v, { skipSessionExpiry: true }))
}

export async function logout(): Promise<void> {
  // 로그아웃 요청의 401 은 "이미 끊겨 있다"는 답이지 새로 알릴 사건이 아니다.
  // 빼지 않으면 인터셉터 → 401 핸들러 → signOut → logout 으로 **되돌아온다**.
  if (!USE_MOCK) await http.post('/admin/auth/logout', undefined, { skipSessionExpiry: true })
  // 다른 계정으로 다시 들어왔을 때 이전 사용자의 데이터가 보이면 안 된다.
  queryClient.clear()
}

/**
 * 현재 세션. 쿠키가 없거나 만료면 null.
 *
 * 새로고침할 때마다 부른다 — 클라이언트가 "로그인했다"고 기억하고 있어도
 * 서버 세션이 끊겼으면 의미가 없다.
 */
export async function getSession(): Promise<Viewer | null> {
  if (USE_MOCK) return null // 목에서는 스토어에 저장된 값을 그대로 믿는다
  try {
    return asViewer(await http.get<unknown>('/admin/auth/session'))
  } catch (e) {
    // **401 만 "세션 없음"이다.** 네트워크 끊김·타임아웃·5xx 까지 null 로 뭉개면
    // 서버가 잠깐 흔들렸을 뿐인데 로그인한 사람을 로그인 화면으로 쫓아낸다.
    // 확인에 실패한 것과 로그아웃 상태는 다르므로, 나머지는 그대로 올려보내
    // 부르는 쪽이 "오류" 또는 "재시도"를 보여줄 수 있게 한다.
    if (isApiError(e) && e.kind === 'http' && e.status === 401) return null
    throw e
  }
}

export function useLogin() {
  return useMutation({ mutationFn: login })
}

export function useVerifyTotp() {
  return useMutation({ mutationFn: verifyTotp })
}
