/**
 * 내 계정 보안 파사드 — 2단계 인증 등록·해제.
 *
 * **시크릿과 백업 코드는 서버가 만든다.** 클라이언트는 받아서 보여줄 뿐이다.
 * 브라우저에서 만들면 서버가 검증할 근거가 없고, XSS 하나에 통째로 샌다.
 *
 * 등록은 **두 번의 왕복**이다 — 발급(`start`)과 확인(`confirm`).
 * 한 번에 켜 버리면 QR 을 잘못 스캔한 사람이 그대로 잠긴다. 앱이 실제로 맞는 코드를
 * 내는지 확인한 뒤에야 계정에 반영한다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { validateTotpCode, type TotpEnrollment, type TotpStatus } from '@/domain/totp'

import { makeBackupCodes, makeSecret, securityState } from '@/mocks/security'

import { http, mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

/** 목에서만 쓰는 실패 코드. `api/auth.ts` 의 규칙과 같게 둔다. */
const MOCK_BAD_CODE = '000000'

export async function getTotpStatus(): Promise<TotpStatus> {
  if (USE_MOCK) {
    await mockDelay()
    return { ...securityState.totp }
  }
  return http.get<TotpStatus>('/admin/me/totp')
}

/**
 * 등록 시작. 서버가 시크릿을 발급한다. 아직 계정에는 반영되지 않는다.
 *
 * `account` 는 **목에서만 쓴다** — 실서버는 세션 쿠키로 누구인지 알고, 응답의
 * account 도 서버가 채운다. 클라이언트가 정할 값이 아니다.
 */
export async function startTotpEnrollment(account: string): Promise<TotpEnrollment> {
  if (USE_MOCK) {
    await mockDelay(400)
    return { secret: makeSecret(), account }
  }
  return http.post<TotpEnrollment>('/admin/me/totp/enroll')
}

export type TotpConfirmation = {
  /** `startTotpEnrollment` 가 준 시크릿 */
  secret: string
  code: string
}

/**
 * 등록 확인. 여기를 통과해야 2단계 인증이 **실제로 켜진다.**
 *
 * 백업 코드는 이 시점에 준다 — 시작 단계에서 주면 중간에 그만둔 사람이
 * 켜지지도 않은 수단의 코드를 들고 있게 된다.
 */
export async function confirmTotpEnrollment(v: TotpConfirmation): Promise<string[]> {
  const invalid = validateTotpCode(v.code)
  if (invalid) throw apiError('http', invalid, 400)

  if (USE_MOCK) {
    await mockDelay(500)
    if (v.code.trim() === MOCK_BAD_CODE) {
      throw apiError(
        'http',
        '코드가 일치하지 않습니다. 인증 앱의 시간이 맞는지 확인해 주세요.',
        401,
      )
    }
    const codes = makeBackupCodes()
    securityState.totp = {
      enabled: true,
      enrolledAt: '2026-08-27T00:00:00+09:00',
      backupCodesLeft: codes.length,
    }
    return codes
  }

  return http.post<string[]>('/admin/me/totp/confirm', v)
}

/**
 * 백업 코드 재발급. **이전 코드는 그 즉시 전부 무효가 된다.**
 *
 * 서버는 해시만 갖고 있어서 다시 보여줄 수 없다 — 그래서 "다시 보기"가 아니라
 * "재발급"이다. 화면에서 이 사실을 먼저 알려야 한다.
 */
export async function regenerateBackupCodes(): Promise<string[]> {
  if (USE_MOCK) {
    await mockDelay(400)
    const codes = makeBackupCodes()
    securityState.totp = { ...securityState.totp, backupCodesLeft: codes.length }
    return codes
  }
  return http.post<string[]>('/admin/me/totp/backup-codes')
}

/**
 * 2단계 인증 해제. **현재 코드를 요구한다.**
 *
 * 자리를 비운 사이 남이 끄고 들어올 수 있으면 2단계 인증을 켠 의미가 없다.
 * 확인 창(`confirm`) 한 번으로는 그걸 막지 못한다.
 */
export async function disableTotp(code: string): Promise<void> {
  const invalid = validateTotpCode(code)
  if (invalid) throw apiError('http', invalid, 400)

  if (USE_MOCK) {
    await mockDelay(500)
    if (code.trim() === MOCK_BAD_CODE) {
      throw apiError('http', '코드가 일치하지 않습니다. 다시 확인해 주세요.', 401)
    }
    securityState.totp = { enabled: false, enrolledAt: null, backupCodesLeft: 0 }
    return
  }
  await http.post('/admin/me/totp/disable', { code })
}

const invalidateTotp = () => queryClient.invalidateQueries({ queryKey: qk.security.totp() })

export function useTotpStatus() {
  return useQuery({ queryKey: qk.security.totp(), queryFn: getTotpStatus })
}

export function useStartTotpEnrollment() {
  return useMutation({ mutationFn: startTotpEnrollment })
}

export function useConfirmTotpEnrollment() {
  return useMutation({ mutationFn: confirmTotpEnrollment, onSuccess: invalidateTotp })
}

export function useRegenerateBackupCodes() {
  return useMutation({ mutationFn: regenerateBackupCodes, onSuccess: invalidateTotp })
}

export function useDisableTotp() {
  return useMutation({ mutationFn: disableTotp, onSuccess: invalidateTotp })
}
