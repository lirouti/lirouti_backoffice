/**
 * 운영 파사드 — 공지 · 이벤트 · 지급/회수.
 *
 * ⚠️ **지급·회수는 되돌릴 수 없다.** 화면이 확인 창을 띄우고, 여기서도 검증을
 *    한 번 더 한다 — 잠근 버튼은 검증이 아니다 (docs/ARCHITECTURE.md §22.2.3).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { isHexColor } from '@/shared/lib/color'

import type { Item } from '@/domain/item'
import {
  activeUserCount,
  checkGrantItem,
  checkTargets,
  isNoticeCategory,
  periodStatusOf,
  sortEvents,
  summarizeGrants,
  summarizeNotices,
  validateGrant,
  validateEvent,
  validateNotice,
  type EventInput,
  type GrantInput,
  type GrantLog,
  type GrantSummary,
  type Notice,
  type NoticeInput,
  type NoticeSummary,
  type OpsEvent,
  type PeriodStatus,
} from '@/domain/ops'
import { parseUserIds } from '@/domain/user'

import { allItems } from '@/mocks/items'
import { addEvent, addGrantLog, addNotice, allEvents, allGrantLogs, allNotices } from '@/mocks/ops'
import { allUsers } from '@/mocks/users'

import { mockDelay, qk, queryClient, today, USE_MOCK } from './core'
import { apiError } from './error'

/**
 * 공지 + 그 시점의 상태.
 *
 * **상태는 화면이 아니라 여기서 낸다** — 화면이 `today()` 를 부르면 열마다 다른 날을
 * 쓸 수 있고, 자정을 넘기며 한 표 안에서 값이 갈린다 (docs/ARCHITECTURE.md §25.1).
 */
export type NoticeEntry = { notice: Notice; status: PeriodStatus }

export type NoticesResult = {
  notices: NoticeEntry[]
  summary: NoticeSummary
}

