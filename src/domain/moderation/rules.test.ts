/**
 * 모더레이션 규칙 (docs/ARCHITECTURE.md §23).
 *
 * ⚠️ **자동 숨김을 걷어낸 뒤로 여기가 유일한 방어선이다.** 신고된 사진은 관리자가 볼
 *    때까지 계속 보이므로, 우선순위를 잘못 세면 **문제 사진이 그만큼 오래 노출된다** —
 *    되돌릴 수 없는 종류의 사고다.
 */
import { describe, expect, it } from 'vitest'

import {
  avgTookSec,
  canDecide,
  filterAiReviews,
  filterReports,
  isOverThreshold,
  nextAfterRemoved,
  passRate,
  reportCount,
  REPORT_THRESHOLD,
  sortReports,
  summarizeAi,
  summarizeReports,
} from './rules'
import type { AiReview, Report, Reporter } from './types'

const reporter = (over: Partial<Reporter> = {}): Reporter => ({
  nick: '소이',
  at: '2026-08-14 09:12',
  why: '실제와 무관한 사진',
  detail: '',
  ...over,
})

const rep = (over: Partial<Report> = {}): Report => ({
  key: 0,
  code: 'rep_4820',
  title: '아침 6시 기상 인증',
  who: '민트초코',
  at: '2026-08-14 06:58',
  state: '미검토',
  reporters: [reporter()],
  author: { certs: 41, reports: 6, hidden: 2, bans: 1 },
  ...over,
})

/** 신고자 `n` 명짜리 건. 기준치 경계를 세는 스위트가 많아서 따로 둔다 */
const withReporters = (n: number, over: Partial<Report> = {}): Report =>
  rep({ reporters: Array.from({ length: n }, () => reporter()), ...over })

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
    rep({ key: 0, state: '미검토' }),
    rep({ key: 1, state: '숨김' }),
    rep({ key: 2, state: '노출 유지' }),
  ]

  it('미검토만 · 검토 완료만 · 전체', () => {
    expect(filterReports(list, '미검토').map((r) => r.key)).toEqual([0])
    expect(filterReports(list, '검토 완료').map((r) => r.key)).toEqual([1, 2])
    expect(filterReports(list, '전체')).toHaveLength(3)
  })

  // 「검토 완료」 를 「숨김」 으로만 보면 그대로 두기로 한 건이 어느 탭에도 안 나온다.
  it('⚠️ 「검토 완료」 는 노출 유지도 포함한다', () => {
    expect(filterReports(list, '검토 완료').map((r) => r.state)).toContain('노출 유지')
  })
})

describe('isOverThreshold', () => {
  it('기준치 이상이면 참 — 경계는 포함이다', () => {
    expect(isOverThreshold(withReporters(REPORT_THRESHOLD - 1))).toBe(false)
    expect(isOverThreshold(withReporters(REPORT_THRESHOLD))).toBe(true)
    expect(isOverThreshold(withReporters(REPORT_THRESHOLD + 1))).toBe(true)
  })

  // 「기준 초과」 는 시점이 아니라 누적된 사실이다 — 판단이 끝나도 신고가 많았던 건 그대로다.
  it('⚠️ 검토를 마친 건에서도 남는다', () => {
    expect(isOverThreshold(withReporters(REPORT_THRESHOLD, { state: '숨김' }))).toBe(true)
    expect(isOverThreshold(withReporters(REPORT_THRESHOLD, { state: '노출 유지' }))).toBe(true)
  })
})

