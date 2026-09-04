/**
 * 관리자 계정 규칙 (docs/ARCHITECTURE.md §31).
 *
 * 여기가 틀리면 **어드민에 아무도 못 들어온다** — 되돌리려면 서버에 직접 손대야 한다.
 */
import { describe, expect, it } from 'vitest'

import {
  adminStatusOf,
  ASSIGNABLE_SCOPES,
  assignableOnly,
  canSuspend,
  filterAdmins,
  hasSignedIn,
  isAdminEmail,
  isPending,
  mfaResetBlockReason,
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

describe('assignableOnly', () => {
  // 화면은 고를 수 있는 것만 그리지만 파사드는 그 화면만 부르는 게 아니다.
  it('⚠️ 고를 수 없는 스코프를 버린다', () => {
    expect(assignableOnly(['cs', 'admin', 'me', 'pay'])).toEqual(['cs', 'pay'])
  })

  it('정해진 순서로 눕힌다 — 같은 조합이 두 모양으로 남지 않게', () => {
    expect(assignableOnly(['pay', 'dash', 'items'])).toEqual(['dash', 'items', 'pay'])
  })

  it('전부 버려도 빈 배열이지 오류가 아니다 — 권한 회수는 정당한 조작이다', () => {
    expect(assignableOnly(['admin'])).toEqual([])
  })
})

describe('hasSignedIn', () => {
  // 계정 카드의 「아직 로그인하지 않음」 과 활동 표가 같은 함수를 써야 서로를 배신하지 않는다.
  it('⚠️ 최초 로그인이 비어 있으면 한 번도 들어온 적이 없다', () => {
    expect(hasSignedIn(adm({ firstLoginAt: '' }))).toBe(false)
    expect(hasSignedIn(adm({ firstLoginAt: '2026-01-08 10:22' }))).toBe(true)
  })

  // 정지는 덮개라 로그인했던 사실을 지우지 않는다.
  it('⚠️ 정지해도 로그인했던 사실은 그대로다', () => {
    expect(hasSignedIn(adm({ suspended: true }))).toBe(true)
  })
})

describe('isAdminEmail', () => {
  it('사내 아이디를 통과시킨다', () => {
    expect(isAdminEmail('jimin@riruti.co')).toBe(true)
    expect(isAdminEmail('a.b-c_1@riruti.co')).toBe(true)
  })

  // `endsWith` 만 보면 **아무도 그 아이디로 로그인할 수 없는 계정**이 만들어진다.
  it('⚠️ 로컬 파트가 없으면 아이디가 아니다', () => {
    expect(isAdminEmail('@riruti.co')).toBe(false)
  })

  it('⚠️ `@` 가 둘이면 아이디가 아니다', () => {
    expect(isAdminEmail('user@other@riruti.co')).toBe(false)
  })

  it('⚠️ 로컬 파트에 공백이 있으면 아이디가 아니다', () => {
    expect(isAdminEmail('a b@riruti.co')).toBe(false)
  })

  // 헷갈리게 만든 도메인이 통과하면 **바깥 사람에게 어드민 계정이 나간다.**
  it('⚠️ 닮은 도메인도 막는다', () => {
    expect(isAdminEmail('jimin@gmail.com')).toBe(false)
    expect(isAdminEmail('jimin@riruti.com')).toBe(false)
    expect(isAdminEmail('jimin@my-riruti.co')).toBe(false)
    expect(isAdminEmail('jimin@sub.riruti.co')).toBe(false)
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

describe('mfaResetBlockReason', () => {
  const me = 'sky@riruti.co'

  it('⚠️ 자기 계정의 2단계 인증은 초기화할 수 없다', () => {
    expect(mfaResetBlockReason(adm({ email: me }), me)).toContain('자기 계정')
    expect(mfaResetBlockReason(adm({ email: 'SKY@Riruti.co' }), me)).toContain('자기 계정')
  })

  it('이미 미설정이면 초기화할 것이 없다', () => {
    expect(mfaResetBlockReason(adm({ mfa: '미설정' }), me)).toContain('초기화할')
  })

  it('다른 등록 계정은 정지 상태여도 초기화할 수 있다', () => {
    expect(mfaResetBlockReason(adm(), me)).toBeNull()
    expect(mfaResetBlockReason(adm({ suspended: true }), me)).toBeNull()
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

  // 끝만 보면 `@riruti.co` 가 그대로 통과해 **로그인할 수 없는 계정**이 만들어진다.
  it('⚠️ 도메인만 적은 것도 막는다', () => {
    expect(validateAdmin(input({ email: '@riruti.co' }), taken).email).toContain('사내 이메일')
    expect(validateAdmin(input({ email: 'a@b@riruti.co' }), taken).email).toContain('사내 이메일')
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
