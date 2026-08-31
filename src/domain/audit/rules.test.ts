/**
 * 감사 로그 규칙 (docs/ARCHITECTURE.md §32).
 *
 * 여기가 틀리면 **사고를 조사할 때 없는 일을 보거나 있는 일을 못 본다.** 기록은 고칠 수
 * 없으니 화면이 마지막 방어선이다.
 */
import { describe, expect, it } from 'vitest'

import {
  AUDIT_CATEGORY,
  auditActors,
  filterAuditLogs,
  isRisky,
  isUnchanged,
  RISKY_KINDS,
  summarizeAudit,
} from './rules'
import type { AuditKind, AuditLog } from './types'

const log = (over: Partial<AuditLog> = {}): AuditLog => ({
  logId: 'log_88410',
  at: '2026-08-14 09:41',
  by: '김하늘',
  role: '최고 관리자',
  kind: '환불',
  target: 'ord_20260814_9921 · 소이',
  delta: '-12,100원',
  why: '회원 요청 · 오결제',
  ip: '10.4.2.18',
  field: '결제 상태',
  from: '완료',
  to: '환불',
  screen: 'pay',
  ...over,
})

describe('AUDIT_CATEGORY', () => {
  it('모든 조작 종류에 분류가 있다', () => {
    for (const kind of Object.keys(AUDIT_CATEGORY) as AuditKind[]) {
      expect(AUDIT_CATEGORY[kind]).toBeTruthy()
    }
  })

  // 원본은 「민감 목록에 없으면 전부 콘텐츠」 라, 12,000개를 뿌리는 조작이 콘텐츠였다.
  it('⚠️ 분류는 민감도와 따로 간다 — 쿠폰 발급은 재화이면서 민감하지 않다', () => {
    expect(AUDIT_CATEGORY['쿠폰 발급']).toBe('재화 · 결제')
    expect(isRisky(log({ kind: '쿠폰 발급' }))).toBe(false)
  })

  it('⚠️ 민감하지만 콘텐츠가 아닌 것도 있다 — 축이 둘이다', () => {
    expect(AUDIT_CATEGORY['관리자 초대']).toBe('권한')
    expect(isRisky(log({ kind: '관리자 초대' }))).toBe(true)
  })
})

describe('isRisky', () => {
  it('돈과 권한이 움직이는 조작을 민감으로 본다', () => {
    for (const kind of RISKY_KINDS) expect(isRisky(log({ kind }))).toBe(true)
  })

  it('콘텐츠 수정은 민감하지 않다', () => {
    for (const kind of ['아이템 수정', '챌린지 수정', '업적 수정', '배경 수정'] as const) {
      expect(isRisky(log({ kind }))).toBe(false)
    }
  })

  // 민감 목록에 없는 종류를 새로 만들면 조용히 「안 민감」 으로 쌓인다.
  it('⚠️ 민감 목록은 종류 하나에서만 나온다 — 줄마다의 플래그가 없다', () => {
    expect(RISKY_KINDS).toHaveLength(9)
    expect(RISKY_KINDS).not.toContain('쿠폰 발급')
  })
})

describe('isUnchanged', () => {
  // 「숨김 유지」 는 살펴보고 그대로 두기로 한 조작이다. 화살표로 그리면 바뀐 것처럼 읽힌다.
  it('⚠️ 앞뒤가 같으면 바뀐 것이 아니다', () => {
    expect(isUnchanged(log({ kind: '숨김 유지', from: '숨김', to: '숨김' }))).toBe(true)
    expect(isUnchanged(log({ from: '완료', to: '환불' }))).toBe(false)
  })
})