describe('sortReports', () => {
  /**
   * 기준 초과 미검토(2) · 보통 미검토(2) · 검토 완료(2, 그중 하나는 기준 초과).
   *
   * ⚠️ **매번 새로 만든다.** 하나를 공유하면 제자리 정렬 버그를 넣었을 때 **앞 테스트가
   *    이미 정렬해 둔 배열**을 다음 테스트가 받아, 「원본이 안 바뀌었다」 가 저절로
   *    참이 된다 — 실제로 그렇게 새어서 못 잡았다.
   */
  const queue = (): Report[] => [
    withReporters(1, { key: 0, at: '2026-08-10 09:00', state: '미검토' }),
    withReporters(7, { key: 1, at: '2026-08-11 09:00', state: '숨김' }),
    withReporters(5, { key: 2, at: '2026-08-12 09:00', state: '미검토' }),
    withReporters(3, { key: 3, at: '2026-08-13 09:00', state: '미검토' }),
    withReporters(6, { key: 4, at: '2026-08-09 09:00', state: '미검토' }),
    withReporters(2, { key: 5, at: '2026-08-14 09:00', state: '노출 유지' }),
  ]

  // 자동 숨김이 없어진 뒤로 「빨리 보는 것」 이 유일한 방어선이다.
  it('⚠️ 기준 초과 미검토가 맨 위로 온다 — 최신순보다 앞선다', () => {
    expect(sortReports(queue()).map((r) => r.key)).toEqual([4, 2, 3, 0, 1, 5])
  })

  // 판단이 끝난 건을 위로 올리면 「먼저 볼 것」 신호가 희석된다.
  it('⚠️ 검토가 끝난 건은 기준을 넘겨도 안 올라간다', () => {
    const keys = sortReports(queue()).map((r) => r.key)
    expect(keys.indexOf(1)).toBeGreaterThan(keys.indexOf(0))
  })

  // Array#sort 는 제자리 정렬이라 캐시 배열을 그대로 넘기면 다음 조회의 순서까지 바뀐다.
  it('⚠️ 원본 배열을 건드리지 않는다', () => {
    const fresh = queue()
    sortReports(fresh)
    // 선언 순서 그대로여야 한다. `fresh` 로 기대값을 만들면 또 저절로 참이 된다.
    expect(fresh.map((r) => r.key)).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('summarizeReports', () => {
  const TODAY = '2026-08-14'
  const list = [
    withReporters(6, { key: 0, at: '2026-08-14 06:58', state: '미검토' }),
    withReporters(2, { key: 1, at: '2026-08-14 20:14', state: '미검토' }),
    withReporters(7, { key: 2, at: '2026-08-13 22:41', state: '숨김' }),
    withReporters(9, { key: 3, at: '2026-08-12 07:02', state: '노출 유지' }),
  ]

  it('상태별로 센다', () => {
    const s = summarizeReports(list, TODAY)
    expect([s.waiting, s.hidden]).toEqual([2, 1])
  })

  // 「우선 검토」 가 미검토를 넘으면 두 칸이 서로 다른 집합을 세고 있다는 뜻이다.
  it('⚠️ 「우선 검토」 는 미검토의 부분집합이다', () => {
    const s = summarizeReports(list, TODAY)
    expect(s.urgent).toBe(1)
    expect(s.urgent).toBeLessThanOrEqual(s.waiting)
  })

  // 검토가 끝난 건은 신고가 아무리 많아도 「지금 봐야 할 것」 이 아니다.
  // 상태를 안 보고 세면 기준 초과 셋이 전부 잡혀 3 이 된다.
  it('⚠️ 검토를 마친 기준 초과 건은 「우선 검토」 에서 빠진다', () => {
    expect(list.filter(isOverThreshold)).toHaveLength(3)
    expect(summarizeReports(list, TODAY).urgent).toBe(1)
  })

  // 「오늘 접수」 는 상태와 무관하다 — 오늘 올라와서 바로 처리한 건도 접수된 건이다.
  it('⚠️ 오늘 접수는 날짜로만 센다', () => {
    expect(summarizeReports(list, TODAY).today).toBe(2)
    expect(summarizeReports(list, '2026-08-13').today).toBe(1)
  })
})

describe('canDecide', () => {
  it('이미 그 상태면 못 누른다', () => {
    expect(canDecide(rep({ state: '숨김' }), '숨김')).toBe(false)
    expect(canDecide(rep({ state: '노출 유지' }), '노출 유지')).toBe(false)
  })

  // 잘못 내린 건을 되돌리는 것이 이 화면의 목적이다.
  it('⚠️ 확정된 건도 반대로 되돌릴 수 있다', () => {
    expect(canDecide(rep({ state: '숨김' }), '노출 유지')).toBe(true)
    expect(canDecide(rep({ state: '노출 유지' }), '숨김')).toBe(true)
  })

  // 미검토는 아직 아무 결정도 안 내린 상태라 양쪽 다 열려 있어야 한다.
  it('미검토에서는 둘 다 누를 수 있다', () => {
    expect(canDecide(rep({ state: '미검토' }), '숨김')).toBe(true)
    expect(canDecide(rep({ state: '미검토' }), '노출 유지')).toBe(true)
  })
})

describe('filterAiReviews', () => {
  const list = [
    rev({ key: 0, verdict: '승인' }),
    rev({ key: 1, verdict: '대기', tookSec: null }),
  ]

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
