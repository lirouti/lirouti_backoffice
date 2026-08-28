/**
 * 앱 부팅.
 *
 * 여기서 **아래 층이 위 층을 부를 수 있게 하는 배선**을 한다. `api` 는 라우터를,
 * `layouts` 는 `api` 를 몰라야 해서(docs/ARCHITECTURE.md §4.3) 각자 핸들러를 주입받는다 — 그 주입을
 * 할 수 있는 유일한 자리가 조립 지점인 여기다.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'

import { logout } from './api/auth'
import { queryClient, setUnauthorizedHandler } from './api/core'

import './index.css'
import { router } from './app/router'
import { LOGIN_PATH } from './domain/screens'
import { setSignOutHandler, useViewerStore } from './stores/viewerStore'

// 세션이 끊기면 로그인으로 보낸다.
// `api` 층은 라우터를 몰라야 해서, 여기서 주입한다.
setSignOutHandler(logout)

setUnauthorizedHandler(() => {
  queryClient.clear()
  // `signOut()` 이 아니라 `clear()` 다 — 서버가 방금 401 로 "세션 없음"을 알렸는데
  // 로그아웃을 다시 요청할 이유가 없다. 그 요청이 또 401 이면 여기로 되돌아온다.
  useViewerStore.getState().clear()
  void router.navigate(LOGIN_PATH)
})

const root = document.getElementById('root')
if (!root) throw new Error('#root 를 찾을 수 없습니다')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
