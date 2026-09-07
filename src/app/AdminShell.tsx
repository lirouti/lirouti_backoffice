/**
 * 셸 조립 — 데이터 계층과 셸을 잇는 자리.
 *
 * **`layouts` 는 `api` 를 부를 수 없다** (docs/ARCHITECTURE.md §4.3). 사이드바가 밀린
 * 신고 건수를 보여 주려면 누군가 대신 받아 와야 하는데, 그럴 수 있는 층은 `app` 뿐이다 —
 * 여기는 아무도 참조하지 않는 싱크라 어느 방향으로도 순환이 생기지 않는다.
 *
 * ⚠️ **화면이 열려 있지 않아도 돌아야 한다.** 「신고 처리」 탭을 열어야만 배지가 맞는다면
 *    그건 알림이 아니다 — 이미 보고 있는 사람에게만 알리는 셈이다 (§23.6).
 */
import { canAccess } from '@/domain/access'

import { useUrgentReportCount } from '@/api/moderationAlerts'

import { useViewer } from '@/stores/viewerStore'

import { AdminLayout } from '@/layouts/AdminLayout'

export function AdminShell() {
  const viewer = useViewer()
  // 권한이 없으면 아예 부르지 않는다 — 볼 수 없는 화면의 데이터를 받아 둘 이유가 없다.
  const urgent = useUrgentReportCount(canAccess(viewer, 'mod'))

  return <AdminLayout alerts={{ mod: urgent }} />
}
