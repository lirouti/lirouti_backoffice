/**
 * 관리자 계정 규칙.
 *
 * 여기가 틀리면 **어드민에 아무도 못 들어온다** — 자기 계정을 막거나, 로그인할 수 없는
 * 수단으로 계정을 발급하거나, 같은 아이디로 두 계정을 만들면 되돌릴 길이 서버뿐이다.
 */
import type { Viewer } from '../access'
import type { ScopeId } from '../screens'
import type { Admin, AdminInput, AdminStatus } from './types'

/**
 * 담당 모듈로 **고를 수 있는** 스코프. `ScopeId` 전체가 아니다.
 *
 * - `admin` — 관리자 모듈은 최고 관리자 전용이라 `canAccess` 가 무조건 막는다.
 *   목록에 두면 체크해도 아무 일이 없는 칸이 된다.
 * - `me` — 내 계정 보안은 **누구나 통과**한다. 줄 것이 없다.
 *
 * ⚠️ **`ScopeId` 에 스코프를 더하면 여기에도 더해야 한다.** 안 그러면 새 모듈은
 *    사이드바에 나오지만 아무에게도 배정할 수 없다.
 */
export const ASSIGNABLE_SCOPES: ScopeId[] = [
  'dash',
  'char',
  'items',
  'bg',
  'levels',
  'chal',
  'ach',
  'shop',
  'ops',
  'cs',
  'code',
  'user',
  'mod',
  'pay',
]

/**
 * 고를 수 있는 것만 남기고 **정해진 순서로 눕힌다.**
 *
 * ⚠️ **화면이 거르는 것에 기대지 않는다.** 화면은 `ASSIGNABLE_SCOPES` 만 그리지만,
 *    파사드는 그 화면만 부르는 게 아니다 — 목록에 없는 스코프가 저장되면 아무도
 *    못 보는 권한이 계정에 붙는다 (docs/ARCHITECTURE.md §31.6).
 */
export const assignableOnly = (scopes: ScopeId[]): ScopeId[] =>
  ASSIGNABLE_SCOPES.filter((s) => scopes.includes(s))

/**
 * 한 번이라도 로그인했는가.
 *
 * ⚠️ **활동 기록이 있을 수 있는지를 이 함수가 정한다.** 상태(`대기`)가 아니라 **사실**
 *    (`firstLoginAt`)로 판정한다 — 계정 카드의 「아직 로그인하지 않음」 과 활동 표가
 *    같은 함수를 써야 서로를 배신하지 않는다 (docs/ARCHITECTURE.md §31.10).
 */
export const hasSignedIn = (a: Admin): boolean => a.firstLoginAt !== ''

/**
 * 이 계정으로 로그인하면 무엇이 보이는가.
 *
 * 「이 계정으로 보기」 와 「사이드바에 표시」 미리보기가 **같은 함수를 쓴다** — 보여 준
 * 목록과 실제로 들어갔을 때가 다르면 미리보기가 거짓말이 된다.
 */
export const viewerOf = (a: Admin): Viewer => ({
  role: a.role,
  name: a.name,
  email: a.email,
  scopes: a.role === 'top' ? [] : a.scopes,
})

/**
 * 화면에 보일 상태.
 *
 * ⚠️ **정지는 상태가 아니라 덮개다.** `state` 를 `정지` 로 바꿔 버리면 원래 상태를 잃어서
 *    대기 계정을 정지했다 푸는 순간 **「활성」 으로 되살아난다** — 로그인한 적이 없는
 *    계정이 쓰고 있는 계정으로 보인다 (docs/ARCHITECTURE.md §31.3).
 */
export const adminStatusOf = (a: Admin): AdminStatus => (a.suspended ? '정지' : a.state)

/**
 * 「대기 · 정지」 에 해당하는가.
 *
 * ⚠️ **지표와 탭이 이 함수를 함께 쓴다.** 원본은 지표를 `상태 !== '활성'` 로 세고 탭은
 *    대기·정지만 걸러서, **「대기 · 정지 2」 인데 눌러 보면 1건**이었다 — 휴면이
 *    숫자에만 들어갔다 (docs/ARCHITECTURE.md §31.2).
 */
export const isPending = (a: Admin): boolean => a.suspended || a.state === '대기'

/** 목록 위 지표 */
export type AdminSummary = {
  total: number
  active: number
  /** 패스키를 등록한 사람 수. 표시 전용이다 */
  passkey: number
  pending: number
}

export function summarizeAdmins(list: Admin[]): AdminSummary {
  return {
    total: list.length,
    active: list.filter((a) => adminStatusOf(a) === '활성').length,
    passkey: list.filter((a) => a.passkey !== '').length,
    pending: list.filter(isPending).length,
  }
}

export type AdminTab = '전체' | '최고 관리자' | '운영자' | '대기 · 정지'

export const ADMIN_TABS: AdminTab[] = ['전체', '최고 관리자', '운영자', '대기 · 정지']

export type AdminFilter = {
  tab?: AdminTab
  /** 이름 · 아이디 부분 일치 */
  q?: string
}

export function filterAdmins(list: Admin[], f: AdminFilter): Admin[] {
  const q = f.q?.trim().toLowerCase()
  return list.filter((a) => {
    if (f.tab === '최고 관리자' && a.role !== 'top') return false
    if (f.tab === '운영자' && a.role !== 'operator') return false
    if (f.tab === '대기 · 정지' && !isPending(a)) return false
    if (q && !a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q))
      return false
    return true
  })
}

