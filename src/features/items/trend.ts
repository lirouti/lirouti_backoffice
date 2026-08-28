/**
 * 추이 차트의 축 계산.
 *
 * 화면에서 떼어낸 이유는 **경계가 조용히 틀리기 때문**이다 — 폭이 0 이면 선이
 * 납작해지고, 아래위 여유가 없으면 꼭짓점이 잘린다. 눈으로는 "그냥 그런 그래프"로 보인다.
 */

/** 차트가 쓰는 y축 범위와 눈금. `LineChart` 의 `domain`/`ticks` 에 그대로 넘긴다. */
export type TrendAxis = { domain: [number, number]; ticks: number[] }

/** 위아래로 남기는 여유. 값의 폭에 비례해 두되 최소 5%p 는 준다. */
const PAD_RATIO = 0.2
const MIN_PAD = 5

/**
 * 값들을 담을 축을 만든다. 보유율이라 **0~100 밖으로는 안 나간다.**
 *
 * 값이 없거나 전부 같아도(폭 0) 납작해지지 않게 최소 여유를 준다 —
 * 새로 만든 아이템처럼 8주 내내 같은 값인 경우가 실제로 나온다.
 */
export function trendAxis(values: number[]): TrendAxis {
  if (values.length === 0) return { domain: [0, 100], ticks: [0, 50, 100] }

  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max(MIN_PAD, (hi - lo) * PAD_RATIO)

  const min = Math.max(0, Math.floor(lo - pad))
  const max = Math.min(100, Math.ceil(hi + pad))
  const mid = Math.round((min + max) / 2)

  // 가운데 눈금이 양끝과 겹치면 두 개만 그린다 (폭이 아주 좁을 때).
  return { domain: [min, max], ticks: mid > min && mid < max ? [min, mid, max] : [min, max] }
}
