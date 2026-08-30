/**
 * 푸시 알림 규칙 (docs/ARCHITECTURE.md §26).
 *
 * 여기가 틀리면 **법을 어기거나 동의 없는 사람에게 광고가 간다** — 야간 마케팅
 * 발송은 정보통신망법 위반이고, 대상 수를 잘못 세면 그만큼 더 나간다.
 */
import { describe, expect, it } from 'vitest'

import {
  canCancel,
  failuresOf,
  filterPushes,
  hourOf,
  nightBlocked,
  openRate,
  PUSH_LIMITS,
  reachOf,
  summarizePushes,
  validatePush,
} from './rules'
import type { Push, PushConsent, PushInput } from './types'

const consent: PushConsent = {
  all: 41200,
  push: 38940,
  marketing: 28600,
  byAudience: {
    전체: 38940,
    '30일 내 접속': 27310,
    '미인증 회원': 18400,
    '휴면 회원': 6200,
  },
}

const input = (over: Partial<PushInput> = {}): PushInput => ({
  kind: 'service',
  title: '8/14 점검 안내',
  body: '오늘 02시부터 04시까지 접속이 어렵습니다',
  link: '앱 열기',
  audience: '전체',
  ids: '',
  now: true,
  at: '',
  ...over,
})

const push = (over: Partial<Push> = {}): Push => ({
  key: 0,
  title: '8/14 점검 안내',
  body: '오늘 02시부터 04시까지 접속이 어렵습니다',
  kind: 'service',
  audience: '전체',
  link: '앱 열기',
  targeted: 38940,
  delivered: 37200,
  opened: 10044,
  at: '2026-08-14 18:00',
  status: '발송 완료',
  by: '김하늘',
  ...over,
})

describe('hourOf', () => {
  it('시를 읽는다', () => {
    expect(hourOf('2026-08-14 21:00')).toBe(21)
    expect(hourOf('2026-08-14 00:30')).toBe(0)
  })

  // 형식이 틀린 값을 0시로 읽으면 야간 판정이 조용히 뒤집힌다.
  it('⚠️ 형식이 아니면 null — 0 이 아니다', () => {
    for (const bad of ['', '2026-08-14', '오늘 21시', '2026-08-14 25:00']) {
      expect(hourOf(bad)).toBeNull()
    }
  })
})

describe('nightBlocked', () => {
  it('마케팅은 21시부터 다음날 8시 전까지 막힌다', () => {
    expect(nightBlocked('marketing', '2026-08-14 21:00')).toBe(true)
    expect(nightBlocked('marketing', '2026-08-14 23:59')).toBe(true)
    expect(nightBlocked('marketing', '2026-08-15 07:59')).toBe(true)
  })

  // 경계를 잘못 잡으면 21시 정각이나 8시 정각에 나간다.
  it('⚠️ 8시는 되고 20시도 된다', () => {
    expect(nightBlocked('marketing', '2026-08-15 08:00')).toBe(false)
    expect(nightBlocked('marketing', '2026-08-14 20:59')).toBe(false)
  })

  // 형식이 아니면 시각을 모르는 것이다. 자르기(`slice`)로 읽으면 `2026-08-14T22:00`
  // 같은 값에서 판정이 갈린다 — 형식 오류는 `validatePush` 가 따로 말한다.
  it('⚠️ 시각을 못 읽으면 막지 않는다', () => {
    for (const bad of ['', '2026-08-14', '2026-08-14T22:00']) {
      expect(nightBlocked('marketing', bad)).toBe(false)
    }
  })

  // 점검 안내는 새벽에 보내야 의미가 있다.
  it('⚠️ 서비스 · 루틴은 시간 제한이 없다', () => {
    expect(nightBlocked('service', '2026-08-14 02:00')).toBe(false)
    expect(nightBlocked('routine', '2026-08-14 23:00')).toBe(false)
  })
})

describe('reachOf', () => {
  it('서비스 알림은 조건 모수 그대로', () => {
    expect(reachOf(input({ audience: '전체' }), consent)).toBe(38940)
    expect(reachOf(input({ audience: '휴면 회원' }), consent)).toBe(6200)
  })

  it('마케팅은 동의 비율을 곱한다', () => {
    expect(reachOf(input({ kind: 'marketing', audience: '전체' }), consent)).toBe(28600)
  })

  // `Math.min(6200, 28600)` 이면 6,200 — 동의를 하나도 안 거른 값이다.
  it('⚠️ 좁은 조건에서도 동의를 거른다 — min 이 아니다', () => {
    expect(reachOf(input({ kind: 'marketing', audience: '휴면 회원' }), consent)).toBe(4553)
  })

  it('직접 지정은 적어 낸 ID 수', () => {
    expect(reachOf(input({ audience: '직접 지정', ids: 'U-1, U-2, U-1' }), consent)).toBe(2)
    expect(reachOf(input({ audience: '직접 지정', ids: '  ,, ' }), consent)).toBe(0)
  })

  it('푸시 허용이 0 이면 0 — 0 으로 나누지 않는다', () => {
    const none = { ...consent, push: 0, marketing: 0 }
    expect(reachOf(input({ kind: 'marketing' }), none)).toBe(0)
  })
})

describe('openRate', () => {
  it('도달 대비 열림', () => {
    expect(openRate(push({ delivered: 200, opened: 54 }))).toBe(27)
  })

  // 0% 와 「아직 없음」 은 다르다 — 예약 건을 0% 로 그리면 실패한 것처럼 보인다.
  it('⚠️ 아직 안 보냈으면 null', () => {
    expect(openRate(push({ status: '예약', delivered: 0, opened: 0 }))).toBeNull()
  })
})

