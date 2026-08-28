/**
 * 어드민 셸 — `<Outlet/>` 바깥에서 화면이 바뀌어도 남는 틀.
 *
 * ⚠️ **여기가 keep-alive 를 탭 스토어에 연결하는 자리다.** `KeepAlive` 는 탭을
 *    모르므로, 닫힌 탭의 캐시를 파기하는 배선을 지우면 메모리에 계속 남는다.
 */
import { Suspense, useEffect } from 'react'

import { KeepAlive, useKeepAliveRef } from 'keepalive-for-react'
import { Navigate, useLocation, useOutlet } from 'react-router'

import { css } from 'styled-system/css'

import { Dialog } from '@/shared/ui/Dialog'

import { canAccess } from '@/domain/access'
import { SCREENS } from '@/domain/screens'

import { useBeforeUnloadWhenDirty } from '@/stores/dirtyStore'
import { livePaths, MAX_TABS, useTabsStore } from '@/stores/tabsStore'
import { useViewer } from '@/stores/viewerStore'

import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { Topbar } from './Topbar'
import { useCurrentScreen, useFirstScreen } from './useScopedNav'
import { useUnsavedNavGuard } from './useUnsavedNavGuard'
import { ViewerBanner } from './ViewerBanner'

export function AdminLayout() {
  const current = useCurrentScreen()
  const { pathname, search } = useLocation()
  const viewer = useViewer()
  const openTab = useTabsStore((s) => s.open)
  const tabs = useTabsStore((s) => s.tabs)
  const fallback = useFirstScreen()
  const aliveRef = useKeepAliveRef()
  // ⚠️ **`<Outlet/>` 이 아니라 `useOutlet()` 이다.** `<Outlet/>` 은 그릴 때마다 라우터
  //    컨텍스트를 다시 읽어 **캐시해 둔 화면까지 "지금 경로"를 그린다** — 캐시가
  //    무의미해지고 탭을 옮기면 상태가 사라진다. 여기는 지금 라우트의 **엘리먼트**를
  //    받아 그대로 캐시에 넣어야 한다.
  const outlet = useOutlet()
  // 같은 탭 안에서 화면을 옮기면 앞의 화면이 파기된다 — 저장 안 된 게 있으면 먼저 묻는다.
  const blocker = useUnsavedNavGuard()

  // 저장 안 된 변경이 있으면 새로고침·닫기를 막는다.
  // (문구는 브라우저가 정한다 — 우리가 못 바꾼다. stores/dirtyStore.ts 참고)
  useBeforeUnloadWhenDirty()

  // 이 경로를 열 권한이 있는가. 아래 조기 반환과 **같은 판정**을 effect 에서도 쓴다.
  const allowed = current != null && canAccess(viewer, SCREENS[current].scope)

  // 경로가 바뀔 때마다 탭 스택에 밀어 넣는다.
  // **탭 키는 서브 메뉴다.** `/items/3` 은 「아이템 목록」 탭의 경로를 바꿀 뿐 새 탭을
  // 만들지 않는다 (docs/ARCHITECTURE.md §6.3).
  //
  // ⚠️ **권한 밖 경로는 넣지 않는다.** effect 는 렌더 커밋 뒤에 돌기 때문에
  //    아래에서 `<Navigate>` 를 돌려준 렌더에서도 실행된다. 거르지 않으면 열지도
  //    못한 경로가 persist 에 남아 MAX_TABS 자리를 잡아먹고, 나중에 스코프가
  //    늘면 열어본 적 없는 탭이 튀어나온다.
  useEffect(() => {
    // **쿼리까지 넘긴다.** 목록 필터가 주소에 있어서(§18.1) 떨어뜨리면 탭을 옮겼다
    // 돌아올 때 필터가 풀린다. 화면 매칭과 캐시 키는 경로만 본다.
    if (allowed) openTab(pathname + search)
  }, [allowed, pathname, search, openTab])

  // 탭을 닫으면 살아 있던 화면도 버린다.
  // KeepAlive 는 탭 스토어를 모르므로, 연결해 주지 않으면 닫은 탭이 메모리에 계속 남는다.
  useEffect(() => {
    const alive = aliveRef.current
    if (!alive) return
    // 탭이 들고 있는 화면들. 파생 화면에 있어도 서브 메뉴 화면을 함께 살려 둔다 —
    // 상세를 보다 목록으로 돌아왔을 때 필터가 그대로여야 "전환됐다"로 읽힌다.
    //
    // ⚠️ **지금 보고 있는 화면은 무슨 일이 있어도 넣는다.** 이 effect 는 `tabs` 로만
    //    도는데 탭을 밀어 넣는 건 **다른 effect** 라, 새 경로로 막 들어온 순간에는
    //    아직 `tabs` 에 없을 수 있다. 그때 버리면 방금 그린 화면을 도로 부순다.
    //    (지금 순서에서는 실제로 일어나지 않지만 — 재현되지 않았다 — 라이브러리
    //    내부의 등록 시점에 기대는 것이라 계약으로 못박아 둔다.)
    const open = new Set([pathname, ...tabs.flatMap(livePaths)])
    const orphans = alive
      .getCacheNodes()
      .map((n) => n.cacheKey)
      .filter((k) => !open.has(k))
    if (orphans.length) void alive.destroy(orphans)
  }, [tabs, pathname, aliveRef])

  // 권한 밖 URL 로 직접 들어온 경우 접근 가능한 첫 화면으로 보낸다.
  if (current && !allowed) {
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
            {/*
              탭당 최대 둘(서브 메뉴 + 파생 화면)이라 상한도 두 배다.

              ⚠️ **열린 탭 수를 따라가야 한다.** `MAX_TABS` 는 깨끗한 탭에만 걸리는
                 상한이라(`evictionTarget`) 미저장 탭이 많으면 탭이 그 위로 늘어난다.
                 여기를 고정값으로 두면 **KeepAlive 가 대신 LRU 로 밀어내** 작성 중이던
                 화면이 사라진다 — 자동 축출을 막아 둔 뜻이 없어진다.
            */}
            <KeepAlive
              aliveRef={aliveRef}
              activeCacheKey={pathname}
              max={Math.max(MAX_TABS, tabs.length) * 2}
            >
              <Suspense fallback={<ScreenSkeleton />}>{outlet}</Suspense>
            </KeepAlive>
          </div>
        </main>
      </div>

      <Dialog
        open={blocker.state === 'blocked'}
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        tone="danger"
        title="저장하지 않고 이동할까요?"
        body="이 화면에 저장하지 않은 변경사항이 있습니다. 같은 탭에서 다른 화면으로 옮기면 사라집니다."
        confirmLabel="이동"
        cancelLabel="계속 편집"
      />
    </div>
  )
}

function ScreenSkeleton() {
  return (
    <div className={css({ textStyle: 'body', color: 'faint', p: '40px 4px' })}>불러오는 중…</div>
  )
}
