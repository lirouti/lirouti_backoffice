import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { matchScreen, paramOf, SCREENS, type ScreenId } from '@/domain/screens'

import { useDirtyStore } from './dirtyStore'

/**
 * 열린 탭 스택.
 *
 * **탭의 정체성은 URL 이다.** 화면 id 가 아니다 —
 * `/items/3` 과 `/items/7` 은 각각 별개 탭으로 열려야 두 아이템을 동시에 편집할 수 있다.
 * (원본 디자인은 상세를 부모 목록 탭으로 접었는데, 그 화면들은 상태가 살아있지 않았다.)
 */
export type OpenTab = {
  /** 탭 키 — 전체 경로. `/items/3` */
  path: string
  /** 어떤 화면인지. 권한 확인과 기본 라벨에 쓴다. */
  screen: ScreenId
  /**
   * 표시 라벨. 기본은 화면 이름 + 식별자.
   * 화면이 마운트되면 `setLabel` 로 사람이 읽을 이름("아이템 상세 · 후드")으로 덮을 수 있다.
   */
  label: string
}

/**
 * 탭 상한. 스트립이 스크롤 지옥이 되는 것도 있지만, keep-alive 로 화면이 살아 있으므로
 * **메모리 상한이기도 하다.** AdminLayout 의 `<KeepAlive max>` 와 같은 값이어야 한다.
 */
export const MAX_TABS = 12

function defaultLabel(screen: ScreenId, path: string): string {
  const base = SCREENS[screen].label
  const param = paramOf(path)
  return param ? `${base} #${param}` : base
}

type TabsState = {
  tabs: OpenTab[]
  /** 경로를 탭으로 연다. 이미 열려 있으면 아무것도 하지 않는다. */
  open: (path: string) => void
  close: (path: string) => void
  /** 화면이 데이터를 받은 뒤 사람이 읽을 라벨로 갈아끼운다. */
  setLabel: (path: string, label: string) => void
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set) => ({
      tabs: [],

      open: (path) =>
        set((s) => {
          if (s.tabs.some((t) => t.path === path)) return s
          const screen = matchScreen(path)
          if (!screen) return s

          const next = [...s.tabs, { path, screen, label: defaultLabel(screen, path) }]

          // 넘치면 밀어내는데, **저장 안 된 탭은 뒤로 미룬다.**
          // 밀려난 탭은 AdminLayout 이 keep-alive 캐시까지 파기하므로 작성 중이던
          // 내용이 확인 한 번 없이 사라진다 — 탭을 손으로 닫을 때는 `confirm` 으로
          // 막으면서 자동 축출로는 날아가면 `useUnsavedGuard` 가 무의미해진다.
          const { dirty } = useDirtyStore.getState()
          while (next.length > MAX_TABS) {
            const evictable = next.filter((t) => t.path !== path)
            // 깨끗한 것 중 가장 오래된 것 → 없으면 전부 미저장이므로 그때는
            // 가장 오래된 것을 밀어낸다. 무한히 늘릴 수는 없다.
            const victim = evictable.find((t) => !dirty[t.path]) ?? evictable[0] ?? next[0]!
            next.splice(next.indexOf(victim), 1)
          }
          return { tabs: next }
        }),

      close: (path) => set((s) => ({ tabs: s.tabs.filter((t) => t.path !== path) })),

      setLabel: (path, label) =>
        set((s) => {
          const t = s.tabs.find((x) => x.path === path)
          if (!t || t.label === label) return s
          return { tabs: s.tabs.map((x) => (x.path === path ? { ...x, label } : x)) }
        }),
    }),
    {
      name: 'riruti_admin_tabs_v2',
      // 저장된 경로가 더 이상 어떤 화면에도 매칭되지 않을 수 있다 (화면 삭제·경로 변경).
      merge: (persisted, current) => {
        const raw = (persisted as Partial<TabsState> | undefined)?.tabs ?? []
        const tabs = raw.flatMap((t): OpenTab[] => {
          if (typeof t?.path !== 'string') return []
          const screen = matchScreen(t.path)
          if (!screen) return []
          return [{ path: t.path, screen, label: t.label ?? defaultLabel(screen, t.path) }]
        })
        return { ...current, tabs }
      },
    },
  ),
)
