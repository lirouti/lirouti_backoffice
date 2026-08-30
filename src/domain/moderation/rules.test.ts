/**
 * 모더레이션 규칙 (docs/ARCHITECTURE.md §23).
 *
 * 여기가 틀리면 **가려진 인증이 계속 가려진다** — 밀린 양을 작게 세면 아무도 안 보고,
 * 통과율을 잘못 내면 AI 가 고장난 걸 못 알아챈다.
 */
import { describe, expect, it } from 'vitest'

import {
  avgTookSec,
  canDecide,
  filterAiReviews,
  filterReports,
  nextAfterRemoved,
  passRate,
  reportCount,
  summarizeAi,
  summarizeReports,
} from './rules'
import type { AiReview, Report, Reporter } from './types'

const reporter = (over: Partial<Reporter> = {}): Reporter => ({
  nick: '소이',
  at: '2026-08-14 09:12',
  why: '실제와 무관한 사진',
  ...over,
})

const rep = (over: Partial<Report> = {}): Report => ({
  key: 0,
  code: 'rep_4820',
  title: '아침 6시 기상 인증',
  who: '민트초코',
  at: '2026-08-14 06:58',
  state: '대기',
  reporters: [reporter()],
  author: { certs: 41, reports: 6, hidden: 2, bans: 1 },
  ...over,
})

const rev = (over: Partial<AiReview> = {}): AiReview => ({
  key: 0,
  at: '2026-08-14 08:02',
  who: '소이',
  title: '아침 6시 기상',
  verdict: '승인',
  tookSec: 2.1,
  ...over,
})

describe('reportCount', () => {
  // 원본은 건수를 별도 필드로 들어서 「신고 5건」 옆에 신고자 3명이 나왔다.
  it('⚠️ 신고자 배열의 길이다 — 따로 든 숫자가 아니다', () => {
    expect(reportCount(rep({ reporters: [reporter(), reporter(), reporter()] }))).toBe(3)
  })
})

describe('filterReports', () => {
  const list = [
    rep({ key: 0, state: '대기' }),
    rep({ key: 1, state: '숨김 유지' }),
    rep({ key: 2, state: '숨김 해제' }),
  ]

  it('대기만 · 처리 완료만 · 전체', () => {
    expect(filterReports(list, '대기').map((r) => r.key)).toEqual([0])
    expect(filterReports(list, '처리 완료').map((r) => r.key)).toEqual([1, 2])
    expect(filterReports(list, '전체')).toHaveLength(3)
  })

  // 「처리 완료」 를 「숨김 유지」 로만 보면 되돌린 건이 어느 탭에도 안 나온다.
  it('⚠️ 「처리 완료」 는 숨김 해제도 포함한다', () => {
    expect(filterReports(list, '처리 완료').map((r) => r.state)).toContain('숨김 해제')
  })
})

describe('summarizeReports', () => {
  const TODAY = '2026-08-14'
  const list = [
    rep({ key: 0, at: '2026-08-14 06:58', state: '대기' }),
    rep({ key: 1, at: '2026-08-14 20:14', state: '대기' }),
    rep({ key: 2, at: '2026-08-13 22:41', state: '숨김 유지' }),
    rep({ key: 3, at: '2026-08-12 07:02', state: '숨김 해제' }),
  ]

  it('상태별로 센다', () => {
    const s = summarizeReports(list, TODAY)
    expect([s.waiting, s.kept, s.freed]).toEqual([2, 1, 1])
  })

  // 「오늘 접수」 는 상태와 무관하다 — 오늘 올라와서 바로 처리한 건도 접수된 건이다.
  it('⚠️ 오늘 접수는 날짜로만 센다', () => {
    expect(summarizeReports(list, TODAY).today).toBe(2)
    expect(summarizeReports(list, '2026-08-13').today).toBe(1)
  })
})

describe('canDecide', () => {
  it('이미 그 상태면 못 누른다', () => {
    expect(canDecide(rep({ state: '숨김 유지' }), '숨김 유지')).toBe(false)
  })

  // 「오신고는 여기서 되돌립니다」 가 이 화면의 목적이다.
  it('⚠️ 확정된 건도 반대로 되돌릴 수 있다', () => {
    expect(canDecide(rep({ state: '숨김 유지' }), '숨김 해제')).toBe(true)
    expect(canDecide(rep({ state: '숨김 해제' }), '숨김 유지')).toBe(true)
  })
})

