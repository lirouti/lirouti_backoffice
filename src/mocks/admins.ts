/**
 * 관리자 계정 목 데이터. 디자인 원본 `ADMINS` 7건을 값 그대로 옮겼다.
 *
 * ⚠️ **`이메일 코드` 를 `앱 OTP` 로 바꿨다.** 원본은 3명이 그 값이었는데 우리 로그인에는
 *    그 경로가 없어서, 그대로 두면 **2차를 통과할 수 없는 계정**이 된다
 *    (docs/ARCHITECTURE.md §31.1).
 */
import type { Admin, AdminInput, AdminLog } from '@/domain/admin'
import type { ScopeId } from '@/domain/screens'

type Row = [
  name: string,
  email: string,
  role: 'top' | 'operator',
  scopes: ScopeId[],
  passkey: '' | 'mac' | 'iphone',
  seenAt: string,
  state: Admin['state'],
  suspended: boolean,
  invitedBy: string,
  invitedAt: string,
  firstLoginAt: string,
  mfa: Admin['mfa'],
]

const ROWS: Row[] = [
  ['김하늘', 'sky@riruti.co', 'top', [], 'mac', '5분 전', '활성', false, '나', '2025-11-02', '2025-11-02 09:14', '앱 OTP'],
  ['박서준', 'seojun@riruti.co', 'operator', ['items', 'shop', 'ops'], 'mac', '1시간 전', '활성', false, '김하늘', '2026-01-08', '2026-01-08 10:22', '앱 OTP'],
  ['이도윤', 'doyun@riruti.co', 'operator', ['chal', 'ach', 'cs'], 'iphone', '3시간 전', '활성', false, '김하늘', '2026-02-14', '2026-02-14 14:05', '앱 OTP'],
  ['최지우', 'jiwoo@riruti.co', 'operator', ['char', 'bg', 'levels'], '', '어제', '활성', false, '김하늘', '2026-03-21', '2026-03-21 11:40', '앱 OTP'],
  ['정민재', 'minjae@riruti.co', 'operator', ['cs'], 'mac', '2일 전', '활성', false, '박서준', '2026-04-02', '2026-04-02 09:03', '앱 OTP'],
  ['한소희', 'sohee@riruti.co', 'operator', ['dash', 'shop'], '', '12일 전', '휴면', false, '김하늘', '2026-05-19', '2026-05-19 16:28', '앱 OTP'],
  // ⚠️ 대기 계정은 최초 로그인이 **`''` 다.** 원본의 `—` 를 그대로 두면 날짜 칸에
  //    날짜가 아닌 값이 들어가, 정렬하거나 비교하는 순간 조용히 어긋난다.
  ['윤태오', 'taeo@riruti.co', 'operator', ['items'], '', '—', '대기', false, '김하늘', '2026-08-09', '', '미설정'],
]

/**
 * 모듈 수준 캐시. **새로고침하면 초대·정지·권한 변경이 전부 사라진다** — 목이라 그렇다.
 */
const admins: Admin[] = ROWS.map(
  ([name, email, role, scopes, passkey, seenAt, state, suspended, invitedBy, invitedAt, firstLoginAt, mfa], i) => ({
    adminId: i + 1,
    name,
    email,
    role,
    scopes,
    passkey,
    seenAt,
    state,
    suspended,
    invitedBy,
    invitedAt,
    firstLoginAt,
    mfa,
  }),
)

export const allAdmins = (): Admin[] => admins.map((a) => ({ ...a, scopes: [...a.scopes] }))

export const findAdmin = (adminId: number): Admin | undefined =>
  allAdmins().find((a) => a.adminId === adminId)

/**
 * 초대. **다듬는 것은 파사드의 일이라 여기서는 받은 값을 그대로 쓴다** (§29.3.1).
 *
 * 새 계정은 **`대기`** 로 만든다 — 초대 메일을 받고 로그인해야 비로소 쓰는 계정이다.
 */
export function addAdmin(input: AdminInput, invitedBy: string, todayStr: string): Admin {
  const made: Admin = {
    adminId: Math.max(0, ...admins.map((a) => a.adminId)) + 1,
    name: input.name,
    email: input.email,
    role: input.role,
    scopes: input.scopes,
    passkey: '',
    seenAt: '—',
    state: '대기',
    suspended: false,
    invitedBy,
    invitedAt: todayStr,
    firstLoginAt: '',
    mfa: '미설정',
  }
  admins.push(made)
  return made
}

export function setAdminSuspended(adminId: number, suspended: boolean): void {
  const found = admins.find((a) => a.adminId === adminId)
  if (found) found.suspended = suspended
}

export function setAdminScopes(adminId: number, scopes: ScopeId[]): void {
  const found = admins.find((a) => a.adminId === adminId)
  if (found) found.scopes = [...scopes]
}

/** 등록된 인증 앱과 백업 코드를 함께 폐기한 뒤의 표시 상태를 반영한다. */
export function setAdminMfa(adminId: number, mfa: Admin['mfa']): void {
  const found = admins.find((a) => a.adminId === adminId)
  if (found) found.mfa = mfa
}

/**
 * 상세의 「최근 활동」.
 *
 * ⚠️ **로그인 줄을 원본에서 바꿨다.** 원본은 패스키가 있는 사람에게 「생체 인증으로
 *    로그인」 을 적었는데, 우리 로그인 경로는 **비밀번호 + 인증 앱 하나뿐**이라
 *    일어난 적 없는 일을 기록으로 남기게 된다 (docs/ARCHITECTURE.md §31.1).
 */
export function adminLogs(adminId: number): AdminLog[] {
  const device = adminId % 2 === 0 ? 'Chrome · macOS' : 'Chrome · Windows'
  return [
    { at: '2026-08-11 09:12', kind: '로그인', what: '비밀번호 · 인증 앱으로 로그인', device },
    { at: '2026-08-10 17:40', kind: '수정', what: '아이템 · 성좌의 로브 가격 변경', device: 'Chrome · macOS' },
    { at: '2026-08-10 11:26', kind: '등록', what: '챌린지 · 여름 사진 모으기', device: 'Chrome · macOS' },
    { at: '2026-08-08 15:02', kind: '지급', what: '젬 500개 · 점검 보상', device: 'Chrome · macOS' },
    { at: '2026-08-07 10:18', kind: '로그인', what: '비밀번호 · 인증 앱으로 로그인', device: 'Chrome · Windows' },
    { at: '2026-08-05 09:33', kind: '수정', what: 'FAQ · 부화 관련 답변', device: 'Chrome · macOS' },
  ]
}

/** 이번 달 활동 건수. 원본이 `37 - i * 4` 로 만든 값을 그대로 옮겼다 */
export const adminMonthlyActions = (adminId: number): number => Math.max(1, 41 - adminId * 4)
