/**
 * 같은 탭 안에서 화면을 옮길 때 **저장 안 된 내용을 확인 없이 버리지 않게** 막는다.
 *
 * `useUnsavedGuard`(stores/dirtyStore)는 "더럽다"를 기록만 하고 이동을 막지 않는다.
 * `beforeunload` 는 브라우저를 닫을 때만 뜬다. 그 사이에 구멍이 하나 있다 —
 * `/items/3` 에서 `/items/7` 로 가면 **같은 탭**이라 경로가 갈아 끼워지고,
 * `AdminLayout` 이 `/items/3` 의 keep-alive 캐시를 파기한다. 아무 말 없이 사라진다.
 */
import { useBlocker } from 'react-router'

import { matchScreen, sectionOf } from '@/domain/screens'

import { useDirtyStore } from '@/stores/dirtyStore'

/**
 * 막아야 할 이동인가.
 *
 * **다른 서브 메뉴로 가는 것은 막지 않는다.** 그때는 이 탭이 경로를 그대로 들고 있어
 * 화면이 살아 있다 — 확인을 물으면 아무것도 잃지 않는 이동에 대해 묻는 셈이다.
 * 같은 서브 메뉴 안에서 움직일 때만 앞의 화면이 파기된다.
 */
export function willDiscard(from: string, to: string, isDirty: boolean): boolean {
  if (!isDirty || from === to) return false

  const a = matchScreen(from)
  const b = matchScreen(to)
  return a != null && b != null && sectionOf(a) === sectionOf(b)
}

/**
 * 막힌 이동. `state === 'blocked'` 면 확인 창을 띄우고 `proceed`/`reset` 을 잇는다.
 *
 * ⚠️ **스토어를 구독하지 않고 판정할 때 직접 읽는다.** 구독하면 그 값이 클로저에
 *    갇히는데, 화면이 **저장 직후 같은 틱에** 표시를 지우고 이동하면 리렌더가 아직
 *    안 일어나 옛 값으로 막는다 — 방금 저장한 사람에게 "저장하지 않고 이동할까요?"
 *    를 묻게 된다. 실제로 그렇게 막혔다. 가드는 이동할 때만 도니 구독할 이유도 없다.
 */
export function useUnsavedNavGuard() {
  return useBlocker(({ currentLocation, nextLocation }) => {
    const { dirty } = useDirtyStore.getState()
    return willDiscard(
      currentLocation.pathname,
      nextLocation.pathname,
      !!dirty[currentLocation.pathname],
    )
  })
}
