/**
 * 페이지 번호 목록 계산.
 *
 * 화면(`shared/ui/Pagination`)에서 떼어낸 이유는 **경계가 어긋나기 쉬워서**다 —
 * 첫 장·끝 장·생략이 겹치는 자리라 눈으로는 맞는지 알 수 없다.
 */

/** 번호가 이어지지 않고 건너뛴 자리. 화면에서는 `…` 로 그린다. */
export type PageGap = 'gap'

/** `span` 이 정하는 **고정 칸 수**. 앞·현재 묶음·뒤 + 생략 둘 + 첫 장·끝 장. */
export const slotCount = (span = 1): number => span * 2 + 5

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/**
 * 페이지 바에 그릴 번호들을 앞에서부터 돌려준다.
 *
 * ⚠️ **길이가 항상 같다.** `total` 이 `slotCount(span)` 보다 크면 어느 페이지에
 *    있든 정확히 그 개수를 돌려준다. 개수가 들쭉날쭉하면 페이지를 옮길 때마다
 *    바의 폭이 변하고, 오른쪽 정렬된 바는 **통째로 가로로 밀린다** — 누르려던
 *    번호가 손가락 밑에서 도망가고, 그게 "깜빡인다"로 보인다.
 *
 * 첫 장과 끝 장은 **항상** 들어간다 — 200 페이지 목록에서 1 로 돌아갈 방법이
 * 없으면 안 된다. 그래서 모양은 셋뿐이다.
 *
 * ```text
 * 앞에 붙음   1 2 3 4 5 … 20
 * 가운데      1 … 9 10 11 … 20
 * 뒤에 붙음   1 … 16 17 18 19 20
 * ```
 *
 * @param current 지금 페이지. **1부터 센다.** 범위를 벗어나면 안쪽으로 당긴다
 * @param total   전체 페이지 수. 0 이하면 빈 배열
 * @param span    현재 페이지 양옆으로 몇 장까지 펼칠지. 칸 수를 함께 정한다
 */
export function pageWindow(current: number, total: number, span = 1): (number | PageGap)[] {
  if (total <= 0) return []

  const slots = slotCount(span)
  if (total <= slots) return range(1, total)

  const c = Math.min(Math.max(current, 1), total)
  // 한쪽 끝에 붙었을 때 이어서 보여주는 번호 개수. 나머지 두 칸은 `…` 와 반대쪽 끝.
  const run = slots - 2

  if (c <= run - 1) return [...range(1, run), 'gap', total]
  if (c >= total - run + 2) return [1, 'gap', ...range(total - run + 1, total)]
  return [1, 'gap', ...range(c - span, c + span), 'gap', total]
}

/** 전체 건수와 쪽당 개수로 페이지 수를 낸다. 0건이면 0 (빈 목록에는 페이지 바가 없다). */
export const pageCount = (totalItems: number, perPage: number): number =>
  totalItems <= 0 || perPage <= 0 ? 0 : Math.ceil(totalItems / perPage)
