/**
 * 페이지 번호 목록 계산.
 *
 * 화면(`shared/ui/Pagination`)에서 떼어낸 이유는 **경계가 어긋나기 쉬워서**다 —
 * 첫 장·끝 장·생략이 겹치는 자리라 눈으로는 맞는지 알 수 없다.
 */

/** 번호가 이어지지 않고 건너뛴 자리. 화면에서는 `…` 로 그린다. */
export type PageGap = 'gap'

/**
 * 페이지 바에 그릴 번호들을 앞에서부터 돌려준다.
 *
 * 첫 장과 끝 장은 **항상** 들어간다 — 200 페이지 목록에서 1 로 돌아갈 방법이
 * 없으면 안 된다.
 *
 * **전체가 최대 너비 안에 들어오면 생략하지 않는다.** 생략이 가장 많이 붙은
 * 모양이 `1 … c-s … c+s … total` 로 `2*span+5` 칸이라, 그보다 짧은 목록은
 * 다 펼쳐도 자리를 더 먹지 않는다. 5장짜리를 `1 2 … 5` 로 접으면 자리는
 * 그대로면서 누를 수 있는 것만 줄어든다.
 *
 * @param current 지금 페이지. **1부터 센다.** 범위를 벗어나면 안쪽으로 당긴다
 * @param total   전체 페이지 수. 0 이하면 빈 배열
 * @param span    현재 페이지 양옆으로 몇 장까지 펼칠지
 */
export function pageWindow(current: number, total: number, span = 1): (number | PageGap)[] {
  if (total <= 0) return []
  if (total <= span * 2 + 5) return Array.from({ length: total }, (_, i) => i + 1)

  const c = Math.min(Math.max(current, 1), total)
  const keep = new Set<number>([1, total])
  for (let p = c - span; p <= c + span; p += 1) {
    if (p >= 1 && p <= total) keep.add(p)
  }

  const pages = [...keep].sort((a, b) => a - b)
  const out: (number | PageGap)[] = []

  for (const [i, p] of pages.entries()) {
    const prev = pages[i - 1]
    if (prev !== undefined) {
      // 딱 한 장만 건너뛰는 자리에는 `…` 대신 그 번호를 넣는다.
      // 자리를 똑같이 먹으면서 누를 수 있는 것이 하나 줄어들 이유가 없다.
      if (p - prev === 2) out.push(prev + 1)
      else if (p - prev > 2) out.push('gap')
    }
    out.push(p)
  }

  return out
}

/** 전체 건수와 쪽당 개수로 페이지 수를 낸다. 0건이면 0 (빈 목록에는 페이지 바가 없다). */
export const pageCount = (totalItems: number, perPage: number): number =>
  totalItems <= 0 || perPage <= 0 ? 0 : Math.ceil(totalItems / perPage)
