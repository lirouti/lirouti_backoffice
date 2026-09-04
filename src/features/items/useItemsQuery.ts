/**
 * 아이템 목록 화면의 상태를 주소에서 읽고 주소로 쓴다.
 *
 * 변환 규칙은 `./query` 의 순수 함수들이 갖는다. 여기는 `useSearchParams` 배선과
 * **히스토리 정책**만 담는다.
 */
import { useCallback } from 'react'

import { useSearchParams } from 'react-router'

import { parseItemsQuery, patchQuery, toSearchParams, type ItemsScreenQuery } from './query'

/**
 * `[지금 상태, 바꾸는 함수]`.
 *
 * ⚠️ **쪽 이동만 히스토리에 쌓는다.** 쪽을 넘긴 뒤 뒤로가기가 이전 쪽으로 가야 하지만,
 *    검색어는 한 글자마다 항목이 쌓여 **뒤로가기 열 번을 눌러야 목록을 벗어나게** 된다.
 *
 * 검색어는 매 타건에 오지 않는다 — `useSearchDraft` 가 조용해질 때까지 모은다.
 */
export function useItemsQuery(): [
  ItemsScreenQuery,
  (patch: Partial<ItemsScreenQuery>) => void,
] {
  const [params, setParams] = useSearchParams()

  const query = parseItemsQuery(params)

  const update = useCallback(
    (patch: Partial<ItemsScreenQuery>) => {
      const onlyPage = Object.keys(patch).every((k) => k === 'page')
      setParams((prev) => toSearchParams(patchQuery(parseItemsQuery(prev), patch)), {
        replace: !onlyPage,
      })
    },
    [setParams],
  )

  return [query, update]
}
