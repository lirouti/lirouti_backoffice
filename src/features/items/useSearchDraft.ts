/**
 * 입력창의 **초안**을 주소와 떼어 놓는다.
 *
 * ⚠️ **입력창을 주소에 직접 매면 안 된다.** 매 타건이 주소를 한 바퀴 돌아오는데,
 *    주소는 값을 그대로 보관하지 않는다(기본값·공백뿐인 값은 안 적는다). 그러면
 *    **친 글자가 화면에서 사라진다** — 실제로 `왕실 벨벳` 의 가운데 공백이 먹혔고,
 *    고친 뒤에도 첫 글자가 공백이면, 또 고친 뒤에도 검색어를 공백으로 지우면
 *    같은 자리에서 계속 사라졌다.
 *
 * 초안은 화면이 들고 있고, 주소에는 **조용해졌을 때만** 쓴다.
 * 곁들여 매 타건마다 라우터를 다시 그리는 것도 없어진다.
 */
import { useEffect, useRef, useState } from 'react'

import { committedSearch } from './query'

/** 마지막 타건 뒤 이만큼 조용하면 주소에 쓴다. */
const QUIET_MS = 250

/**
 * `[초안, 초안을 바꾸는 함수]`.
 *
 * @param committed 주소에 실제로 실린 값
 * @param commit    주소에 쓴다. 매 렌더 새로 만들어도 된다 — ref 로 최신 것만 붙든다
 */
export function useSearchDraft(
  committed: string,
  commit: (value: string) => void,
): [string, (value: string) => void] {
  const [draft, setDraft] = useState(committed)
  /** 마지막으로 본 `committed`. 밖에서 바뀐 것을 알아채는 데 쓴다 */
  const [seen, setSeen] = useState(committed)
  // 콜백을 의존성에 넣으면 부르는 쪽이 `useCallback` 을 써야 하는데, 그러면 획득 훅
  // 사이에 계산이 끼어 선언 순서가 깨진다(docs/ARCHITECTURE.md §14).
  // 최신 것만 붙들어 두면 그럴 일이 없다.
  const commitRef = useRef(commit)

  useEffect(() => {
    commitRef.current = commit
  })

  useEffect(() => {
    // **써 봐야 주소가 같은 값이면 쓰지 않는다.** 두 가지를 한꺼번에 막는다.
    //   · 끝 공백만 더한 경우도 주소가 따라간다 (`왕실` → `왕실 `)
    //   · 공백만 친 상태(`'   '` vs `''`)는 주소가 안 실으므로 매번 다시 쓰는 무한 반복이 안 된다
    if (committedSearch(draft) === committed) return

    const id = window.setTimeout(() => commitRef.current(draft), QUIET_MS)
    return () => window.clearTimeout(id)
  }, [draft, committed])

  // 밖에서 바뀌면(뒤로가기 · 필터 초기화 · 링크로 진입) 초안을 맞춘다.
  //
  // **효과가 아니라 렌더 중에 보정한다.** 효과 안에서 setState 하면 화면을 한 번
  // 그린 뒤 다시 그리게 되고(연쇄 렌더), ESLint 가 그걸 잡는다. 렌더 중 보정은
  // 커밋 전에 다시 돌아 깜빡임이 없다.
  if (committed !== seen) {
    setSeen(committed)
    // **우리가 쓴 것이 그대로 돌아온 것이면** 초안을 건드리지 않는다
    // (`'   '` 을 썼는데 `''` 이 돌아온 경우). 그 외에는 밖에서 바뀐 것이므로 따른다 —
    // 공백만 다른 주소로 앞뒤 이동한 경우도 여기서 따라가야 한다.
    if (committedSearch(draft) !== committed) setDraft(committed)
  }

  return [draft, setDraft]
}
