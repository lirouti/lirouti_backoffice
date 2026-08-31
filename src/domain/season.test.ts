/**
 * 시즌 규칙 (docs/ARCHITECTURE.md §34).
 *
 * 여기가 틀리면 **마감일이 하루 어긋난다.** 시즌 마지막 날에 「종료」 가 뜨면 그날 마감을
 * 노리던 이벤트가 닫힌 것처럼 보이고, 운영자는 그 하루를 되돌릴 수 없다.
 */
import { describe, expect, it } from 'vitest'

import {
  ALWAYS,
  CURRENT_SEASON,
  daysLeft,
  isRunning,
  seasonChip,
  seasonOptions,
  type Season,
} from './season'

const S: Season = { no: 3, startsAt: '2026-06-14', endsAt: '2026-09-12' }

describe('daysLeft', () => {
  it('남은 날을 센다', () => {
    expect(daysLeft(S, '2026-08-31')).toBe(12)
  })

  // 「이 날까지 한다」 이지 「이 날 끝난다」 가 아니다.
  it('⚠️ 마지막 날은 0 이지 -1 이 아니다', () => {
    expect(daysLeft(S, '2026-09-12')).toBe(0)
  })

  it('지나면 음수다', () => {
    expect(daysLeft(S, '2026-09-13')).toBe(-1)
  })
})

describe('isRunning', () => {
  // 마지막 날에 「종료」 가 뜨면 그날 마감을 노리던 이벤트가 닫힌 것처럼 보인다.
  it('⚠️ 첫날과 마지막 날 모두 하고 있는 중이다', () => {
    expect(isRunning(S, '2026-06-14')).toBe(true)
    expect(isRunning(S, '2026-09-12')).toBe(true)
  })

  it('시작 전과 끝난 뒤는 아니다', () => {
    expect(isRunning(S, '2026-06-13')).toBe(false)
    expect(isRunning(S, '2026-09-13')).toBe(false)
  })
})

describe('seasonChip', () => {
  it('진행 중이면 남은 날을 센다', () => {
    expect(seasonChip(S, '2026-08-31')).toBe('시즌 3 · D-12')
  })

  // `D-0` 은 「끝났다」 로도 「오늘까지」 로도 읽혀서, 하필 제일 중요한 날에 제일 헷갈린다.
  it('⚠️ 마지막 날은 `D-0` 이 아니라 「오늘 마감」', () => {
    expect(seasonChip(S, '2026-09-12')).toBe('시즌 3 · 오늘 마감')
  })

  it('지나면 종료', () => {
    expect(seasonChip(S, '2026-09-13')).toBe('시즌 3 · 종료')
  })

  // 남은 날과 기다리는 날을 같은 모양으로 쓰면 카운트다운이 거꾸로 읽힌다.
  it('⚠️ 시작 전은 `D-n` 이 아니라 「n일 뒤 시작」', () => {
    expect(seasonChip(S, '2026-06-04')).toBe('시즌 3 · 10일 뒤 시작')
  })

  // 문자열로 박아 두면 영영 같은 값이다 — 그게 고치려던 것이다.
  it('⚠️ 하루가 지나면 숫자가 준다', () => {
    expect(seasonChip(S, '2026-08-31')).not.toBe(seasonChip(S, '2026-09-01'))
  })
})

describe('seasonOptions', () => {
  it('상시가 맨 앞이고 다음 시즌까지 준다', () => {
    expect(seasonOptions(S)).toEqual([ALWAYS, '시즌 1', '시즌 2', '시즌 3', '시즌 4'])
  })

  // 시즌 1 아이템을 열었을 때 그 시즌이 목록에 없으면, 고치지도 않은 칸이 저장하는 순간 바뀐다.
  it('⚠️ 지난 시즌이 빠지지 않는다', () => {
    expect(seasonOptions(S)).toContain('시즌 1')
  })

  // 시즌 4 콘텐츠는 시즌 3 동안 미리 만든다.
  it('⚠️ 다음 시즌을 미리 고를 수 있다', () => {
    expect(seasonOptions(S)).toContain('시즌 4')
  })

  it('첫 시즌이면 상시 · 시즌 1 · 시즌 2', () => {
    expect(seasonOptions({ ...S, no: 1 })).toEqual([ALWAYS, '시즌 1', '시즌 2'])
  })
})

describe('CURRENT_SEASON', () => {
  // 자리를 채워 둔 값이지만 **모양은 지켜야** 규칙이 의미를 갖는다.
  it('⚠️ 시작이 마감보다 앞선다', () => {
    expect(CURRENT_SEASON.startsAt < CURRENT_SEASON.endsAt).toBe(true)
  })
})
