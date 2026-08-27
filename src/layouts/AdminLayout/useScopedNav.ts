import { useMemo } from 'react'

import { useLocation } from 'react-router'

import { firstScreen, visibleNav } from '@/domain/access'
import type { NavGroup } from '@/domain/nav'
import { matchScreen, type ScreenId } from '@/domain/screens'

import { useViewer } from '@/stores/viewerStore'

/**
 * 이 파일은 **React 결합부만** 담당한다.
 * 권한 필터·첫 화면 계산 같은 규칙은 `domain/access.ts` 에 있다.
 */

/** 현재 URL 에 해당하는 화면 id. 못 찾으면 null. */
export function useCurrentScreen(): ScreenId | null {
  const { pathname } = useLocation()
  return useMemo(() => matchScreen(pathname), [pathname])
}

/** 뷰어 권한으로 걸러낸 내비 트리 */
export function useScopedNav(): NavGroup[] {
  const viewer = useViewer()
  return useMemo(() => visibleNav(viewer), [viewer])
}

/** 권한 밖 URL 진입 시 보낼 화면 */
export function useFirstScreen(): ScreenId {
  const viewer = useViewer()
  return useMemo(() => firstScreen(viewer), [viewer])
}