describe('filterAiReviews', () => {
  const list = [rev({ key: 0, verdict: '승인' }), rev({ key: 1, verdict: '대기', tookSec: null })]

  it('판정으로 거른다', () => {
    expect(filterAiReviews(list, '승인').map((r) => r.key)).toEqual([0])
    expect(filterAiReviews(list, '대기').map((r) => r.key)).toEqual([1])
    expect(filterAiReviews(list, '전체')).toHaveLength(2)
  })
})

describe('passRate', () => {
  it('승인 / (승인 + 반려)', () => {
    expect(passRate([{ date: '2026-08-14', passed: 87, rejected: 13 }])).toBe(87)
  })

  it('여러 날은 합계로 낸다 — 날짜별 비율의 평균이 아니다', () => {
    // 일별 평균이면 (100 + 50) / 2 = 75 가 나온다. 건수가 다르면 그건 틀린 값이다.
    expect(
      passRate([
        { date: '2026-08-13', passed: 900, rejected: 0 },
        { date: '2026-08-14', passed: 50, rejected: 50 },
      ]),
    ).toBe(95)
  })

  it('심사한 게 없으면 0 — 0 으로 나누지 않는다', () => {
    expect(passRate([])).toBe(0)
    expect(passRate([{ date: '2026-08-14', passed: 0, rejected: 0 }])).toBe(0)
  })
})

describe('avgTookSec', () => {
  it('소수 첫째 자리까지', () => {
    expect(avgTookSec([rev({ tookSec: 2.1 }), rev({ tookSec: 1.8 })])).toBe(2)
    expect(avgTookSec([rev({ tookSec: 2.1 }), rev({ tookSec: 3.4 })])).toBe(2.8)
  })

  // 0 으로 세면 아직 안 끝난 심사가 "0초에 끝났다" 가 되어 평균을 끌어내린다.
  it('⚠️ 대기 건은 분모에서도 뺀다', () => {
    expect(avgTookSec([rev({ tookSec: 2 }), rev({ verdict: '대기', tookSec: null })])).toBe(2)
  })

  it('끝난 게 없으면 0', () => {
    expect(avgTookSec([rev({ verdict: '대기', tookSec: null })])).toBe(0)
  })
})

describe('summarizeAi', () => {
  const TODAY = '2026-08-14'
  const days = [
    { date: '2026-08-13', passed: 1000, rejected: 200 },
    { date: '2026-08-14', passed: 1117, rejected: 167 },
  ]
  const list = [rev({ tookSec: 2 }), rev({ key: 1, verdict: '대기', tookSec: null })]

  it('오늘 심사는 오늘 자 승인 + 반려다', () => {
    expect(summarizeAi(days, list, TODAY).judgedToday).toBe(1284)
  })

  // 오늘 자 집계가 아직 안 만들어진 시각(자정 직후)에 어제 값을 오늘로 보여 주면 안 된다.
  it('⚠️ 오늘 자 행이 없으면 0', () => {
    expect(summarizeAi(days, list, '2026-08-15').judgedToday).toBe(0)
  })

  it('심사 대기는 목록에서 센다 — 화면의 「대기」 탭과 같은 수여야 한다', () => {
    expect(summarizeAi(days, list, TODAY).queued).toBe(filterAiReviews(list, '대기').length)
  })
})

describe('nextAfterRemoved', () => {
  const list = [rep({ key: 10 }), rep({ key: 11 }), rep({ key: 12 })]

  it('뒤 행으로 간다', () => {
    expect(nextAfterRemoved(list, 11)).toBe(12)
  })

  // 마지막 건을 처리했을 때 뒤가 없다고 아무것도 안 고르면 오른쪽이 빈 화면이 된다.
  it('⚠️ 마지막 행이면 앞 행으로 간다', () => {
    expect(nextAfterRemoved(list, 12)).toBe(11)
  })

  it('하나뿐이었으면 null — 고를 것이 없다', () => {
    expect(nextAfterRemoved([rep({ key: 10 })], 10)).toBeNull()
  })

  it('빈 목록도 null', () => {
    expect(nextAfterRemoved([], 10)).toBeNull()
  })

  // 처리 완료 탭처럼 행이 그대로 남는 경우에도 부를 수 있어야 한다.
  it('없는 key 면 첫 행', () => {
    expect(nextAfterRemoved(list, 99)).toBe(10)
  })
})
