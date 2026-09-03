import { useCallback, useEffect, useState } from 'react'

import { create } from 'zustand'

/**
 * "저장 안 된 변경이 있는 탭" 목록.
 *
 * 탭 키(경로)별로 들고 있다. **persist 하지 않는다** — 새로고침하면 화면 상태 자체가
 * 사라지므로(keep-alive 는 메모리에만 있다) 더러움 표시만 남아 있으면 거짓말이 된다.
 */
type DirtyState = {
  /** 경로 → 저장 안 됨 여부 */
  dirty: Record<string, boolean>
  setDirty: (path: string, value: boolean) => void
  /** 세션이 끝날 때 전부 지운다 (docs/ARCHITECTURE.md §16.6) */
  reset: () => void
}

export const useDirtyStore = create<DirtyState>()((set) => ({
  dirty: {},
  setDirty: (path, value) =>
    set((s) => {
      if (!!s.dirty[path] === value) return s
      if (!value) {
        const next = { ...s.dirty }
        delete next[path]
        return { dirty: next }
      }
      return { dirty: { ...s.dirty, [path]: true } }
    }),
  reset: () => set({ dirty: {} }),
}))

/** 해당 경로에 저장 안 된 변경이 있는가 */
export const useIsDirty = (path: string): boolean => useDirtyStore((s) => !!s.dirty[path])

/** 하나라도 더러운 탭이 있는가 */
export const useHasDirty = (): boolean => useDirtyStore((s) => Object.keys(s.dirty).length > 0)

/**
 * 폼 화면에서 호출한다. 저장 안 된 변경을 이 탭에 표시해 둔다.
 *
 * ```tsx
 * const { formState: { isDirty } } = useForm()
 * useUnsavedGuard(isDirty)
 * ```
 *
 * 경로는 **마운트 시점**에 고정한다. keep-alive 로 화면이 살아 있는 동안
 * 다른 탭으로 옮겨가도 이 화면은 자기가 열린 경로에 계속 묶여 있어야 한다.
 *
 * @returns **지금 당장** 표시를 지우는 함수. 저장에 성공한 직후처럼 곧바로 다른 화면으로
 *   옮겨갈 때 쓴다. ⚠️ 폼을 `reset` 해서 `dirty` 가 false 가 되어도 **그 값이 스토어에
 *   닿는 건 다음 effect** 라, 같은 틱에 `navigate` 하면 이동 가드(`useUnsavedNavGuard`)가
 *   먼저 보고 "저장하지 않고 이동할까요?" 를 띄운다 — 방금 저장한 사람에게.
 */
export function useUnsavedGuard(dirty: boolean): () => void {
  const [path] = useState(() => window.location.pathname)
  const setDirty = useDirtyStore((s) => s.setDirty)

  useEffect(() => {
    setDirty(path, dirty)
  }, [path, dirty, setDirty])

  // 화면이 실제로 파기될 때(탭 닫기) 표시도 지운다.
  useEffect(() => () => setDirty(path, false), [path, setDirty])

  return useCallback(() => setDirty(path, false), [path, setDirty])
}

/**
 * 새로고침·브라우저 닫기를 막는다.
 *
 * ⚠️ **문구를 정할 수 없다.** 브라우저가 커스텀 메시지를 무시하고 자기 기본 문구를 띄운다
 *    (2016년경부터 모든 주요 브라우저). 안내 문구가 필요하면 우리 UI 안에서 보여줘야 한다.
 * ⚠️ Chrome 은 사용자가 페이지와 한 번이라도 상호작용해야 이 창을 띄운다.
 */
export function useBeforeUnloadWhenDirty(): void {
  const hasDirty = useHasDirty()

  useEffect(() => {
    if (!hasDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // 구형 브라우저는 returnValue 를 봐야 창이 뜬다.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasDirty])
}
