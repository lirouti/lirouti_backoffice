/**
 * 1:1 문의 규칙 (docs/ARCHITECTURE.md §28).
 *
 * 여기가 틀리면 **밀린 문의가 지표에서 사라진다** — 보류로 넘긴 건이 빠지거나,
 * 끝난 건의 대기 시간이 계속 늘어 평균이 무너진다.
 */
import { describe, expect, it } from 'vitest'

import {
  canHold,
  canReply,
  durationLabel,
  filterInquiries,
  firstResponseMinutes,
  isOverdue,
  minutesOf,
  pastInquiries,
  SLA_HOURS,
  summarizeInquiries,
  validateReply,
  waitMinutes,
} from './rules'
import type { Inquiry } from './types'

const NOW = '2026-08-11 13:14'

const inq = (over: Partial<Inquiry> = {}): Inquiry => ({
  key: 0,
  code: 'Q-3001',
  category: '버그',
  title: '알이 3일째 부화하지 않아요',
  userKey: 0,
  at: '2026-08-11 09:14',
  status: '대기',
  assignee: '',
  reopened: false,
  answeredAt: '',
  messages: [],
  ...over,
})

describe('minutesOf', () => {
  it('시각을 분으로 읽는다', () => {
    expect(minutesOf('2026-08-11 09:14')! - minutesOf('2026-08-11 08:14')!).toBe(60)
  })

  // 모양만 보면 통과하지만 존재하지 않는 시각이다.
  it('⚠️ 형식이 아니거나 달력에 없는 날은 null', () => {
    for (const bad of ['', '2026-08-11', '2026-02-30 10:00', '2026-08-11 10:99']) {
      expect(minutesOf(bad)).toBeNull()
    }
  })
})

describe('waitMinutes · firstResponseMinutes', () => {
  it('아직 답 안 한 건은 지금까지', () => {
    expect(waitMinutes(inq(), NOW)).toBe(240)
  })

  // 어제 답한 문의가 오늘도 계속 늘어나면 SLA 가 무너진다.
  it('⚠️ 끝난 건은 「접수 → 첫 답변」 이다 — 지금까지가 아니다', () => {
    expect(
      waitMinutes(inq({ status: '답변완료', answeredAt: '2026-08-11 10:14' }), NOW),
    ).toBe(60)
  })

  // 접수 시각부터 재면 **이미 답한 시간까지 합쳐져** 답을 늦게 준 것처럼 보인다.
  it('⚠️ 재문의로 다시 열린 건은 마지막 유저 말부터 잰다', () => {
    const reopened = inq({
      status: '대기',
      answeredAt: '2026-08-11 09:44',
      messages: [
        { from: 'user', name: '소이', at: '2026-08-11 09:14', text: '처음 문의' },
        { from: 'admin', name: '이CS · 운영팀', at: '2026-08-11 09:44', text: '답변' },
        { from: 'user', name: '소이', at: '2026-08-11 12:14', text: '아직도 그래요' },
      ],
    })
    // 12:14 → 13:14 = 60분. 접수(09:14)부터 재면 240분이 된다.
    expect(waitMinutes(reopened, NOW)).toBe(60)
    // 첫 응답은 그대로 30분이다 — 재문의가 이 값을 바꾸면 안 된다.
    expect(firstResponseMinutes(reopened)).toBe(30)
  })

  it('한 번도 안 답했으면 첫 응답은 null', () => {
    expect(firstResponseMinutes(inq())).toBeNull()
  })

  it('시각을 못 읽으면 null', () => {
    expect(waitMinutes(inq({ at: '어제' }), NOW)).toBeNull()
  })

  // 시계가 어긋나거나 접수 시각이 미래로 들어오면 음수가 된다.
  it('⚠️ 음수가 되지 않는다', () => {
    expect(waitMinutes(inq({ at: '2026-08-11 20:00' }), NOW)).toBe(0)
  })
})

describe('durationLabel', () => {
  it('시간과 분', () => {
    expect(durationLabel(320)).toBe('5시간 20분')
    expect(durationLabel(120)).toBe('2시간')
    expect(durationLabel(45)).toBe('45분')
  })
})

describe('isOverdue', () => {
  const late = { at: '2026-08-10 21:00' }

  it(`${SLA_HOURS}시간을 넘기면 늦은 것`, () => {
    expect(isOverdue(inq(late), NOW)).toBe(true)
    expect(isOverdue(inq(), NOW)).toBe(false)
  })

  // 개발 확인을 기다리는 것도 유저에게는 기다림이다.
  it('⚠️ 「보류」 도 늦은 건으로 센다 — 빼면 잊힌다', () => {
    expect(isOverdue(inq({ ...late, status: '보류' }), NOW)).toBe(true)
  })

  it('답변완료는 늦은 건이 아니다', () => {
    expect(isOverdue(inq({ ...late, status: '답변완료', answeredAt: NOW }), NOW)).toBe(false)
  })

  it('경계는 포함이다', () => {
    expect(isOverdue(inq({ at: '2026-08-11 01:14' }), NOW)).toBe(true)
    expect(isOverdue(inq({ at: '2026-08-11 01:15' }), NOW)).toBe(false)
  })
})

