import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { matchScreen, SCREENS, sectionOf, type ScreenId } from '@/domain/screens'

import { useDirtyStore } from './dirtyStore'

/**
 * 열린 탭 스택.
 *
 * **탭 하나 = 사이드바의 서브 메뉴 하나다.** 같은 서브 메뉴가 두 번 열릴 일은 없고,
 * 거기서 파생되는 화면(상세·등록·수정)은 **그 탭 안에서 화면만 바뀐다.**
 * 어느 서브 메뉴에 속하는지는 `sectionOf` 가 정한다 (docs/ARCHITECTURE.md §5.2).
 *
 * ```
 * /items      →  「아이템 목록」 탭
 * /items/3    →  같은 탭. 경로만 바뀐다
 * /items/new  →  같은 탭
 * ```
 */
export type OpenTab = {
  /** 탭의 정체성 — 사이드바에 있는 서브 메뉴 화면 */
  screen: ScreenId
  /** 이 탭이 **지금 보고 있는** 경로. 파생 화면으로 들어가면 바뀐다 */
  path: string
  /**
   * 파생 화면에 있을 때 그 화면의 사람이 읽을 이름 ("후드").
   * 화면이 데이터를 받은 뒤 `setLabel` 로 채운다. 서브 메뉴로 돌아오면 지워진다.
   */
  label?: string
}

/**
 * 탭 상한. 스트립이 스크롤 지옥이 되는 것도 있지만, keep-alive 로 화면이 살아 있으므로
 * **메모리 상한이기도 하다.** AdminLayout 의 `<KeepAlive max>` 와 맞물린다.
 */
export const MAX_TABS = 12

/**
 * 이 탭이 **살려 둬야 하는 경로들.**
 *
 * 파생 화면에 있어도 서브 메뉴 화면을 함께 살려 둔다 — 상세를 보다 목록으로 돌아왔을 때
 * 스크롤과 선택이 그대로여야 "탭 안에서 전환됐다"로 읽힌다. 탭당 최대 둘이라
 * keep-alive 캐시는 `2 × MAX_TABS` 로 묶인다.
 */
export function livePaths(tab: OpenTab): string[] {
  const root = SCREENS[tab.screen].path
  return tab.path === root ? [root] : [tab.path, root]
}

type TabsState = {
  tabs: OpenTab[]
  /**
   * 경로를 연다. 그 서브 메뉴 탭이 이미 있으면 **새로 만들지 않고 경로만 바꾼다.**
   */
  open: (path: string) => void
  /** 서브 메뉴 단위로 닫는다 */
  close: (screen: ScreenId) => void
  /** 파생 화면이 데이터를 받은 뒤 사람이 읽을 이름을 채운다 */
  setLabel: (path: string, label: string) => void
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set) => ({
      tabs: [],

      open: (path) =>
        set((s) => {
          const screen = matchScreen(path)
          if (!screen) return s
          const section = sectionOf(screen)

          const existing = s.tabs.find((t) => t.screen === section)
          if (existing) {
            if (existing.path === path) return s
            // 같은 탭 안에서 화면이 바뀐 것이다. 라벨은 새 화면이 다시 채운다.
            return {
              tabs: s.tabs.map((t) => (t.screen === section ? { screen: section, path } : t)),
            }
          }

          const next: OpenTab[] = [...s.tabs, { screen: section, path }]

          // 넘치면 밀어내는데, **저장 안 된 탭은 뒤로 미룬다.**
          // 밀려난 탭은 AdminLayout 이 keep-alive 캐시까지 파기하므로 작성 중이던
          // 내용이 확인 한 번 없이 사라진다 — 탭을 손으로 닫을 때는 확인 창으로
          // 막으면서 자동 축출로는 날아가면 `useUnsavedGuard` 가 무의미해진다.
          const { dirty } = useDirtyStore.getState()
          const isDirty = (t: OpenTab) => livePaths(t).some((p) => dirty[p])
          while (next.length > MAX_TABS) {
            const evictable = next.filter((t) => t.screen !== section)
            const victim = evictable.find((t) => !isDirty(t)) ?? evictable[0] ?? next[0]!
            next.splice(next.indexOf(victim), 1)
          }
          return { tabs: next }
        }),

      close: (screen) => set((s) => ({ tabs: s.tabs.filter((t) => t.screen !== screen) })),

      setLabel: (path, label) =>
        set((s) => {
          const t = s.tabs.find((x) => x.path === path)
          if (!t || t.label === label) return s
          return { tabs: s.tabs.map((x) => (x.path === path ? { ...x, label } : x)) }
        }),
    }),
    {
      // v2 는 경로 단위 탭이었다. 모양이 달라 그대로 읽으면 상세마다 탭이 하나씩 생긴다.
      name: 'riruti_admin_tabs_v3',
      // 저장된 경로가 더 이상 어떤 화면에도 매칭되지 않을 수 있다 (화면 삭제·경로 변경).
      merge: (persisted, current) => {
        const raw = (persisted as Partial<TabsState> | undefined)?.tabs ?? []
        const bySection = new Map<ScreenId, OpenTab>()
        for (const t of raw) {
          if (typeof t?.path !== 'string') continue
          const screen = matchScreen(t.path)
          if (!screen) continue
          const section = sectionOf(screen)
          // 같은 서브 메뉴가 여럿이면 마지막 것만 남긴다.
          bySection.set(section, { screen: section, path: t.path, label: t.label })
        }
        return { ...current, tabs: [...bySection.values()] }
      },
    },
  ),
)
