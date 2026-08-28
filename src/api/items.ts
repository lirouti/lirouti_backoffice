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
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { filterItems, type Item, type ItemFilter } from '@/domain/item'

import { allItems } from '@/mocks/items'

import { mockDelay, qk, USE_MOCK } from './core'

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
