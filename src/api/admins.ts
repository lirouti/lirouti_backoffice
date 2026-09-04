/**
 * 관리자 계정 파사드.
 *
 * ⚠️ **같은 아이디로 두 계정이 생기면 로그인이 어느 쪽인지 알 수 없다.** 화면이 막아도
 *    여기서 다시 본다 — 화면의 중복 목록은 불러온 시점의 것이라, 그 사이 다른
 *    최고 관리자가 같은 아이디를 발급했으면 통과한다 (docs/ARCHITECTURE.md §31.6).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { visibleNav } from '@/domain/access'
import {
  adminStatusOf,
  assignableOnly,
  filterAdmins,
  hasSignedIn,
  normalizeAdminInput,
  mfaResetBlockReason,
  sameEmail,
  suspendBlockReason,
  summarizeAdmins,
  validateAdmin,
  viewerOf,
  type Admin,
  type AdminFilter,
  type AdminInput,
  type AdminLog,
  type AdminStatus,
  type AdminSummary,
} from '@/domain/admin'
import type { ScopeId } from '@/domain/screens'

import {
  addAdmin,
  adminLogs,
  adminMonthlyActions,
  allAdmins,
  findAdmin,
  setAdminMfa,
  setAdminScopes,
  setAdminSuspended,
} from '@/mocks/admins'

import { mockDelay, qk, queryClient, today, USE_MOCK } from './core'
import { apiError } from './error'

/** 관리자 + 그 시점의 표시 상태. **상태는 화면이 아니라 여기서 낸다** (§25.1) */
export type AdminEntry = { admin: Admin; status: AdminStatus }

export type AdminsResult = {
  admins: AdminEntry[]
  summary: AdminSummary
  /** 이미 쓰이고 있는 아이디. 초대 화면의 중복 검사가 쓴다 */
  takenEmails: string[]
}

const entry = (admin: Admin): AdminEntry => ({ admin, status: adminStatusOf(admin) })

export async function getAdmins(filter: AdminFilter): Promise<AdminsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allAdmins()
    return {
      admins: filterAdmins(all, filter).map(entry),
      // 지표는 **거르기 전 전체**로 낸다 — 탭마다 「활성」 이 바뀌면 안 된다.
      summary: summarizeAdmins(all),
      takenEmails: all.map((a) => a.email),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<AdminDto[]>('/admin/admins')
  throw new Error('관리자 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export type AdminDetail = AdminEntry & {
  /** 이 계정으로 로그인하면 사이드바에 뜨는 그룹 이름들 */
  menu: string[]
  /** ⚠️ **한 번도 로그인하지 않은 계정은 빈 배열이다** (§31.10) */
  logs: AdminLog[]
  /** 이번 달 활동 건수 */
  actions: number
  /** 지금 로그인한 사람의 아이디로 정지가 막히는 이유. 없으면 `null` */
  suspendBlocked: string | null
}

/** @param meEmail 지금 로그인한 사람의 아이디. 자기 계정 정지를 막는 판정에 쓴다 */
export async function getAdmin(adminId: string, meEmail: string): Promise<AdminDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const admin = findAdmin(Number(adminId))
    if (!admin) throw apiError('http', `관리자 #${adminId} 을(를) 찾을 수 없습니다.`, 404)
    return {
      ...entry(admin),
      // 「사이드바에 표시」 와 「이 계정으로 보기」 가 **같은 판정을 쓴다** —
      // 보여 준 목록과 실제로 들어갔을 때가 다르면 미리보기가 거짓말이 된다.
      menu: visibleNav(viewerOf(admin)).map((g) => g.label),
      // ⚠️ **로그인한 적 없는 계정에는 활동이 있을 수 없다.** 계정 카드가 「아직
      //    로그인하지 않음」 이라고 적어 둔 옆에 로그인 기록 여섯 줄이 떠 있었다.
      logs: hasSignedIn(admin) ? adminLogs(admin.adminId) : [],
      actions: hasSignedIn(admin) ? adminMonthlyActions(admin.adminId) : 0,
      suspendBlocked: suspendBlockReason(admin, meEmail),
    }
  }

  throw new Error('관리자 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useAdmins(filter: AdminFilter) {
  return useQuery({ queryKey: qk.admins.list(filter), queryFn: () => getAdmins(filter) })
}

export function useAdmin(adminId: string, meEmail: string) {
  return useQuery({
    queryKey: qk.admins.detail(adminId),
    queryFn: () => getAdmin(adminId, meEmail),
    enabled: adminId !== '',
  })
}

