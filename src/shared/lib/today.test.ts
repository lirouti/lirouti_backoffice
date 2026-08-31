/**
 * 운영 기준일 (docs/ARCHITECTURE.md §22.2.1).
 *
 * ⚠️ **`today()` 는 테스트하지 않는다** — 실행한 날에 따라 달라지는 값이라 고정할 것이
 *    없다. 대신 계산을 `shiftDays` 로 갈라 **문자열을 받는 순수 함수**로 만들었고,
 *    여기가 그것을 잡는다.
 */
import { describe, expect, it } from 'vitest'

import { daysBetween, shiftDays } from './today'

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

describe('daysBetween', () => {
  it('같은 날은 0, 미래는 양수, 과거는 음수', () => {
    expect(daysBetween('2026-08-31', '2026-08-31')).toBe(0)
    expect(daysBetween('2026-08-31', '2026-09-12')).toBe(12)
    expect(daysBetween('2026-09-12', '2026-08-31')).toBe(-12)
  })

  it('달과 해를 넘어도 센다', () => {
    expect(daysBetween('2026-12-28', '2027-01-03')).toBe(6)
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2)
  })

  // 2028 은 윤년이다 — 2월을 28일로 세면 하루가 빈다.
  it('⚠️ 윤년 2월 29일을 센다', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
  })

  // ⚠️ **이 두 줄은 Asia/Seoul 에서 아무것도 증명하지 못한다.** 서머타임이 없어서
  //    UTC 로 재든 실행 환경 시간대로 재든 답이 같다 — 실제로 `Date.UTC` 를 지역
  //    파싱으로 바꿔 넣어도 초록이었다(docs/ARCHITECTURE.md §34.3). 의도를 적어 두는
  //    자리이고, **서머타임이 있는 곳에서 CI 를 돌릴 때** 비로소 일한다.
  it('서머타임 경계를 지나도 하루는 하루다 (서머타임 지역에서만 판별된다)', () => {
    // 미국 서머타임 시작(3월 둘째 일요일)과 끝(11월 첫째 일요일)
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })
})