describe('validatePush', () => {
  const AT = '2026-08-14 10:00'

  it('제대로 채우면 통과', () => {
    expect(validatePush(input(), consent, AT)).toEqual({})
  })

  it('제목·본문은 필수이고 길이 제한이 있다', () => {
    expect(validatePush(input({ title: '  ' }), consent, AT).title).toBeTruthy()
    expect(validatePush(input({ title: 'ㄱ'.repeat(PUSH_LIMITS.title + 1) }), consent, AT).title).toBeTruthy()
    expect(validatePush(input({ body: 'ㄱ'.repeat(PUSH_LIMITS.body + 1) }), consent, AT).body).toBeTruthy()
  })

  it('제한 길이 정확히는 통과한다', () => {
    expect(validatePush(input({ title: 'ㄱ'.repeat(PUSH_LIMITS.title) }), consent, AT).title).toBeUndefined()
  })

  it('대상이 0명이면 막는다', () => {
    expect(validatePush(input({ audience: '직접 지정', ids: '' }), consent, AT).ids).toBeTruthy()
  })

  // 원본은 예약일 때만 막아서, 밤 11시에 「지금 발송」 을 누르면 그대로 나갔다.
  it('⚠️ 「지금 발송」 도 야간이면 막는다', () => {
    const e = validatePush(input({ kind: 'marketing', now: true }), consent, '2026-08-14 23:00')
    expect(e.kind).toBeTruthy()
  })

  it('예약 시각 형식이 틀리면 막는다', () => {
    expect(validatePush(input({ now: false, at: '오늘 밤' }), consent, AT).at).toBeTruthy()
    expect(validatePush(input({ now: false, at: AT }), consent, AT).at).toBeUndefined()
  })
})

describe('filterPushes', () => {
  const list = [
    push({ key: 0, status: '발송 완료', kind: 'service', title: '점검 안내' }),
    push({ key: 1, status: '예약', kind: 'marketing', title: '가을 시즌 사전 안내' }),
    push({ key: 2, status: '발송 완료', kind: 'marketing', title: '새 의상이 도착했어요' }),
  ]

  it('상태 탭과 종류 탭이 한 줄에 섞여 있다', () => {
    expect(filterPushes(list, '예약').map((p) => p.key)).toEqual([1])
    expect(filterPushes(list, '발송 완료').map((p) => p.key)).toEqual([0, 2])
    expect(filterPushes(list, '마케팅 알림').map((p) => p.key)).toEqual([1, 2])
    expect(filterPushes(list, '전체')).toHaveLength(3)
  })

  it('제목으로 찾는다', () => {
    expect(filterPushes(list, '전체', '의상').map((p) => p.key)).toEqual([2])
    expect(filterPushes(list, '전체', '   ')).toHaveLength(3)
  })
})

describe('summarizePushes', () => {
  const TODAY = '2026-08-14'
  const list = [
    push({ key: 0, at: '2026-08-14 18:00', delivered: 100, opened: 50 }),
    push({ key: 1, at: '2026-08-13 09:00', delivered: 900, opened: 180 }),
    push({ key: 2, at: '2026-08-20 10:00', status: '예약', targeted: 28600, delivered: 0, opened: 0 }),
  ]

  it('오늘 발송과 예약 대기를 센다', () => {
    const s = summarizePushes(list, TODAY)
    expect([s.sentToday, s.scheduled]).toEqual([1, 1])
  })

  // 건별 비율의 평균이면 (50 + 20) / 2 = 35% 다. 건수가 다르면 그건 틀린 값이다.
  it('⚠️ 평균 열림률은 합계 기준이다', () => {
    expect(summarizePushes(list, TODAY).openRate).toBe(23)
  })

  it('보낸 게 없으면 0 — 0 으로 나누지 않는다', () => {
    expect(summarizePushes([list[2]!], TODAY).openRate).toBe(0)
  })
})

describe('canCancel', () => {
  it('예약만 취소할 수 있다', () => {
    expect(canCancel('예약')).toBe(true)
    for (const s of ['발송 완료', '취소', '실패'] as const) expect(canCancel(s)).toBe(false)
  })
})

describe('failuresOf', () => {
  // 대상은 이미 푸시를 켠 사람만 세었다. 거부를 실패로 또 세면 두 번 빼는 것이다.
  it('⚠️ 「푸시 거부」 는 실패에 넣지 않는다', () => {
    expect(failuresOf(push()).map((f) => f.why)).toEqual(['토큰 만료', '기기 미등록', '일시 오류'])
  })

  // 합이 어긋나면 「대상 − 도달」 과 표가 안 맞아 운영자가 숫자를 의심한다.
  it('⚠️ 합이 「대상 − 도달」 과 정확히 같다', () => {
    // ⚠️ `[10, 4]` 를 빼지 말 것 — 나머지 값들은 **우연히** 반올림이 딱 떨어져서,
    //    비율만 세 번 반올림하는 구현으로 되돌려도 통과한다. `lost = 6` 에서만 어긋난다.
    for (const [targeted, delivered] of [[38940, 37200], [100, 99], [10, 4], [7, 3], [1, 0]]) {
      const rows = failuresOf(push({ targeted, delivered }))
      expect(rows.reduce((s, f) => s + f.count, 0)).toBe(targeted! - delivered!)
    }
  })

  it('다 도달했으면 표가 비어 있다', () => {
    expect(failuresOf(push({ targeted: 100, delivered: 100 }))).toEqual([])
  })
})
