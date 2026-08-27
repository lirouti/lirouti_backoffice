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
  TOP_VIEWER,
  validateCredentials,
  type Credentials,
  type LoginResult,
  type Viewer,
} from '@/domain/access'
import { validateTotpCode } from '@/domain/totp'

import { http, mockDelay, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

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
    return { status: 'totp_required', challenge: `mock-${c.email.trim()}` }
  }

  // TODO(백엔드 스펙 확정 후): 응답 DTO → LoginResult 매핑
  return http.post<LoginResult>('/admin/auth/login', c)
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

  return http.post<Viewer>('/admin/auth/totp/verify', v)
}

export async function logout(): Promise<void> {
  if (!USE_MOCK) await http.post('/admin/auth/logout')
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
    return await http.get<Viewer>('/admin/auth/session')
  } catch {
    return null
  }
}

export function useLogin() {
  return useMutation({ mutationFn: login })
}

export function useVerifyTotp() {
  return useMutation({ mutationFn: verifyTotp })
}
