/**
 * 회원 규칙 (docs/ARCHITECTURE.md §21).
 *
 * 여기서 틀리면 **없는 회원이 보이거나 있는 회원이 안 보인다** — 탈퇴 계정을 실수로
 * 노출하는 것과, 탈퇴만 보려는 사람에게 빈 화면을 주는 것이 같은 함수에 걸려 있다.
 */
import { describe, expect, it } from 'vitest'

import { canBan, filterUsers, nextBanStatus, summarize, walletTotal } from './rules'
import type { User } from './types'

const user = (over: Partial<User> = {}): User => ({
  key: 0,
  uid: 'U-10240',
  nick: '소이',
  email: 'soi@kakao.com',
  social: 'KAKAO',
  status: 'ACTIVE',
  wallet: { gem: 100, topaz: 50 },
  paid: 0,
  certs: 10,
  joinedAt: '2026-01-14',
  lastSeenAt: '2026-08-13',
  leftAt: '',
  ...over,
})

const list = [
  user({ key: 0, nick: '소이', email: 'soi@kakao.com', status: 'ACTIVE', paid: 62000 }),
  user({ key: 1, nick: '민트초코', email: 'mint@gmail.com', social: 'GOOGLE', status: 'BANNED', paid: 33000 }),
  user({ key: 2, nick: '콩순이', email: 'kong@kakao.com', status: 'DORMANT', paid: 1100 }),
  user({ key: 3, nick: '라온', email: 'raon@kakao.com', status: 'LEFT', paid: 5500, leftAt: '2026-07-30' }),
]

describe('filterUsers', () => {
  // 탈퇴 계정은 개인정보가 지워지는 중이거나 이미 지워졌다. 평소에 보일 대상이 아니다.
  it('⚠️ 탈퇴는 기본으로 숨긴다', () => {
    expect(filterUsers(list, {}).map((u) => u.key)).toEqual([0, 1, 2])
  })

  it('켜면 포함한다', () => {
    expect(filterUsers(list, { withLeft: true })).toHaveLength(4)
  })

  // 「탈퇴」 만 보려고 고른 사람에게 "포함 스위치도 켜라" 고 하면 화면이 빈 채로 남는다.
  it('⚠️ 상태로 「탈퇴」 를 고르면 포함 스위치와 무관하게 보인다', () => {
    expect(filterUsers(list, { status: 'LEFT' }).map((u) => u.key)).toEqual([3])
  })

  it('닉네임과 이메일 양쪽으로 찾는다', () => {
    expect(filterUsers(list, { q: '민트' }).map((u) => u.key)).toEqual([1])
    expect(filterUsers(list, { q: 'kong@' }).map((u) => u.key)).toEqual([2])
  })

  it('공백만 있는 검색어는 무시한다', () => {
    expect(filterUsers(list, { q: '   ' })).toHaveLength(3)
  })

  it('소셜·상태를 함께 건다', () => {
    expect(filterUsers(list, { social: 'GOOGLE' }).map((u) => u.key)).toEqual([1])
    expect(filterUsers(list, { status: 'DORMANT' }).map((u) => u.key)).toEqual([2])
  })
})

describe('nextBanStatus · canBan', () => {
  it('걸면 제재, 풀면 정상', () => {
    expect(nextBanStatus(user(), true)).toBe('BANNED')
    expect(nextBanStatus(user({ status: 'BANNED' }), false)).toBe('ACTIVE')
  })

  // 탈퇴에 제재를 걸었다 풀면 「정상」 이 되어 탈퇴가 취소된 것처럼 읽힌다.
  it('⚠️ 탈퇴 계정은 상태가 바뀌지 않는다', () => {
    const left = user({ status: 'LEFT' })
    expect(nextBanStatus(left, true)).toBe('LEFT')
    expect(nextBanStatus(left, false)).toBe('LEFT')
    expect(canBan(left)).toBe(false)
  })

  // 휴면은 접속 기록이 정하는 파생 상태다. 우리는 그 기록이 없어 되돌릴 수 없다.
  it('휴면이던 사람의 제재를 풀면 「정상」 이다', () => {
    expect(nextBanStatus(user({ status: 'DORMANT' }), false)).toBe('ACTIVE')
  })
})

describe('summarize', () => {
  // 탈퇴를 세면 「전체 회원」 이 실제 쓰는 사람 수보다 커진다.
  it('⚠️ 탈퇴는 어느 지표에도 안 들어간다', () => {
    expect(summarize(list)).toEqual({ total: 3, paying: 3, banned: 1 })
  })

  it('결제 0 원은 결제 회원이 아니다', () => {
    expect(summarize([user({ paid: 0 })]).paying).toBe(0)
  })
})

describe('walletTotal', () => {
  it('두 재화의 합', () => {
    expect(walletTotal({ gem: 1840, topaz: 320 })).toBe(2160)
  })
})
