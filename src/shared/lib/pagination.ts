/**
 * 페이지 계산.
 *
 * 화면(`shared/ui/Pagination`)에서 떼어낸 이유는 **경계가 어긋나기 쉬워서**다 —
 * 1부터 세는 페이지와 0부터 세는 오프셋, 마지막 쪽의 나머지가 겹치는 자리라
 * 눈으로는 맞는지 알 수 없다.
 *
 * ⚠️ **정규화는 여기서만 한다.** 화면도 `clampPage` 를 거쳐 같은 값을 쓴다.
 *    양쪽에서 따로 자르면 표시(`4 / 20`)와 계산(`61–80`)이 갈라진다.
 */

/**
 * 정수로 자른다. `NaN`·`±Infinity` 는 셀 수 없으므로 `fallback`.
 *
 * **숫자로 변환부터 한다.** 타입은 `number` 지만 목록 필터가 `useSearchParams` 로
 * 가면(docs/ARCHITECTURE.md §21) 값이 `'3'` 처럼 문자열로 온다. 그때 그냥 튕겨
 * `fallback` 을 쓰면 **3쪽을 보려 했는데 조용히 1쪽이 뜬다.**
 */
function toInt(n: number, fallback: number): number {
  const v = Number(n)
  return Number.isFinite(v) ? Math.trunc(v) : fallback
}

/** 전체 건수와 쪽당 개수로 페이지 수를 낸다. 0건이면 0 (빈 목록에는 페이지 바가 없다). */
export function pageCount(totalItems: number, perPage: number): number {
  const items = toInt(totalItems, 0)
  const per = toInt(perPage, 0)
  return items <= 0 || per <= 0 ? 0 : Math.ceil(items / per)
}

/**
 * 화면에 쓸 수 있는 페이지 번호로 만든다. **1 이상, `totalPages` 이하의 정수.**
 *
 * 소수·`NaN`·범위 밖을 그대로 흘리면 `61–80` 이 `31–50` 이 되거나(2.5쪽),
 * 화살표가 양쪽 다 열린 채 눌러도 `NaN` 으로 굳는다.
 */
export const clampPage = (page: number, totalPages: number): number =>
  Math.min(Math.max(toInt(page, 1), 1), Math.max(toInt(totalPages, 1), 1))

/** 이 쪽이 보여주는 구간. **1부터 세고 양끝을 포함**한다 (`384건 중 61–80`). */
export type PageRange = { from: number; to: number }

/**
 * 지금 쪽이 전체의 몇 번째부터 몇 번째까지인가.
 *
 * 번호 목록을 없앤 자리를 이게 대신한다 — 어디쯤인지 말해 주는 것이 없으면
 * 사용자는 `4 / 20` 이라는 숫자만 보고 그게 몇 건인지 알 수 없다.
 *
 * `to` 는 **마지막 쪽에서 짧아진다.** 384건을 20개씩 보면 20쪽은 `381–384` 다.
 * 이걸 `page * perPage` 로 두면 없는 4건을 있다고 말하게 된다.
 *
 * @returns 보여줄 것이 없으면(`totalItems` 0 이하) `null`
 */
export function pageRange(page: number, perPage: number, totalItems: number): PageRange | null {
  const total = pageCount(totalItems, perPage)
  if (total === 0) return null

  const per = toInt(perPage, 0)
  const p = clampPage(page, total)
  return { from: (p - 1) * per + 1, to: Math.min(p * per, toInt(totalItems, 0)) }
}
