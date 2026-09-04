import type { ReactNode } from 'react'

import { Navigate, useLocation } from 'react-router'

import { LOGIN_PATH } from '@/domain/screens'

import { useViewerStore } from '@/stores/viewerStore'

/**
 * 미인증이면 로그인으로 보낸다.
 *
 * 가려던 곳을 `state.from` 에 실어 보내, 로그인 후 그리로 돌려보낸다 —
 * 북마크해 둔 `/items/3` 을 열었다가 로그인하면 지표가 아니라 그 아이템으로 간다.
 *
 * ⚠️ **이건 UI 게이팅일 뿐 보안이 아니다.** 진짜 판단은 서버가 쿠키를 보고 한다.
 *    여기를 우회해도 API 가 401 을 준다 (`setUnauthorizedHandler` 참고).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const viewer = useViewerStore((s) => s.viewer)
  const location = useLocation()

  if (!viewer) {
    return (
      <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname + location.search }} />
    )
  }
  return <>{children}</>
}
