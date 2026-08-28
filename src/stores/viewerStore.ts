import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { TOP_VIEWER, type Viewer } from '@/domain/access'
import type { ScopeId } from '@/domain/screens'

/**
 * 지금 누가 보고 있는지. **`null` 이면 미인증**이다.
 *
 * 무엇을 볼 수 있는지의 규칙은 `domain/access.ts` 에 있다 — 스토어 구현이 바뀌어도
 * 권한 규칙은 그대로 남아야 하기 때문이다.
 *
 * ⚠️ 이건 **서버 세션의 캐시**다. 진실은 HttpOnly 쿠키에 있고 서버가 판단한다.
 *    여기 값이 있어도 서버가 401 을 주면 끊긴 것이다 (`setUnauthorizedHandler` 참고).
 */
type ViewerState = {
  viewer: Viewer | null
  signIn: (v: Viewer) => void
  signOut: () => Promise<void>
  /** 운영자 시점 미리보기 진입 (최고 관리자 전용) */
  preview: (name: string, scopes: ScopeId[]) => void
  /** 미리보기 종료 */
  exit: () => void
  /**
   * **서버를 부르지 않고** 로컬 세션만 끊는다.
   *
   * 401 을 받은 상황에서 쓴다 — 서버가 이미 "끊겼다"고 답했으므로 로그아웃을
   * 다시 요청할 이유가 없고, 그 요청이 또 401 이면 핸들러로 되돌아와 맴돈다.
   */
  clear: () => void
}

/**
 * 서버 세션을 끊는 함수. 앱 부팅 시 주입한다.
 *
 * `layouts/`(사이드바)가 `api/` 를 직접 부를 수 없어서 — 셸이 데이터 계층을 알면 안 된다 —
 * 401 핸들러와 같은 방식으로 뒤집는다.
 */
let serverSignOut: (() => Promise<void>) | null = null

export function setSignOutHandler(fn: () => Promise<void>): void {
  serverSignOut = fn
}

export const useViewerStore = create<ViewerState>()(
  persist(
    (set) => ({
      viewer: null,
      signIn: (v) => set({ viewer: v }),
      signOut: async () => {
        try {
          await serverSignOut?.()
        } finally {
          // 서버 호출이 실패해도 로컬 세션은 반드시 끊는다.
          set({ viewer: null })
        }
      },
      // 미리보기는 **보이는 범위만** 바꾼다 — 로그인한 사람은 그대로다.
      // 그래서 아이디(email)는 원래 뷰어의 것을 유지한다.
      preview: (name, scopes) =>
        set((s) => ({
          viewer: { role: 'operator', name, email: s.viewer?.email ?? TOP_VIEWER.email, scopes },
        })),
      exit: () => set({ viewer: TOP_VIEWER }),
      clear: () => set({ viewer: null }),
    }),
    { name: 'riruti_admin_view_v2' },
  ),
)

/**
 * 어드민 셸 안에서 쓰는 뷰어. **반드시 존재한다** — `RequireAuth` 를 통과했기 때문이다.
 *
 * 없는데 불렸다면 가드에 구멍이 났다는 뜻이라 조용히 넘기지 않고 터뜨린다.
 * 미인증 사용자에게 어드민 화면이 잠깐이라도 보이는 것보다 낫다.
 */
export function useViewer(): Viewer {
  const viewer = useViewerStore((s) => s.viewer)
  if (!viewer) throw new Error('인증 전에는 셸을 렌더하지 않습니다 — RequireAuth 를 확인하세요.')
  return viewer
}
