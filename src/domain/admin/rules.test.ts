/**
 * 관리자 계정 규칙 (docs/ARCHITECTURE.md §31).
 *
 * 여기가 틀리면 **어드민에 아무도 못 들어온다** — 되돌리려면 서버에 직접 손대야 한다.
 */
import { describe, expect, it } from 'vitest'

import {
  adminStatusOf,
  ASSIGNABLE_SCOPES,
  canSuspend,
  filterAdmins,
  isPending,
  normalizeAdminInput,
  sameEmail,
  summarizeAdmins,
  suspendBlockReason,
  validateAdmin,
  viewerOf,
} from './rules'
import type { Admin, AdminInput } from './types'

const adm = (over: Partial<Admin> = {}): Admin => ({
  adminId: 1,
  name: '박서준',
  email: 'seojun@riruti.co',
  role: 'operator',
  scopes: ['items', 'shop', 'ops'],
  passkey: 'mac',
  seenAt: '1시간 전',
  state: '활성',
  suspended: false,
  invitedBy: '김하늘',
  invitedAt: '2026-01-08',
  firstLoginAt: '2026-01-08 10:22',
  mfa: '앱 OTP',
  ...over,
})

const input = (over: Partial<AdminInput> = {}): AdminInput => ({
  name: '한지민',
  email: 'jimin@riruti.co',
  role: 'operator',
  scopes: ['cs'],
  ...over,
})

describe('ASSIGNABLE_SCOPES', () => {
  // 체크해도 아무 일이 없는 칸을 만들면 운영자가 권한을 줬다고 믿는다.
  it('⚠️ `admin` 과 `me` 는 고를 수 없다', () => {
    expect(ASSIGNABLE_SCOPES).not.toContain('admin')
    expect(ASSIGNABLE_SCOPES).not.toContain('me')
  })
})

describe('viewerOf', () => {
  it('운영자는 담당 모듈을 그대로 가진다', () => {
    expect(viewerOf(adm())).toMatchObject({ role: 'operator', scopes: ['items', 'shop', 'ops'] })
  })

  // 전체 접근인 계정에 3개만 적힌 뷰어를 만들면 미리보기가 실제보다 좁게 나온다.
  it('⚠️ 최고 관리자는 모듈을 비운다 — 전체 접근이라 목록이 의미 없다', () => {
    expect(viewerOf(adm({ role: 'top', scopes: ['items'] })).scopes).toEqual([])
  })
})

describe('adminStatusOf', () => {
  it('막지 않았으면 지나온 상태 그대로', () => {
    expect(adminStatusOf(adm({ state: '휴면' }))).toBe('휴면')
  })

  it('막았으면 정지', () => {
    expect(adminStatusOf(adm({ state: '활성', suspended: true }))).toBe('정지')
  })

  // `state` 를 `정지` 로 덮어쓰면 원래 상태를 잃어서, 푸는 순간 **한 번도 로그인하지
  // 않은 계정이 「활성」 으로 되살아난다.**
  it('⚠️ 정지를 풀면 원래 상태로 돌아온다 — 활성이 아니다', () => {
    const waiting = adm({ state: '대기', suspended: true })
    expect(adminStatusOf(waiting)).toBe('정지')
    expect(adminStatusOf({ ...waiting, suspended: false })).toBe('대기')
  })
})

describe('isPending · summarizeAdmins · filterAdmins', () => {
  const list = [
    adm({ adminId: 0, name: '김하늘', email: 'sky@riruti.co', role: 'top', scopes: [] }),
    adm({ adminId: 1 }),
    adm({ adminId: 2, name: '한소희', email: 'sohee@riruti.co', state: '휴면', passkey: '' }),
    adm({ adminId: 3, name: '윤태오', email: 'taeo@riruti.co', state: '대기', passkey: '' }),
    adm({ adminId: 4, name: '정민재', email: 'minjae@riruti.co', suspended: true }),
  ]

  // 원본은 지표를 `!== '활성'` 로 세고 탭은 대기·정지만 걸러서
  // **「대기 · 정지 3」 인데 눌러 보면 2건**이었다. 휴면이 숫자에만 들어갔다.
  it('⚠️ 지표와 탭이 같은 집합을 센다 — 휴면은 어느 쪽에도 없다', () => {
    expect(summarizeAdmins(list).pending).toBe(2)
    expect(filterAdmins(list, { tab: '대기 · 정지' }).map((a) => a.adminId)).toEqual([3, 4])
    expect(isPending(list[2]!)).toBe(false)
  })

  it('지표를 센다', () => {
    expect(summarizeAdmins(list)).toEqual({ total: 5, active: 2, passkey: 3, pending: 2 })
  })

  it('역할 탭으로 가른다', () => {
    expect(filterAdmins(list, { tab: '최고 관리자' }).map((a) => a.adminId)).toEqual([0])
    expect(filterAdmins(list, { tab: '운영자' })).toHaveLength(4)
    expect(filterAdmins(list, { tab: '전체' })).toHaveLength(5)
  })

  it('이름과 아이디 둘로 찾는다', () => {
    expect(filterAdmins(list, { q: '소희' }).map((a) => a.adminId)).toEqual([2])
    expect(filterAdmins(list, { q: 'taeo' }).map((a) => a.adminId)).toEqual([3])
  })

  it('⚠️ 대소문자를 가리지 않는다 — 아이디는 소문자로 저장된다', () => {
    expect(filterAdmins(list, { q: 'TAEO' }).map((a) => a.adminId)).toEqual([3])
  })

  it('공백만 있는 검색어는 무시한다', () => {
    expect(filterAdmins(list, { q: '   ' })).toHaveLength(5)
  })
})

