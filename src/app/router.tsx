import { lazy } from 'react'

import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'

import { LOGIN_PATH, SCREENS, SCREEN_IDS, type ScreenId } from '@/domain/screens'

import { AdminLayout } from '@/layouts/AdminLayout'

// 로그인은 **eager** 로 둔다 — 미인증 사용자의 첫 화면이라
// lazy 로 만들면 왕복이 한 번 더 늘고 Suspense 폴백이 깜빡인다.
// 측정: lazy 138.02KB/4요청 → eager 135.92KB/2요청 (docs/ARCHITECTURE.md §9.2)
import LoginPage from '@/features/auth/LoginPage'
import { EmptyWorkspace } from '@/features/EmptyWorkspace'
import { PlaceholderPage } from '@/features/PlaceholderPage'

import { RequireAuth } from './RequireAuth'

/**
 * 구현된 화면만 등록한다. 나머지 43개는 자동으로 placeholder 로 떨어진다.
 *
 * **셸 안의 화면은 lazy** 다 — 44개를 한 번에 받을 이유가 없고, 라우트 경계가 곧
 * 청크 경계라 화면이 늘어도 분할 전략을 따로 고민할 필요가 없다.
 * 대시보드만 해도 recharts 를 안고 gzip 117KB 다 (첫 로드 252KB → 138KB).
 */
const IMPLEMENTED: Partial<Record<ScreenId, React.LazyExoticComponent<React.ComponentType>>> = {
  chal: lazy(() => import('@/features/challenges/ChallengesPage')),
  chaldet: lazy(() => import('@/features/challenges/ChallengeDetailPage')),
  chaledit: lazy(() => import('@/features/challenges/ChallengeFormPage')),
  chalnew: lazy(() => import('@/features/challenges/ChallengeFormPage')),
  admindet: lazy(() => import('@/features/admins/AdminDetailPage')),
  adminnew: lazy(() => import('@/features/admins/AdminInvitePage')),
  admins: lazy(() => import('@/features/admins/AdminsPage')),
  ai: lazy(() => import('@/features/moderation/AiReviewPage')),
  audit: lazy(() => import('@/features/audit/AuditPage')),
  dash: lazy(() => import('@/features/dashboard/DashboardPage')),
  item: lazy(() => import('@/features/items/ItemDetailPage')),
  // 등록·수정은 같은 화면이다 — `itemId` 유무로 갈린다.
  itemedit: lazy(() => import('@/features/items/ItemFormPage')),
  itemnew: lazy(() => import('@/features/items/ItemFormPage')),
  faq: lazy(() => import('@/features/support/FaqPage')),
  faqnew: lazy(() => import('@/features/support/FaqFormPage')),
  gems: lazy(() => import('@/features/shop/GemsPage')),
  items: lazy(() => import('@/features/items/ItemsPage')),
  levels: lazy(() => import('@/features/levels/LevelsPage')),
  mod: lazy(() => import('@/features/moderation/ReportsPage')),
  pay: lazy(() => import('@/features/payments/PaymentsPage')),
  paydet: lazy(() => import('@/features/payments/PaymentDetailPage')),
  push: lazy(() => import('@/features/push/PushListPage')),
  qna: lazy(() => import('@/features/support/InquiriesPage')),
  qnadet: lazy(() => import('@/features/support/InquiryDetailPage')),
  pushdet: lazy(() => import('@/features/push/PushDetailPage')),
  pushnew: lazy(() => import('@/features/push/PushFormPage')),
  rig: lazy(() => import('@/features/characters/RigPage')),
  species: lazy(() => import('@/features/characters/SpeciesPage')),
  speciesdet: lazy(() => import('@/features/characters/SpeciesDetailPage')),
  speciesnew: lazy(() => import('@/features/characters/SpeciesFormPage')),
  codedet: lazy(() => import('@/features/codes/CodeDetailPage')),
  coupondet: lazy(() => import('@/features/coupons/CouponDetailPage')),
  couponnew: lazy(() => import('@/features/coupons/CouponFormPage')),
  coupons: lazy(() => import('@/features/coupons/CouponsPage')),
  codenew: lazy(() => import('@/features/codes/CodeFormPage')),
  codes: lazy(() => import('@/features/codes/CodesPage')),
  event: lazy(() => import('@/features/ops/EventsPage')),
  grant: lazy(() => import('@/features/ops/GrantsPage')),
  notice: lazy(() => import('@/features/ops/NoticesPage')),
  security: lazy(() => import('@/features/security/SecurityPage')),
  shop: lazy(() => import('@/features/shop/ShopDisplayPage')),
  user: lazy(() => import('@/features/users/UserDetailPage')),
  users: lazy(() => import('@/features/users/UsersPage')),
  ui: lazy(() => import('@/features/uikit/UiKitPage')),
}

const screenRoutes: RouteObject[] = SCREEN_IDS.map((id) => {
  const Impl = IMPLEMENTED[id]
  return {
    // createBrowserRouter 의 자식 경로는 앞 슬래시 없이 준다.
    path: SCREENS[id].path.slice(1),
    element: Impl ? <Impl /> : <PlaceholderPage screen={id} />,
  }
})

export const router = createBrowserRouter([
  // 로그인은 셸 밖이다 — 사이드바도 탭도 없다.
  { path: LOGIN_PATH, element: <LoginPage /> },

  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      // `/` 는 **열린 탭이 없는 상태**다. 지표로 보내지 않는다 — 마지막 탭을 닫았을 때
      // 갈 곳이 필요하고, 어느 화면에도 매칭되지 않아야 사이드바·브레드크럼이 꺼진다.
      // 로그인 뒤에는 `firstScreen` 이 화면 경로로 보내므로 여기로 오지 않는다.
      { index: true, element: <EmptyWorkspace /> },
      ...screenRoutes,
    ],
  },

  { path: '*', element: <Navigate to={SCREENS.dash.path} replace /> },
])
