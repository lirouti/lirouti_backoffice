/**
 * 순서를 손으로 바꾸는 목록에 쓰는 조각.
 *
 * 도메인을 모른다 — 상점 진열이든 FAQ든 "위아래로 옮긴다" 는 같은 동작이다.
 */

/**
 * `from` 과 `to` 를 맞바꾼 **새 배열**.
 *
 * ⚠️ **끝에서 밀면 그대로 돌려준다.** 감싸서 반대쪽 끝으로 보내면 맨 위 항목을
 *    올리려다 맨 아래로 보내게 된다 — 되돌리기 전에는 눈치채기 어렵다.
 *
 * ⚠️ **제자리에서 바꾸지 않는다.** React 가 **같은 참조면 다시 그리지 않고**,
 *    캐시된 배열을 건드리면 다음 조회의 순서까지 바뀐다.
 */
export function moveSlot<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from < 0 || from >= list.length) return list
  const next = [...list]
  ;[next[from], next[to]] = [next[to]!, next[from]!]
  return next
}