describe('suspendBlockReason', () => {
  const me = 'sky@riruti.co'

  // 누르는 순간 다음 로그인이 막히는데 풀어 줄 사람이 자기 자신이다.
  it('⚠️ 자기 계정은 정지할 수 없다', () => {
    expect(canSuspend(adm({ email: me }), me)).toBe(false)
    expect(suspendBlockReason(adm({ email: me }), me)).toContain('자기 계정')
  })

  it('⚠️ 대소문자가 달라도 자기 계정이다', () => {
    expect(canSuspend(adm({ email: 'SKY@Riruti.co' }), me)).toBe(false)
  })

  it('남은 정지할 수 있다', () => {
    expect(canSuspend(adm(), me)).toBe(true)
  })

  // 이미 정지된 자기 계정은 있을 수 없지만, 해제까지 막으면 규칙이 상태를 굳힌다.
  it('정지 해제는 언제나 된다', () => {
    expect(canSuspend(adm({ email: me, suspended: true }), me)).toBe(true)
  })
})

describe('sameEmail', () => {
  it('앞뒤 공백과 대소문자를 무시한다', () => {
    expect(sameEmail(' Sky@Riruti.co ', 'sky@riruti.co')).toBe(true)
    expect(sameEmail('sky@riruti.co', 'seojun@riruti.co')).toBe(false)
  })
})

describe('normalizeAdminInput', () => {
  it('이름은 다듬고 아이디는 소문자로 눕힌다', () => {
    const v = normalizeAdminInput(input({ name: '  한지민 ', email: ' JIMIN@Riruti.CO ' }))
    expect(v).toMatchObject({ name: '한지민', email: 'jimin@riruti.co' })
  })

  // 운영자로 모듈을 고르다 최고 관리자로 바꾸면 고른 목록이 그대로 남는다.
  it('⚠️ 최고 관리자로 바꾸면 고른 모듈을 지운다', () => {
    expect(normalizeAdminInput(input({ role: 'top', scopes: ['items', 'cs'] })).scopes).toEqual([])
  })

  // 화면이 넘긴 순서를 그대로 저장하면 같은 조합이 두 가지 모양으로 남는다.
  it('모듈은 정해진 순서로 눕힌다', () => {
    expect(normalizeAdminInput(input({ scopes: ['pay', 'dash', 'items'] })).scopes).toEqual([
      'dash',
      'items',
      'pay',
    ])
  })

  it('⚠️ 고를 수 없는 스코프는 버린다', () => {
    expect(normalizeAdminInput(input({ scopes: ['cs', 'admin', 'me'] })).scopes).toEqual(['cs'])
  })

  it('두 번 돌려도 같다', () => {
    const once = normalizeAdminInput(input({ name: ' 한지민 ', scopes: ['pay', 'dash'] }))
    expect(normalizeAdminInput(once)).toEqual(once)
  })
})

describe('validateAdmin', () => {
  const taken = ['sky@riruti.co', 'seojun@riruti.co']

  it('제대로 채우면 통과한다', () => {
    expect(validateAdmin(input(), taken)).toEqual({})
  })

  it('이름과 아이디는 필수 — 공백만 있는 것도 빈 것이다', () => {
    const e = validateAdmin(input({ name: '   ', email: '  ' }), taken)
    expect(e.name).toBe('이름을 입력하세요.')
    expect(e.email).toBe('아이디를 입력하세요.')
  })

  it('사내 이메일이 아니면 막는다', () => {
    expect(validateAdmin(input({ email: 'jimin@gmail.com' }), taken).email).toContain('사내 이메일')
  })

  // 같은 아이디로 두 계정이 생기면 로그인이 어느 쪽인지 알 수 없다.
  it('⚠️ 이미 쓰이는 아이디는 대소문자가 달라도 막는다', () => {
    expect(validateAdmin(input({ email: 'SKY@riruti.co' }), taken).email).toBe(
      '이미 쓰이고 있는 아이디입니다.',
    )
  })

  // 0개로 부르면 로그인해도 사이드바가 비어 있어 할 수 있는 일이 없다.
  it('⚠️ 운영자는 담당 모듈이 하나는 있어야 한다', () => {
    expect(validateAdmin(input({ scopes: [] }), taken).scopes).toBe('담당 모듈을 하나 이상 고르세요.')
  })

  // 최고 관리자는 전체 접근이라 고를 것이 없다. 여기서 막으면 발급 자체가 안 된다.
  it('⚠️ 최고 관리자는 모듈이 0개여도 통과한다', () => {
    expect(validateAdmin(input({ role: 'top', scopes: [] }), taken)).toEqual({})
  })
})
