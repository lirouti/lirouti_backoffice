/**
 * 작성 중이던 폼을 브라우저에 남긴다. **되살리는 것은 부르는 쪽이 한다** —
 * 폼을 만들기 전에 읽어야 `defaultValues` 로 넣을 수 있어서다(`restoreDraft`).
 *
 * **자동으로 저장한다.** 「임시 저장」 버튼을 누른 사람만 살아남으면 안 된다 —
 * 잃는 일은 대개 실수로 새로고침할 때 일어나고, 그때는 버튼을 누를 기회가 없다.
 * 버튼은 *즉시* 쓰고 "방금 저장됐다"를 보여 주는 역할이다.
 *
 * ⚠️ **임시 저장은 등록이 아니다.** 미저장 경고(`useUnsavedGuard`)는 초안이 있든
 *    없든 폼이 dirty 면 켠다 — 초안이 있다고 경고를 끄면, 목록으로 나갔다가
 *    "저장했는데 왜 없지" 가 된다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import type { UseFormReturn } from 'react-hook-form'

import type { ItemInput } from '@/domain/item'

import { draftKey, writeDraft } from './draft'

/** 마지막 타건 뒤 이만큼 조용하면 쓴다. `useSearchDraft` 와 같은 이유의 값이다. */
const QUIET_MS = 500

type ItemDraft = {
  /** 지금 값을 즉시 쓴다 (「임시 저장」 버튼) */
  saveNow: () => void
  /** 저장에 성공했거나 「새로 시작」 을 누르면 지운다 */
  clear: () => void
  /** 마지막으로 쓴 시각. 없으면 null */
  savedAt: Date | null
}

/**
 * **폼을 통째로 받는다.** 값과 dirty 를 부르는 쪽에서 꺼내 넘기면 그 두 줄이
 * 파생값이 되어 훅 묶음보다 앞서게 되고, 선언 순서가 깨진다(docs/ARCHITECTURE.md §14).
 *
 * @param scope 초안 칸을 가르는 이름. 등록은 `'new'`, 수정은 아이템 id
 * @param form  자동 저장은 dirty 일 때만 돈다 — 열어만 보고 나간 화면은 초안을 안 남긴다
 */
export function useItemDraft(scope: string, form: UseFormReturn<ItemInput>): ItemDraft {
  const key = draftKey(scope)
  const value = form.watch()
  const on = form.formState.isDirty
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const latest = useRef(value)

  useEffect(() => {
    latest.current = value
  })

  const saveNow = useCallback(() => {
    sessionStorage.setItem(key, writeDraft(latest.current))
    setSavedAt(new Date())
  }, [key])

  const clear = useCallback(() => {
    sessionStorage.removeItem(key)
    setSavedAt(null)
  }, [key])

  useEffect(() => {
    if (!on) return
    const id = window.setTimeout(saveNow, QUIET_MS)
    return () => window.clearTimeout(id)
  }, [on, value, saveNow])

  return { saveNow, clear, savedAt }
}