/** 아이디 비교용 — 대소문자와 앞뒤 공백은 같은 계정이다 */
export const sameEmail = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * 정지가 막히는 이유. 막히지 않으면 `null`.
 *
 * ⚠️ **자기 자신은 정지할 수 없다.** 누르는 순간 다음 로그인이 막히는데, 풀어 줄 수 있는
 *    사람이 자기 자신이라 **서버에 직접 손대지 않는 한 복구할 수 없다.**
 *
 * 「마지막 최고 관리자」 규칙은 **일부러 넣지 않았다.** 이 화면에 올 수 있는 사람은
 *    최고 관리자뿐이고(`canAccess` 가 `admin` 을 top 에게만 연다), 그가 자기를 못 멈추면
 *    최고 관리자는 항상 최소 한 명 남는다 — 도달할 수 없는 규칙이라 테스트로 고정할
 *    수도 없다 (docs/ARCHITECTURE.md §31.3).
 *
 * @param meEmail 지금 로그인한 사람의 아이디
 */
export function suspendBlockReason(target: Admin, meEmail: string): string | null {
  if (target.suspended) return null // 해제는 언제나 된다
  if (sameEmail(target.email, meEmail)) return '자기 계정은 정지할 수 없습니다.'
  return null
}

/** 정지를 누를 수 있는가 */
export const canSuspend = (target: Admin, meEmail: string): boolean =>
  suspendBlockReason(target, meEmail) === null

/**
 * 2단계 인증 초기화가 막히는 이유. 막히지 않으면 `null`.
 *
 * ⚠️ **자기 인증 수단은 초기화할 수 없다.** 열린 세션 하나만으로 자기 2차 인증을
 * 없앨 수 있으면 복구가 아니라 잠금 해제가 된다 (docs/ARCHITECTURE.md §50.1).
 */
export function mfaResetBlockReason(target: Admin, meEmail: string): string | null {
  if (sameEmail(target.email, meEmail)) return '자기 계정의 2단계 인증은 초기화할 수 없습니다.'
  if (target.mfa === '미설정') return '초기화할 2단계 인증이 없습니다.'
  return null
}

/** 비밀번호 초기화 메일 발송이 막히는 이유. 막히지 않으면 `null`. */
export function passwordResetBlockReason(target: Admin): string | null {
  if (!hasSignedIn(target)) return '아직 로그인하지 않은 계정은 초대 링크로 시작합니다.'
  return null
}

/**
 * 저장 직전에 다듬는다.
 *
 * ⚠️ **역할이 안 쓰는 칸은 지운다.** 운영자로 모듈을 고르다 최고 관리자로 바꾸면 검증은
 *    그 칸을 안 보므로 고른 목록이 그대로 남는다 — 전체 접근인 계정에 14개 중 3개만
 *    적힌 기록이 생긴다 (docs/ARCHITECTURE.md §31.4).
 *
 * 아이디는 **소문자로 눕힌다** — `Sky@` 와 `sky@` 가 다른 계정이 되면 안 된다.
 */
export function normalizeAdminInput(input: AdminInput): AdminInput {
  const top = input.role === 'top'
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    scopes: top ? [] : assignableOnly(input.scopes),
  }
}

/** 어느 칸이 왜 막혔는가 */
export type AdminErrors = {
  name?: string
  email?: string
  scopes?: string
}

/** 사내 아이디 도메인. 화면의 안내 문구와 검증이 이 하나를 함께 쓴다 */
export const ADMIN_EMAIL_DOMAIN = '@riruti.co'

/**
 * 쓸 수 있는 사내 아이디인가.
 *
 * ⚠️ **끝만 보면 안 된다.** `endsWith` 하나로는 로컬 파트가 없는 `@riruti.co` 와 `@` 가
 *    둘인 `user@other@riruti.co` 가 그대로 통과해서, **아무도 그 아이디로 로그인할 수
 *    없는 계정**이 만들어진다 (docs/ARCHITECTURE.md §31.11).
 *
 * 도메인은 `ADMIN_EMAIL_DOMAIN` 에서 잘라 낸다 — 정규식에 도메인을 또 적으면 둘이 어긋난다.
 */
export function isAdminEmail(v: string): boolean {
  if (!v.endsWith(ADMIN_EMAIL_DOMAIN)) return false
  const local = v.slice(0, -ADMIN_EMAIL_DOMAIN.length)
  return local !== '' && !/[@\s]/.test(local)
}

/**
 * 초대 폼 검증.
 *
 * ⚠️ **운영자는 담당 모듈이 하나는 있어야 한다.** 0개로 부르면 로그인해도 사이드바가
 *    비어 있어 할 수 있는 일이 없다. **상세에서 마지막 하나를 해제하는 것은 막지 않는다** —
 *    그건 권한 회수라는 정당한 조작이다 (docs/ARCHITECTURE.md §31.5).
 *
 * @param taken 이미 쓰이고 있는 아이디들. 같은 아이디로 두 계정이 생기면 로그인이
 *              어느 쪽인지 알 수 없다
 */
export function validateAdmin(input: AdminInput, taken: string[]): AdminErrors {
  const errors: AdminErrors = {}
  const v = normalizeAdminInput(input)

  if (!v.name) errors.name = '이름을 입력하세요.'

  if (!v.email) errors.email = '아이디를 입력하세요.'
  else if (!isAdminEmail(v.email))
    errors.email = `아이디는 사내 이메일(${ADMIN_EMAIL_DOMAIN})이어야 합니다.`
  else if (taken.some((t) => sameEmail(t, v.email)))
    errors.email = '이미 쓰이고 있는 아이디입니다.'

  if (v.role === 'operator' && v.scopes.length === 0)
    errors.scopes = '담당 모듈을 하나 이상 고르세요.'

  return errors
}
