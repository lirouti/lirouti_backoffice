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
  useViewerStore.getState().signOut()
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
