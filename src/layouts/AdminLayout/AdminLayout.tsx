import { Suspense, useEffect } from 'react'

import { KeepAlive, useKeepAliveRef } from 'keepalive-for-react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { css } from 'styled-system/css'

import { canAccess } from '@/domain/access'
import { SCREENS } from '@/domain/screens'

import { useBeforeUnloadWhenDirty } from '@/stores/dirtyStore'
import { MAX_TABS, useTabsStore } from '@/stores/tabsStore'
import { useViewer } from '@/stores/viewerStore'

import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { Topbar } from './Topbar'
import { useCurrentScreen, useFirstScreen } from './useScopedNav'
import { ViewerBanner } from './ViewerBanner'

export function AdminLayout() {
  const current = useCurrentScreen()
  const { pathname } = useLocation()
  const viewer = useViewer()
  const openTab = useTabsStore((s) => s.open)
  const tabs = useTabsStore((s) => s.tabs)
  const fallback = useFirstScreen()
  const aliveRef = useKeepAliveRef()

  // 저장 안 된 변경이 있으면 새로고침·닫기를 막는다.
  // (문구는 브라우저가 정한다 — 우리가 못 바꾼다. stores/dirtyStore.ts 참고)
  useBeforeUnloadWhenDirty()

  // 경로가 바뀔 때마다 탭 스택에 밀어 넣는다.
  // 탭 키가 경로라서 `/items/3` 과 `/items/7` 이 각각 열린다.
  useEffect(() => {
    if (current) openTab(pathname)
  }, [current, pathname, openTab])

  // 탭을 닫으면 살아 있던 화면도 버린다.
  // KeepAlive 는 탭 스토어를 모르므로, 연결해 주지 않으면 닫은 탭이 메모리에 계속 남는다.
  useEffect(() => {
    const alive = aliveRef.current
    if (!alive) return
    const open = new Set(tabs.map((t) => t.path))
    const orphans = alive
      .getCacheNodes()
      .map((n) => n.cacheKey)
      .filter((k) => !open.has(k))
    if (orphans.length) void alive.destroy(orphans)
  }, [tabs, aliveRef])

  // 권한 밖 URL 로 직접 들어온 경우 접근 가능한 첫 화면으로 보낸다.
  if (current && !canAccess(viewer, SCREENS[current].scope)) {
    return <Navigate to={SCREENS[fallback].path} replace />
  }

  return (
    <div className={css({ display: 'flex', minHeight: '100vh' })}>
      <Sidebar />
      <div className={css({ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column' })}>
        <div
          className={css({
            position: 'sticky',
            top: '0',
            zIndex: '20',
            bg: 'band',
            backdropFilter: 'blur(6px)',
          })}
        >
          <Topbar current={current} />
          <TabBar />
          <ViewerBanner />
        </div>

        <main className={css({ flex: '1', p: '22px clamp(14px, 2vw, 28px) 64px' })}>
          <div className={css({ maxWidth: '1700px' })}>
            {/*
              열린 탭의 화면을 언마운트하지 않고 살려둔다.
              작성·수정이 대부분인 어드민이라 탭을 옮겨도 입력·스크롤이 남아야 한다.

              ⚠️ 살아 있다는 건 `useEffect` cleanup 이 안 돈다는 뜻이다.
                 폴링·구독은 `useEffectOnActive`(keepalive-for-react)로 감싸
                 비활성 탭에서 멈추게 할 것.
              ⚠️ 메모리에만 있어서 새로고침하면 사라진다.
                 폼 초안은 별도로 저장해야 한다.
            */}
            <KeepAlive aliveRef={aliveRef} activeCacheKey={pathname} max={MAX_TABS}>
              <Suspense fallback={<ScreenSkeleton />}>
                <Outlet />
              </Suspense>
            </KeepAlive>
          </div>
        </main>
      </div>
    </div>
  )
}

function ScreenSkeleton() {
  return (
    <div className={css({ textStyle: 'body', color: 'faint', p: '40px 4px' })}>불러오는 중…</div>
  )
}
