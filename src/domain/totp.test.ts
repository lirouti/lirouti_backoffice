import { describe, expect, it } from 'vitest'

import {
  BACKUP_CODE_COUNT,
  backupCodesText,
  groupSecret,
  otpauthUri,
  TOTP_CODE_LENGTH,
  TOTP_ISSUER,
  TOTP_PERIOD_SECONDS,
  validateTotpCode,
} from './totp'

const enrollment = { secret: 'IKQFECF37V5XEWV7VISG5LYBYWBGPKBR', account: 'sky@riruti.co' }

describe('otpauthUri', () => {
  const uri = otpauthUri(enrollment)

  it('공백을 + 가 아니라 %20 으로 인코딩한다', () => {
    // URLSearchParams 는 공백을 `+` 로 쓴다(폼 인코딩). Key URI 규격은 퍼센트 인코딩이라
    // 그대로 두면 발급자가 "리루티+운영+어드민" 으로 뜨는 앱이 생긴다. 실제로 났던 버그다.
    expect(uri).not.toContain('+')
    expect(uri).toContain(`issuer=${encodeURIComponent(TOTP_ISSUER)}`)
  })

  it('라벨과 issuer 파라미터를 둘 다 넣는다', () => {
    // 앱마다 읽는 곳이 달라서 하나만 주면 어떤 앱에서는 발급자가 빈칸으로 뜬다.
    const label = `${encodeURIComponent(TOTP_ISSUER)}:${encodeURIComponent(enrollment.account)}`
    expect(uri.startsWith(`otpauth://totp/${label}?`)).toBe(true)
    expect(uri).toContain('issuer=')
  })

  it('시크릿과 알고리즘 파라미터를 담는다', () => {
    const q = new URL(uri.replace('otpauth://', 'https://')).searchParams
    expect(q.get('secret')).toBe(enrollment.secret)
    expect(q.get('algorithm')).toBe('SHA1')
    expect(q.get('digits')).toBe(String(TOTP_CODE_LENGTH))
    expect(q.get('period')).toBe(String(TOTP_PERIOD_SECONDS))
  })

  it('@ 가 든 계정 이름이 라벨 구분자를 깨지 않는다', () => {
    // 라벨은 `issuer:account` 라 account 의 @ 나 : 를 인코딩하지 않으면 구조가 무너진다.
    expect(uri).toContain('sky%40riruti.co')
  })
})

describe('groupSecret', () => {
  it('4자씩 끊는다', () => {
    // 32자를 한 줄로 두면 손으로 옮겨 적다가 반드시 틀린다.
    expect(groupSecret(enrollment.secret)).toBe('IKQF ECF3 7V5X EWV7 VISG 5LYB YWBG PKBR')
  })

  it('4의 배수가 아니어도 마지막 조각을 잃지 않는다', () => {
    expect(groupSecret('ABCDE')).toBe('ABCD E')
    expect(groupSecret('')).toBe('')
  })
})

describe('validateTotpCode', () => {
  it('6자리 숫자면 통과', () => {
    expect(validateTotpCode('482913')).toBeNull()
    expect(validateTotpCode(' 482913 ')).toBeNull()
  })

  it('빈 값 · 숫자 아님 · 자릿수를 각각 잡는다', () => {
    expect(validateTotpCode('')).toContain('입력')
    expect(validateTotpCode('48291a')).toContain('숫자')
    expect(validateTotpCode('4829')).toContain(String(TOTP_CODE_LENGTH))
    expect(validateTotpCode('4829130')).toContain(String(TOTP_CODE_LENGTH))
  })

  it('백업 코드는 길이만 본다 — 진짜 판정은 서버', () => {
    expect(validateTotpCode('A3F9-K2M7', true)).toBeNull()
    expect(validateTotpCode('short', true)).toContain('형식')
    expect(validateTotpCode('', true)).toContain('백업 코드')
  })
})

describe('backupCodesText', () => {
  const text = backupCodesText(['A3F9-K2M7', 'QW4T-9HJD'], enrollment.account)

  it('코드만 적지 않는다 — 어느 서비스·계정인지와 1회용임을 같이 적는다', () => {
    // 몇 달 뒤에 파일을 열었을 때 무슨 코드인지 알 수 없으면 소용이 없다.
    expect(text).toContain(TOTP_ISSUER)
    expect(text).toContain(enrollment.account)
    expect(text).toContain('한 번만')
  })

  it('코드를 전부 번호와 함께 담는다', () => {
    expect(text).toContain(' 1. A3F9-K2M7')
    expect(text).toContain(' 2. QW4T-9HJD')
  })
})

describe('상수', () => {
  it('RFC 6238 기본값을 따른다', () => {
    expect(TOTP_CODE_LENGTH).toBe(6)
    expect(TOTP_PERIOD_SECONDS).toBe(30)
  })

  it('백업 코드는 한 번에 여러 개 발급한다', () => {
    // 1~2개면 폰을 잃었을 때 금방 바닥난다.
    expect(BACKUP_CODE_COUNT).toBeGreaterThanOrEqual(8)
  })
})
