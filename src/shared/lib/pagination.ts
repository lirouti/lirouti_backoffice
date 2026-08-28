/**
 * 페이지 계산.
 *
 * 화면(`shared/ui/Pagination`)에서 떼어낸 이유는 **경계가 어긋나기 쉬워서**다 —
 * 1부터 세는 페이지와 0부터 세는 오프셋, 마지막 쪽의 나머지가 겹치는 자리라
 * 눈으로는 맞는지 알 수 없다.
 */

/** 전체 건수와 쪽당 개수로 페이지 수를 낸다. 0건이면 0 (빈 목록에는 페이지 바가 없다). */
export const pageCount = (totalItems: number, perPage: number): number =>
  totalItems <= 0 || perPage <= 0 ? 0 : Math.ceil(totalItems / perPage)

/** 이 쪽이 보여주는 구간. **1부터 세고 양끝을 포함**한다 (`384건 중 61–80`). */
export type PageRange = { from: number; to: number }

/**
 * 지금 쪽이 전체의 몇 번째부터 몇 번째까지인가.
 *
 * 번호 목록을 없앤 자리를 이게 대신한다 — 어디쯤인지 말해 주는 것이 없으면
 * 사용자는 `9 / 20` 이라는 숫자만 보고 그게 몇 건인지 알 수 없다.
 *
 * `to` 는 **마지막 쪽에서 짧아진다.** 384건을 20개씩 보면 20쪽은 `381–384` 다.
 * 이걸 `page * perPage` 로 두면 없는 4건을 있다고 말하게 된다.
 *
 * @returns 보여줄 것이 없으면(`totalItems` 0 이하) `null`
 */
export function pageRange(page: number, perPage: number, totalItems: number): PageRange | null {
  if (totalItems <= 0 || perPage <= 0) return null

  const p = Math.min(Math.max(page, 1), pageCount(totalItems, perPage))
  return { from: (p - 1) * perPage + 1, to: Math.min(p * perPage, totalItems) }
}