describe('filterAuditLogs', () => {
  const list = [
    log({ logId: 'a', kind: '환불', by: '김하늘' }),
    log({ logId: 'b', kind: '아이템 수정', by: '최지우', target: '성좌의 로브', why: '밑단 트림 색 조정' }),
    log({ logId: 'c', kind: '관리자 초대', by: '김하늘', target: '한지민', why: '고객 소통 담당 신규' }),
    log({ logId: 'd', kind: '쿠폰 발급', by: '박서준', target: '여름 이벤트 보상', why: '마케팅 요청 · 8월' }),
  ]

  it('민감 조작만 거른다', () => {
    expect(filterAuditLogs(list, { riskyOnly: true }).map((l) => l.logId)).toEqual(['a', 'c'])
  })

  it('관리자로 거른다', () => {
    expect(filterAuditLogs(list, { by: '김하늘' }).map((l) => l.logId)).toEqual(['a', 'c'])
  })

  // 쿠폰 발급이 「콘텐츠」 로 잡히면 재화 탭을 보는 사람이 그 조작을 영영 못 본다.
  it('⚠️ 분류로 거른다 — 쿠폰 발급은 재화 · 결제다', () => {
    expect(filterAuditLogs(list, { category: '재화 · 결제' }).map((l) => l.logId)).toEqual(['a', 'd'])
    expect(filterAuditLogs(list, { category: '콘텐츠' }).map((l) => l.logId)).toEqual(['b'])
    expect(filterAuditLogs(list, { category: '권한' }).map((l) => l.logId)).toEqual(['c'])
  })

  it('관리자 · 대상 · 사유 · 조작 넷으로 찾는다', () => {
    expect(filterAuditLogs(list, { q: '최지우' }).map((l) => l.logId)).toEqual(['b'])
    expect(filterAuditLogs(list, { q: '한지민' }).map((l) => l.logId)).toEqual(['c'])
    expect(filterAuditLogs(list, { q: '마케팅' }).map((l) => l.logId)).toEqual(['d'])
    expect(filterAuditLogs(list, { q: '환불' }).map((l) => l.logId)).toEqual(['a'])
  })

  it('여럿을 함께 건다', () => {
    expect(filterAuditLogs(list, { by: '김하늘', category: '권한' }).map((l) => l.logId)).toEqual(['c'])
  })

  it('공백만 있는 검색어는 무시한다', () => {
    expect(filterAuditLogs(list, { q: '   ' })).toHaveLength(4)
  })
})

describe('auditActors', () => {
  // 손으로 적으면 새로 들어온 관리자가 선택지에 안 나타나 그 사람 기록을 못 찾는다.
  it('⚠️ 데이터에서 만들고 중복을 지운다', () => {
    const list = [log({ by: '최지우' }), log({ by: '김하늘' }), log({ by: '최지우' })]
    expect(auditActors(list)).toEqual(['김하늘', '최지우'])
  })
})

describe('summarizeAudit', () => {
  const TODAY = '2026-08-14'
  const list = [
    log({ at: '2026-08-14 09:41', kind: '환불', by: '김하늘' }),
    log({ at: '2026-08-14 07:38', kind: '아이템 수정', by: '최지우' }),
    log({ at: '2026-08-13 22:14', kind: '계정 제재', by: '정민재' }),
    log({ at: '2026-08-12 17:20', kind: '업적 수정', by: '최지우' }),
  ]

  // 원본은 「오늘 기록 42」 를 박아 뒀는데 목록에는 15건뿐이었다.
  it('⚠️ 오늘 기록은 세어서 낸다', () => {
    expect(summarizeAudit(list, TODAY).today).toBe(2)
  })

  // 필터마다 「민감 조작」 이 바뀌면 사고 건수가 아니라 필터 결과가 된다.
  it('⚠️ 민감 조작은 전체 기간으로 센다 — 오늘이 아니다', () => {
    expect(summarizeAudit(list, TODAY).risky).toBe(2)
  })

  it('활동 관리자는 중복 없이 센다', () => {
    expect(summarizeAudit(list, TODAY).actors).toBe(3)
  })

  it('오늘 기록이 하나도 없으면 0 이다', () => {
    expect(summarizeAudit(list, '2026-08-31').today).toBe(0)
  })
})
