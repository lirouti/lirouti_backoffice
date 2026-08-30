/**
 * 운영 기준일 (docs/ARCHITECTURE.md §22.2.1).
 *
 * ⚠️ **`today()` 는 테스트하지 않는다** — 실행한 날에 따라 달라지는 값이라 고정할 것이
 *    없다. 대신 계산을 `shiftDays` 로 갈라 **문자열을 받는 순수 함수**로 만들었고,
 *    여기가 그것을 잡는다.
 */
import { describe, expect, it } from 'vitest'

import { shiftDays } from './today'

describe('shiftDays', () => {
  it('하루씩 뺀다', () => {
    expect(shiftDays('2026-08-30', 0)).toBe('2026-08-30')
    expect(shiftDays('2026-08-30', 1)).toBe('2026-08-29')
    expect(shiftDays('2026-08-30', 3)).toBe('2026-08-27')
  })

  it('달과 해를 넘는다', () => {
    expect(shiftDays('2026-03-01', 1)).toBe('2026-02-28')
    expect(shiftDays('2026-01-01', 1)).toBe('2025-12-31')
  })

  it('윤년 2월을 안다', () => {
    expect(shiftDays('2028-03-01', 1)).toBe('2028-02-29')
  })

  // `Date#setDate` 로 빼면 실행 환경의 서머타임에 따라 하루가 23·25시간이 되어
  // 서울 달력과 어긋난다. 실제로 America/New_York 에서 11-01 을 건너뛰었다.
  it('⚠️ 서머타임 경계에서도 하루는 하루다', () => {
    // 미국 동부 DST 종료(2026-11-01)를 사이에 둔 이틀
    expect(shiftDays('2026-11-02', 1)).toBe('2026-11-01')
    expect(shiftDays('2026-11-02', 2)).toBe('2026-10-31')
    // 유럽 서머타임 종료(2026-10-25)
    expect(shiftDays('2026-10-26', 1)).toBe('2026-10-25')
  })

  it('두 자리로 채운다', () => {
    expect(shiftDays('2026-01-10', 5)).toBe('2026-01-05')
  })
})