/** @param invitedBy 발급하는 사람의 이름. 상세의 「발급자」 로 남는다 */
export async function inviteAdmin(v: { input: AdminInput; invitedBy: string }): Promise<Admin> {
  if (USE_MOCK) {
    await mockDelay()
    // **다듬은 값으로 검증하고 그 값을 그대로 저장한다** — 검사한 것과 저장한 것이
    // 다르면 검증이 아무것도 보장하지 못한다 (§29.3.1).
    const input = normalizeAdminInput(v.input)
    const taken = allAdmins().map((a) => a.email)
    const errors = validateAdmin(input, taken)
    const first = errors.name ?? errors.email ?? errors.scopes
    if (first) throw apiError('http', first, 400)
    return addAdmin(input, v.invitedBy, today())
  }

  throw new Error('관리자 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useInviteAdmin() {
  return useMutation({
    mutationFn: inviteAdmin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.admins.all }),
  })
}

export async function suspendAdmin(v: {
  adminId: number
  suspended: boolean
  meEmail: string
}): Promise<void> {
  if (USE_MOCK) {
    await mockDelay()
    const admin = findAdmin(v.adminId)
    if (!admin) throw apiError('http', `관리자 #${v.adminId} 을(를) 찾을 수 없습니다.`, 404)
    // 화면이 버튼을 잠그지만, 잠긴 버튼은 **보이는 것만** 막는다.
    if (v.suspended) {
      const blocked = suspendBlockReason(admin, v.meEmail)
      if (blocked) throw apiError('http', blocked, 409)
    }
    setAdminSuspended(v.adminId, v.suspended)
    return
  }

  throw new Error('관리자 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSuspendAdmin() {
  return useMutation({
    mutationFn: suspendAdmin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.admins.all }),
  })
}

/**
 * 다른 관리자의 등록된 인증 앱과 백업 코드를 폐기한다.
 *
 * 화면의 비활성 상태에 기대지 않고 자기 계정과 미설정 계정을 여기서 다시 막는다 (§50).
 */
export async function resetMfa(v: { adminId: number; meEmail: string }): Promise<void> {
  if (USE_MOCK) {
    await mockDelay()
    const admin = findAdmin(v.adminId)
    if (!admin) throw apiError('http', `관리자 #${v.adminId} 을(를) 찾을 수 없습니다.`, 404)
    const blocked = mfaResetBlockReason(admin, v.meEmail)
    if (blocked) throw apiError('http', blocked, 409)
    setAdminMfa(v.adminId, '미설정')
    return
  }

  throw new Error('관리자 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useResetMfa() {
  return useMutation({
    mutationFn: resetMfa,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.admins.all }),
  })
}

/**
 * 담당 모듈 변경. **저장 버튼 없이 즉시 반영된다** — 권한 회수는 미루면 안 된다.
 *
 * ⚠️ **0개로 만드는 것은 막지 않는다.** 초대와 달리 이건 권한 회수라는 정당한 조작이다
 *    (§31.5). 모듈이 없어도 내 계정 보안(`me`)은 열리므로 계정이 잠기지도 않는다.
 *
 * ⚠️ **최고 관리자의 모듈은 바꿀 수 없다.** 전체 접근이라 목록 자체가 의미가 없는데,
 *    저장되면 `scopes` 가 채워진 `top` 계정이 생겨 다음에 역할을 내릴 때 그 값이
 *    되살아난다.
 */
export async function setScopes(v: { adminId: number; scopes: ScopeId[] }): Promise<void> {
  if (USE_MOCK) {
    await mockDelay()
    const admin = findAdmin(v.adminId)
    if (!admin) throw apiError('http', `관리자 #${v.adminId} 을(를) 찾을 수 없습니다.`, 404)
    if (admin.role === 'top') throw apiError('http', '최고 관리자는 전체 모듈에 접근합니다.', 409)
    // 화면이 `ASSIGNABLE_SCOPES` 만 그리지만 파사드는 그 화면만 부르는 게 아니다 —
    // 목록에 없는 스코프가 저장되면 아무도 못 보는 권한이 계정에 붙는다.
    setAdminScopes(v.adminId, assignableOnly(v.scopes))
    return
  }

  throw new Error('관리자 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSetScopes() {
  return useMutation({
    mutationFn: setScopes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.admins.all }),
  })
}

/** 아이디가 이미 쓰이고 있는가. 초대 화면이 입력 도중에 부른다 */
export const isEmailTaken = (email: string, taken: string[]): boolean =>
  taken.some((t) => sameEmail(t, email))
