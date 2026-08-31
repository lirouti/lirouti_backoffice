/**
 * 작성 중이던 폼을 `sessionStorage` 에 남기는 부분 중 **순수한 것**.
 *
 * keep-alive 는 탭을 옮겨도 화면을 살려 두지만 **새로고침은 못 견딘다**
 * (docs/ARCHITECTURE.md §6.3). 폼 화면에서 그건 "쓰던 걸 통째로 잃는다" 는 뜻이라,
 * 초안만은 브라우저에 남겨야 한다.
 *
 * 훅에서 갈라낸 이유는 테스트다 — `sessionStorage` 는 못 돌리지만 직렬화와
 * **모양 검사**는 node 에서 그냥 된다. 그리고 모양 검사가 이 파일의 요점이다.
 */

/**
 * 어느 화면의 초안인가. **경로가 다르면 초안도 다르다** — `items:new` 와 `items:3`.
 *
 * 한 칸을 나눠 쓰면 아이템 등록을 쓰다 만 사람이 다른 아이템 수정을 열었을 때
 * 남의 초안을 받는다.
 */
export const draftKey = (scope: string): string => `riruti_admin_draft:${scope}`

/**
 * `sample` 과 **같은 모양**인가 — 키 집합이 같고 각 자리의 타입이 같아야 한다.
 *
 * ⚠️ **모양이 안 맞는 초안은 조용히 버려야 한다.** `sessionStorage` 는 사용자가 직접
 *    고칠 수 있고, 우리가 입력 타입을 바꾸면 예전 초안이 남아 있다. 믿고 그대로 폼에
 *    넣으면 화면이 깨지거나 — 더 나쁘게 — **`undefined` 인 채로 저장된다.**
 *    목록 필터가 `?slot=WING` 을 버리는 것과 같은 이유다 (docs/ARCHITECTURE.md §18.1).
 *
 * ⚠️ **타입만 본다.** `'HEAD'` 자리에 `'WING'` 이 와도 통과한다 — 열거값까지 보려면
 *    `restoreDraft` 의 `refine` 을 쓴다. **빈 배열이 표본이면 원소를 못 본다**
 *    (비교할 것이 없다) — 그 자리는 화면이 모르는 값을 그냥 안 그리는 쪽으로 견딘다.
 */
export function sameShape(v: unknown, sample: unknown): boolean {
  if (sample === null) return v === null
  if (Array.isArray(sample)) {
    if (!Array.isArray(v)) return false
    const first = sample[0]
    return first === undefined || v.every((x) => sameShape(x, first))
  }
  if (typeof sample === 'object') {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
    const a = v as Record<string, unknown>
    const b = sample as Record<string, unknown>
    const keys = Object.keys(b)
    if (Object.keys(a).length !== keys.length) return false
    return keys.every((k) => k in a && sameShape(a[k], b[k]))
  }
  // 숫자 자리에 `NaN`·`Infinity` 가 들어오면 계산이 조용히 무너진다.
  if (typeof sample === 'number') return typeof v === 'number' && Number.isFinite(v)
  return typeof v === typeof sample
}

/**
 * 저장해 둔 문자열을 초안으로 읽는다. 못 읽거나 모양이 안 맞으면 `null`.
 *
 * @param sample 같은 모양이어야 하는 표본. 보통 폼의 `EMPTY`·초기값
 * @param refine 모양으로는 못 거르는 값 제약(열거값 등). 통과해야 살아남는다
 */
export function readDraft<T>(
  raw: string | null,
  sample: T,
  refine?: (v: T) => boolean,
): T | null {
  if (!raw) return null

  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return null
  }
  if (!sameShape(v, sample)) return null
  const draft = v as T
  return refine && !refine(draft) ? null : draft
}

export const writeDraft = (value: unknown): string => JSON.stringify(value)

/** 저장해 둔 초안을 꺼낸다. 없거나 모양이 안 맞으면 `null`. */
export const restoreDraft = <T,>(scope: string, sample: T, refine?: (v: T) => boolean): T | null =>
  readDraft(sessionStorage.getItem(draftKey(scope)), sample, refine)

/**
 * 초기값에서 벗어났는가 — 폼이 「더러운지」 판정.
 *
 * ⚠️ **훅이 이 값을 인자로 받으므로 순수 함수여야 한다.** 화면에서 `const dirty = …` 로
 *    두면 파생값이 훅 묶음보다 앞서게 되어 선언 순서가 깨진다 (docs/ARCHITECTURE.md §14.2).
 *
 * 키 순서에 기대는 비교지만, 두 값이 **같은 리터럴에서 나온 같은 모양**이라 순서가
 * 어긋날 자리가 없다. 모양이 다를 수 있는 값끼리 비교하는 데 쓰지 말 것.
 */
export const changed = (value: unknown, initial: unknown): boolean =>
  JSON.stringify(value) !== JSON.stringify(initial)
