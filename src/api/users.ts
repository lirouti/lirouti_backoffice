/**
 * 회원 데이터 파사드.
 *
 * 12명뿐이라 **쪽을 자르지 않는다** — 원본에도 페이지 바가 없다. 실서버로 바뀌면
 * 아이템 목록처럼 `{ users, total }` 로 감싸고 쪽을 여기서 자른다.
 * TODO(회원 수가 늘면): `ItemsQuery` 처럼 page·perPage 를 받는다
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  filterUsers,
  nextBanStatus,
  summarize,
  type CoinLedgerRow,
  type OrderRow,
  type User,
  type UserFilter,
  type UserSummary,
} from '@/domain/user'

import { coinLedgerOf, orderRowsOf } from '@/mocks/userHistory'
import { allUsers, setUserStatus } from '@/mocks/users'

import { mockDelay, qk, queryClient, today, USE_MOCK } from './core'
import { apiError } from './error'

export type UsersResult = { users: User[]; summary: UserSummary }

export async function getUsers(filter: UserFilter): Promise<UsersResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allUsers()
    // ⚠️ 지표는 **거르기 전 전체**로 낸다. 필터를 걸 때마다 「전체 회원」 이 바뀌면
    //    그건 필터 결과지 전체가 아니다.
    return { users: filterUsers(all, filter), summary: summarize(all, today()) }
  }

  // TODO(백엔드 스펙 확정 후): http.get<UsersDto>('/admin/users', { params: filter })
  throw new Error('회원 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useUsers(filter: UserFilter) {
  return useQuery({ queryKey: qk.users.list(filter), queryFn: () => getUsers(filter) })
}

export type UserDetail = {
  user: User
  ledger: CoinLedgerRow[]
  orders: OrderRow[]
}

export async function getUser(userId: string): Promise<UserDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const user = allUsers().find((u) => String(u.key) === userId)
    // 없는 id 로 들어올 수 있다 — 북마크·잘못 친 주소.
    if (!user) throw apiError('http', `회원 #${userId} 을(를) 찾을 수 없습니다.`, 404)
    return {
      user,
      ledger: coinLedgerOf(user.key, user.wallet.gem, user.wallet.topaz),
      orders: orderRowsOf(user.key, user.paid),
    }
  }

  throw new Error('회원 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/** ⚠️ 빈 id 면 부르지 않는다 — 훅은 조기 반환보다 먼저 돈다 (docs/ARCHITECTURE.md §20.6) */
export function useUser(userId: string) {
  return useQuery({
    queryKey: qk.users.detail(userId),
    queryFn: () => getUser(userId),
    enabled: userId !== '',
  })
}

export async function banUser(v: { userId: string; ban: boolean }): Promise<User> {
  if (USE_MOCK) {
    await mockDelay()
    const { user } = await getUser(v.userId)
    return setUserStatus(user.key, nextBanStatus(user, v.ban))
  }

  throw new Error('회원 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useBanUser() {
  return useMutation({
    mutationFn: banUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.users.all }),
  })
}
