import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NavState = {
  /** 그룹 라벨 → 펼침 여부. 값이 없으면 "현재 화면이 속한 그룹이면 펼침" 이 기본값. */
  open: Record<string, boolean>
  toggle: (label: string, fallback: boolean) => void
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      open: {},
      toggle: (label, fallback) =>
        set((s) => ({
          open: { ...s.open, [label]: !(s.open[label] ?? fallback) },
        })),
    }),
    { name: 'riruti_admin_nav_v1' },
  ),
)
