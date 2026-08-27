/**
 * TOTP(시간 기반 일회용 코드) 도메인.
 *
 * `access.ts` 에서 떼어냈다 — 저기는 **인가**(누가 무엇을 볼 수 있나)이고
 * 여기는 **인증 수단**(2단계 인증을 어떻게 켜고 검증하나)이다. 둘은 같이 바뀌지 않는다.
 *
 * ⚠️ 코드 생성·검증은 **서버 몫**이다. 여기 있는 건 화면이 필요로 하는 표현 규칙뿐이다
 *    (QR 에 담을 URI, 읽기 쉬운 시크릿 표기, 백업 코드 파일 내용).
 *    시크릿을 클라이언트에서 만들지 않는다 — 서버가 발급하고 서버가 보관한다.
 */

/** 코드 자릿수. RFC 6238 기본값이자 모든 주요 인증 앱의 기본값. */
export const TOTP_CODE_LENGTH = 6

/** 코드가 바뀌는 주기(초). 이것도 RFC 6238 기본값. */
export const TOTP_PERIOD_SECONDS = 30

/**
 * 인증 앱 목록에 뜰 이름.
 *
 * 개인 계정과 섞이는 자리라 **어느 서비스인지 바로 보여야** 한다.
 * "리루티" 만 쓰면 운영자가 자기 앱 계정과 헷갈린다.
 */
export const TOTP_ISSUER = '리루티 운영 어드민'

/** 한 번에 발급하는 백업 코드 개수. */
export const BACKUP_CODE_COUNT = 10

/** 서버가 알려주는 현재 계정의 2단계 인증 상태. */
export type TotpStatus = {
  enabled: boolean
  /** ISO 8601. 꺼져 있으면 null */
  enrolledAt: string | null
  /** 아직 쓰지 않은 백업 코드 수 */
  backupCodesLeft: number
}

/**
 * 등록 중인 시크릿. **확인 단계를 통과하기 전까지는 계정에 반영되지 않는다.**
 *
 * 중간에 창을 닫으면 그냥 버려진다 — 잘못 스캔한 채로 2FA 가 켜져서
 * 다시는 못 들어오는 상황을 막기 위해 확인을 반드시 거친다.
 */
export type TotpEnrollment = {
  /** base32. 사용자에게 그대로 노출된다(QR 을 못 쓰는 기기용) */
  secret: string
  /** 인증 앱에 표시될 계정 이름. 보통 이메일 */
  account: string
}

/**
 * 인증 앱이 읽는 `otpauth://` URI. 이 문자열이 그대로 QR 이 된다.
 *
 * 라벨(`issuer:account`)과 `issuer` 파라미터를 **둘 다** 넣는다 — 라벨만 읽는 앱과
 * 파라미터만 읽는 앱이 섞여 있어서, 하나만 주면 어떤 앱에서는 발급자가 빈칸으로 뜬다.
 */
export function otpauthUri({ secret, account }: TotpEnrollment): string {
  const label = `${encodeURIComponent(TOTP_ISSUER)}:${encodeURIComponent(account)}`
  const params = new URLSearchParams({
    secret,
    issuer: TOTP_ISSUER,
    algorithm: 'SHA1',
    digits: String(TOTP_CODE_LENGTH),
    period: String(TOTP_PERIOD_SECONDS),
  })
  // `URLSearchParams` 는 공백을 `+` 로 쓴다(폼 인코딩). Key URI 규격은 퍼센트 인코딩이라
  // 그대로 두면 발급자가 "리루티+운영+어드민" 으로 뜨는 앱이 생긴다.
  return `otpauth://totp/${label}?${params.toString().replaceAll('+', '%20')}`
}

/**
 * 시크릿을 4자씩 끊어 읽기 좋게 만든다.
 *
 * QR 을 못 쓰는 기기(데스크톱 인증 앱)에서는 이걸 **손으로 옮겨 적는다.**
 * 32자를 한 줄로 두면 옮겨 적다가 반드시 틀린다.
 */
export function groupSecret(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? []).join(' ')
}

/**
 * 인증 코드 검증. 통과하면 null, 아니면 사용자에게 보일 메시지.
 *
 * 백업 코드는 형식이 서버 정책이라 길이만 본다 — 진짜 판정은 서버가 한다.
 */
export function validateTotpCode(code: string, isBackup = false): string | null {
  const v = code.trim()
  if (!v) return isBackup ? '백업 코드를 입력해 주세요.' : '인증 코드를 입력해 주세요.'
  if (isBackup) return v.length < 8 ? '백업 코드 형식이 올바르지 않습니다.' : null
  if (!/^\d+$/.test(v)) return '인증 코드는 숫자 6자리입니다.'
  if (v.length !== TOTP_CODE_LENGTH) return `인증 코드는 ${TOTP_CODE_LENGTH}자리입니다.`
  return null
}

/**
 * 백업 코드 파일 내용.
 *
 * 코드만 나열하면 몇 달 뒤에 열었을 때 **무슨 코드인지 알 수 없다.**
 * 어느 서비스·어느 계정인지와 "한 번씩만 쓸 수 있다"는 사실을 같이 적는다.
 */
export function backupCodesText(codes: string[], account: string): string {
  return [
    `${TOTP_ISSUER} 백업 코드`,
    `계정: ${account}`,
    '',
    '인증 앱을 쓸 수 없을 때 아래 코드를 로그인 2단계에 입력하세요.',
    '코드 하나는 한 번만 쓸 수 있습니다. 쓴 코드는 지워 두세요.',
    '',
    ...codes.map((c, i) => `${String(i + 1).padStart(2, ' ')}. ${c}`),
  ].join('\n')
}