describe('filterInquiries', () => {
  const list = [
    inq({ key: 0, status: '대기', category: '버그', title: '알이 부화하지 않아요', assignee: '' }),
    inq({ key: 1, status: '보류', category: '챌린지', title: '출석이 초기화됐습니다', assignee: '박라이브' }),
    inq({ key: 2, status: '답변완료', category: '결제', title: '환불 요청합니다', assignee: '이CS' }),
  ]

  it('상태 · 분류 · 검색어를 함께 건다', () => {
    expect(filterInquiries(list, { tab: '보류' }).map((i) => i.key)).toEqual([1])
    expect(filterInquiries(list, { category: '결제' }).map((i) => i.key)).toEqual([2])
    expect(filterInquiries(list, { q: '환불' }).map((i) => i.key)).toEqual([2])
    expect(filterInquiries(list, { tab: '전체' })).toHaveLength(3)
  })

  // 「누가 맡았나」 로 찾는 것이 실제 쓰임이다.
  it('⚠️ 담당자로도 찾는다', () => {
    expect(filterInquiries(list, { q: '박라이브' }).map((i) => i.key)).toEqual([1])
  })

  it('공백만 있는 검색어는 무시한다', () => {
    expect(filterInquiries(list, { q: '  ' })).toHaveLength(3)
  })
})

describe('summarizeInquiries', () => {
  const list = [
    inq({ key: 0, at: '2026-08-11 09:14', status: '대기' }),
    inq({ key: 1, at: '2026-08-10 21:00', status: '보류' }),
    inq({ key: 2, at: '2026-08-10 15:44', status: '답변완료', answeredAt: '2026-08-10 17:44', reopened: false }),
    // ⚠️ **답변했지만 재문의로 다시 열린 건.** 이게 없으면 「평균 응답」 을 현재 대기
    //    시간으로 재도 테스트가 통과한다 — 둘이 같은 값을 주기 때문이다.
    inq({
      key: 3,
      at: '2026-08-09 22:05',
      status: '대기',
      answeredAt: '2026-08-10 02:05',
      reopened: true,
      messages: [
        { from: 'user', name: '소이', at: '2026-08-09 22:05', text: '처음 문의' },
        { from: 'admin', name: '이CS · 운영팀', at: '2026-08-10 02:05', text: '답변' },
        { from: 'user', name: '소이', at: '2026-08-11 12:14', text: '아직도 그래요' },
      ],
    }),
  ]

  it('⚠️ 「답변 대기」 에 보류를 넣는다 — 빼면 잊힌다', () => {
    expect(summarizeInquiries(list, NOW).open).toBe(3)
  })

  it('늦은 건은 보류 포함', () => {
    expect(summarizeInquiries(list, NOW).overdue).toBe(1)
  })

  it('오늘 접수는 날짜로만 센다', () => {
    expect(summarizeInquiries(list, NOW).today).toBe(1)
  })

  // 재문의로 다시 열린 건도 **첫 응답은 4시간**이다. 지금 대기 시간(1시간)을 쓰면
  // 평균이 저절로 좋아진다.
  it('⚠️ 평균 응답은 「첫 응답까지」 다 — 현재 대기 시간이 아니다', () => {
    expect(summarizeInquiries(list, NOW).avgResponse).toBe(180)
  })

  it('답한 게 없으면 평균은 null — 0 분이 아니다', () => {
    expect(summarizeInquiries([inq()], NOW).avgResponse).toBeNull()
  })

  // 답을 안 한 건은 재문의가 나올 수 없다. 분모에 넣으면 비율이 낮게 나온다.
  it('⚠️ 재문의율의 분모는 답한 건이다', () => {
    expect(summarizeInquiries(list, NOW).reopenRate).toBe(50)
  })
})

describe('canReply · canHold', () => {
  // 재문의가 들어오면 이미 답한 건에 다시 답해야 한다.
  it('⚠️ 답변완료도 다시 답할 수 있다', () => {
    expect(canReply('답변완료')).toBe(true)
    expect(canReply('대기')).toBe(true)
    expect(canReply('보류')).toBe(false)
  })

  it('보류는 대기에서만 넘어간다', () => {
    expect(canHold('대기')).toBe(true)
    expect(canHold('보류')).toBe(false)
    expect(canHold('답변완료')).toBe(false)
  })
})

describe('validateReply', () => {
  // 빈 답변을 보내면 유저에게 빈 알림이 간다. 되돌릴 수 없다.
  it('⚠️ 공백만 있는 답변은 막는다', () => {
    expect(validateReply(' \n ').text).toBeTruthy()
    expect(validateReply('확인했습니다.').text).toBeUndefined()
  })
})

describe('pastInquiries', () => {
  const list = [
    inq({ key: 0, userKey: 1, at: '2026-08-11 09:14' }),
    inq({ key: 1, userKey: 1, at: '2026-07-28 10:00' }),
    inq({ key: 2, userKey: 1, at: '2026-08-01 10:00' }),
    inq({ key: 3, userKey: 2, at: '2026-08-05 10:00' }),
  ]

  it('같은 사람의 다른 문의를 최근 것부터', () => {
    expect(pastInquiries(list, list[0]!).map((i) => i.key)).toEqual([2, 1])
  })

  it('⚠️ 자기 자신은 빼고, 다른 사람 것도 뺀다', () => {
    expect(pastInquiries(list, list[0]!).map((i) => i.userKey)).toEqual([1, 1])
  })
})
