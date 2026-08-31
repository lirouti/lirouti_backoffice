/**
 * 작성 중이던 폼을 브라우저에 남긴다. **되살리는 것은 부르는 쪽이 한다** —
 * 폼을 만들기 전에 읽어야 초기값으로 넣을 수 있어서다(`restoreDraft`).
 *
 * **자동으로 저장한다.** 「임시 저장」 버튼을 누른 사람만 살아남으면 안 된다 —
 * 잃는 일은 대개 실수로 새로고침할 때 일어나고, 그때는 버튼을 누를 기회가 없다.
 * 버튼은 *즉시* 쓰고 "방금 저장됐다"를 보여 주는 역할이다.
 *
 * ⚠️ **임시 저장은 등록이 아니다.** 미저장 경고(`useUnsavedGuard`)는 초안이 있든
 *    없든 폼이 더러우면 켠다 — 초안이 있다고 경고를 끄면, 목록으로 나갔다가
 *    "저장했는데 왜 없지" 가 된다.
 *
 * `shared/lib` 이 아니라 여기 있는 이유는 **React 가 필요해서**다. `lib` 은 node 에서
 * 그냥 도는 순수 함수만 두고 그래서 테스트가 붙는다 (`draft.test.ts`).
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { draftKey, writeDraft } from '../lib/draft'

/** 마지막 타건 뒤 이만큼 조용하면 쓴다. 글자마다 쓰면 긴 폼에서 눈에 띄게 버벅인다 */
const QUIET_MS = 500

export type FormDraft = {
  /** 지금 값을 즉시 쓴다 (「임시 저장」 버튼) */
  saveNow: () => void
  /** 저장에 성공했거나 「새로 시작」 을 누르면 지운다 */
  clear: () => void
  /** 마지막으로 쓴 시각. 없으면 `null` */
  savedAt: Date | null
}

/**
 * @param scope 초안 칸을 가르는 이름. 등록은 `'items:new'`, 수정은 `'items:3'`
 * @param value 지금 폼 값. 통째로 직렬화한다
 * @param dirty **손댔을 때만** 쓴다 — 열어만 보고 나간 화면은 초안을 안 남긴다
 */
export function useFormDraft(scope: string, value: unknown, dirty: boolean): FormDraft {
  const key = draftKey(scope)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  // ⚠️ **`saveNow` 가 값을 의존성으로 갖지 않게 한다.** 값이 바뀔 때마다 함수가 새로
  //    만들어지면 아래 타이머가 매 타건마다 다시 걸려 **조용해질 때까지 기다리는
  //    의미가 사라진다.**
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
    if (!dirty) return
    const id = window.setTimeout(saveNow, QUIET_MS)
    return () => window.clearTimeout(id)
  }, [dirty, value, saveNow])

  return { saveNow, clear, savedAt }
}