export async function getNotices(): Promise<NoticesResult> {
  if (USE_MOCK) {
    await mockDelay()
    const list = allNotices()
    const now = today()
    return {
      notices: list.map((notice) => ({
        notice,
        status: periodStatusOf(notice.startAt, notice.endAt, now),
      })),
      summary: summarizeNotices(list, now),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<NoticeDto[]>('/admin/ops/notices')
  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useNotices() {
  return useQuery({ queryKey: qk.ops.notices(), queryFn: getNotices })
}

/** 공지 작성. `key`·조회수는 서버가 정한다 */
export async function saveNotice(input: NoticeInput): Promise<Notice> {
  if (USE_MOCK) {
    await mockDelay()
    const errors = validateNotice(input)
    const first = Object.values(errors)[0]
    if (first) throw apiError('http', first, 400)
    if (!isNoticeCategory(input.category)) throw apiError('http', '분류를 고르세요.', 400)
    return addNotice({ ...input, category: input.category })
  }

  // TODO(백엔드 스펙 확정 후): http.post<NoticeDto>('/admin/ops/notices', input)
  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveNotice() {
  return useMutation({
    mutationFn: saveNotice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.ops.notices() }),
  })
}

/** 이벤트 + 보상 아이템 + 그 시점의 상태. **아이템은 화면이 아니라 여기서 붙인다** */
export type EventEntry = { event: OpsEvent; status: PeriodStatus; reward?: Item }

export async function getEvents(): Promise<EventEntry[]> {
  if (USE_MOCK) {
    await mockDelay()
    const items = allItems()
    const now = today()
    return sortEvents(allEvents(), now).map((event) => ({
      event,
      status: periodStatusOf(event.startAt, event.endAt, now),
      reward: items.find((it) => it.key === event.rewardItemKey),
    }))
  }

  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useEvents() {
  return useQuery({ queryKey: qk.ops.events(), queryFn: getEvents })
}

/** 이벤트 보상 선택지. 목록 카드와 같은 에셋을 미리 본다 */
export type EventItemOption = Pick<Item, 'key' | 'name' | 'assetId'>

export type EventFormData = {
  itemOptions: EventItemOption[]
}

export async function getEventFormData(): Promise<EventFormData> {
  if (USE_MOCK) {
    await mockDelay()
    return {
      itemOptions: allItems()
        .map(({ key, name, assetId }) => ({ key, name, assetId }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<EventFormDto>('/admin/ops/events/form')
  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useEventFormData() {
  return useQuery({ queryKey: qk.ops.eventForm(), queryFn: getEventFormData })
}

/** 이벤트 생성. `key`·참여자 수는 서버가 정한다 */
export async function saveEvent(input: EventInput): Promise<OpsEvent> {
  if (USE_MOCK) {
    await mockDelay()
    const errors = validateEvent(input)
    const first = Object.values(errors)[0]
    if (first) throw apiError('http', first, 400)
    if (!isHexColor(input.accent)) throw apiError('http', '#RRGGBB 형식의 색을 입력하세요.', 400)
    if (input.rewardItemKey === null) throw apiError('http', '보상 아이템을 고르세요.', 400)
    if (!allItems().some((item) => item.key === input.rewardItemKey)) {
      throw apiError('http', '없는 아이템입니다. 목록에서 다시 고르세요.', 404)
    }
    return addEvent({ ...input, rewardItemKey: input.rewardItemKey })
  }

  // TODO(백엔드 스펙 확정 후): http.post<OpsEvent>('/admin/ops/events', input)
  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveEvent() {
  return useMutation({
    mutationFn: saveEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.ops.events() }),
  })
}

/**
 * 지급할 수 있는 아이템. **이름만 준다** — 고르는 데 필요한 것이 그것뿐이다.
 *
 * ⚠️ **`useItems` 를 쓰지 않는다.** 그쪽은 쪽을 잘라 주므로 첫 쪽에 없는 아이템은
 *    아예 고를 수 없다.
 */
export type GrantItemOption = { key: number; name: string }

export type GrantsResult = {
  logs: GrantLog[]
  summary: GrantSummary
  /** 「전체」 를 골랐을 때 몇 명인가. 탈퇴는 뺀 수 */
  allUserCount: number
  itemOptions: GrantItemOption[]
}

export async function getGrants(): Promise<GrantsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const logs = allGrantLogs()
    return {
      logs,
      summary: summarizeGrants(logs),
      allUserCount: activeUserCount(allUsers()),
      itemOptions: allItems()
        .map(({ key, name }) => ({ key, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    }
  }

  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useGrants() {
  return useQuery({ queryKey: qk.ops.grants(), queryFn: getGrants })
}

export type TargetCheckResult = {
  /** 실제로 줄 수 있는 회원 수 */
  count: number
  /** 회원 목록에 없는 id. **오타가 여기서 잡힌다** */
  missing: string[]
}

/**
 * 「대상 확인」 — 실행 전에 몇 명인지 센다.
 *
 * **오타 난 id 를 조용히 넘기지 않는다.** 24,180명에게 나가는 처리라 실행 전에
 * 대상 수를 보여 주는 것이 이 화면의 안전장치다 (§25.3).
 */
export async function checkGrantTargets(input: GrantInput): Promise<TargetCheckResult> {
  if (USE_MOCK) {
    await mockDelay()
    const users = allUsers()
    if (input.target === '전체') return { count: activeUserCount(users), missing: [] }
    const { found, missing } = checkTargets(parseUserIds(input.who), users)
    return { count: found.length, missing }
  }

  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useCheckTargets() {
  return useMutation({ mutationFn: checkGrantTargets })
}

/**
 * 지급·회수 실행.
 *
 * ⚠️ **줄 곳이 없으면 실행하지 않는다.** 대상이 0명인데 성공으로 끝내면 이력에는
 *    남는데 아무에게도 안 간 처리가 생긴다.
 */
export type RunGrantVars = {
  input: GrantInput
  /**
   * 처리자 이름. **목에서만 쓴다** — 실서버는 세션에서 가져간다.
   *
   * ⚠️ **클라이언트가 보내면 아무 이름이나 적을 수 있다.** 감사 이력의 「처리자」 는
   *    보낸 값이 아니라 **누가 로그인했는지**여야 한다 (docs/ARCHITECTURE.md §25.3).
   */
  by: string
}

export async function runGrant({ input, by }: RunGrantVars): Promise<GrantLog> {
  if (USE_MOCK) {
    await mockDelay()

    const errors = validateGrant(input)
    const first = Object.values(errors)[0]
    if (first) throw apiError('http', first, 400)

    // 폼을 열어 둔 사이에 아이템이 지워졌을 수 있다. 없는 것을 「성공」 으로 기록하면
    // 이력에는 남는데 아무도 못 받은 처리가 된다 (§25.3.1).
    const missingItem = checkGrantItem(input, allItems().map((it) => it.key))
    if (missingItem) throw apiError('http', missingItem, 404)

    const { count, missing } = await checkGrantTargets(input)
    if (count === 0) throw apiError('http', '대상 회원이 없습니다.', 400)
    // 일부만 못 찾은 것은 막지 않는다 — 화면이 확인 창에서 이미 보여 줬다.
    const label =
      input.target === '전체'
        ? `전체 유저 ${count}명`
        : parseUserIds(input.who).filter((id) => !missing.includes(id)).join(', ')

    return addGrantLog(input, label, by)
  }

  throw new Error('운영 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useRunGrant() {
  return useMutation({
    mutationFn: runGrant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.ops.grants() }),
  })
}
