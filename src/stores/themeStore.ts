import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

/** index.html 의 FOUC 방지 스크립트와 **반드시** 같은 키여야 한다. */
export const THEME_KEY = 'riruti_admin_theme_v1'

type ThemeState = {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

function apply(t: Theme) {
  document.documentElement.dataset.theme = t
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        apply(next)
        set({ theme: next })
      },
      set: (t) => {
        apply(t)
        set({ theme: t })
      },
    }),
    {
      name: THEME_KEY,
      partialize: (s) => ({ theme: s.theme }) as ThemeState,
      // 저장된 값을 복원한 직후 DOM 에도 반영한다.
      onRehydrateStorage: () => (s) => {
        if (s) apply(s.theme)
      },
    },
  ),
)
