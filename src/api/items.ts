/**
 * 아이템 데이터 파사드.
 *
 * 화면은 이 파일만 본다. 지금은 목을 감싸고 있고, 백엔드 스펙이 나오면
 * `USE_MOCK` 분기 안쪽만 `http.get(...)` 으로 바꾼다.
 *
 * ⚠️ **쪽을 여기서 자른다.** 화면이 `slice` 하면 안 된다 — 실서버는 한 쪽만
 *    내려주므로, 지금부터 `{ items, total }` 로 받아야 나중에 화면을 안 건드린다.
 *    `total` 은 지금 쪽의 개수가 아니라 **필터에 걸린 전체**다 (페이지 바가 그걸 쓴다).
 */
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { filterItems, type Item, type ItemAsset, type ItemFilter, type ItemInput, type Slot } from '@/domain/item'
import type { LedgerEntry } from '@/domain/ledger'

import { ASSETS } from '@/mocks/assetTable'
import { allItems, upsertItem } from '@/mocks/items'
import { ledgerOf, trendOf } from '@/mocks/ledger'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export type ItemsQuery = ItemFilter & {
  /** 1부터 센다 */
  page: number
  perPage: number
}

export type ItemsResult = {
  /** 요청한 쪽의 항목만 */
  items: Item[]
  /** 필터에 걸린 전체 건수 */
  total: number
}

export async function getItems({ page, perPage, ...filter }: ItemsQuery): Promise<ItemsResult> {
  if (USE_MOCK) {
    await mockDelay()
    // 규칙은 도메인에서 가져다 쓴다. 목 생성기에 두면 서버로 갈아탈 때 같이 사라진다.
    const matched = filterItems(allItems(), filter)
    const from = (page - 1) * perPage
    return { items: matched.slice(from, from + perPage), total: matched.length }
  }

  // TODO(백엔드 스펙 확정 후): http.get<ItemsDto>('/admin/items', { params }) → 도메인 타입으로 매핑
  throw new Error('아이템 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/**
 * ⚠️ **`placeholderData` 를 빼지 말 것.** 쪽을 넘길 때마다 결과가 `undefined` 가 되어
 *    표가 스켈레톤으로 깜빡인다. 이전 쪽을 그대로 두고 새 쪽으로 갈아 끼운다.
 */
export function useItems(query: ItemsQuery) {
  return useQuery({
    queryKey: qk.items.list(query),
    queryFn: () => getItems(query),
    placeholderData: keepPreviousData,
  })
}

/**
 * 상세 화면이 한 번에 받는 것.
 *
 * 표·차트·이력을 따로 부르지 않는다 — 한 화면이 한 번만 기다리면 되고,
 * 서버도 아이템 하나를 조회하는 김에 딸린 것을 같이 주는 편이 자연스럽다.
 */
export type ItemDetail = {
  item: Item
  /** 보유 추이 8주치(%). 화면은 그대로 차트에 넘긴다 */
  trend: number[]
  ledger: LedgerEntry[]
  /**
   * 디자인 원본이 계산해 쓰던 지표 둘.
   *
   * `Item` 에 없는 값이라 도메인이 아니라 여기서 만든다. 지금은 백엔드가 없는
   * 퍼블리싱 단계라 원본의 식을 그대로 옮겨 둔다.
   * TODO(백엔드가 이 둘을 정의하면): 서버 값으로 갈아끼운다
   */
  favorites: number
  returned: number
}

export async function getItem(itemId: string): Promise<ItemDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const item = allItems().find((it) => String(it.key) === itemId)
    // 없는 id 로 들어올 수 있다 — 북마크·잘못 친 주소. 화면이 오류로 다룰 수 있게 던진다.
    if (!item) throw apiError('http', `아이템 #${itemId} 을(를) 찾을 수 없습니다.`, 404)

    return {
      item,
      trend: trendOf(item.key, item.own),
      ledger: ledgerOf(item.key),
      favorites: Math.round(item.sold * 0.34),
      returned: 0,
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<ItemDetailDto>(`/admin/items/${itemId}`) → 도메인 타입으로 매핑
  throw new Error('아이템 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useItem(itemId: string) {
  return useQuery({ queryKey: qk.items.detail(itemId), queryFn: () => getItem(itemId) })
}

/** 등록이면 `itemId` 가 없다. 수정이면 있다. */
export type SaveItemVars = { itemId?: string; input: ItemInput }

/**
 * 등록·수정을 한 함수로 둔다.
 *
 * 화면은 "저장한다" 만 알면 되고 `POST`/`PATCH` 분기는 파사드 안쪽이다 —
 * 등록 화면과 수정 화면이 같은 컴포넌트라 부르는 쪽이 갈라질 이유가 없다.
 */
export async function saveItem({ itemId, input }: SaveItemVars): Promise<Item> {
  if (USE_MOCK) {
    await mockDelay()
    return upsertItem(input, itemId == null ? undefined : Number(itemId))
  }

  // TODO(백엔드 스펙 확정 후): itemId 유무로 POST /admin/items · PATCH /admin/items/{id}
  throw new Error('아이템 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/**
 * ⚠️ **재시도하지 않는다** — `queryClient` 의 기본값이 그렇다. 등록을 다시 쏘면
 *    같은 아이템이 둘 생기는데, 실패를 한 번 더 시도하는 것보다 그게 훨씬 나쁘다.
 */
export function useSaveItem() {
  return useMutation({
    mutationFn: saveItem,
    // 목록·상세가 모두 바뀔 수 있다. 접두사로 한 번에 턴다.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.items.all }),
  })
}

/**
 * 그 슬롯에 붙일 수 있는 에셋들.
 *
 * 화면이 `mocks/` 를 직접 못 보므로(docs/ARCHITECTURE.md §4.3) 여기를 거친다. 지금은 빌드 때 들어온
 * SVG 묶음이지만, 업로드가 생기면 이 함수 안쪽만 서버 호출로 바뀐다.
 */
export async function getAssets(slot: Slot): Promise<ItemAsset[]> {
  if (USE_MOCK) {
    // 정적 목록이라 기다릴 것이 없다 — `mockDelay` 를 넣으면 고르기 창만 늦게 뜬다.
    return ASSETS[slot]
  }

  // TODO(에셋 카탈로그 API 가 생기면): http.get<ItemAsset[]>('/admin/assets', { params: { slot } })
  throw new Error('에셋 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useAssets(slot: Slot) {
  return useQuery({ queryKey: qk.items.assets(slot), queryFn: () => getAssets(slot) })
}
