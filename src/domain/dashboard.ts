/** 대시보드 지표 타입. */

/** KPI 한 칸 */
export type Kpi = {
  label: string
  value: string
  /** '+6.2%' 처럼 부호를 포함한 변화량 */
  delta: string
  direction: 'up' | 'down'
  note: string
}

/** 젬 유입·소비 같은 2계열 그룹 바 한 칸 */
export type SeriesPoint = {
  label: string
  /** 1계열 (유입) */
  a: number
  /** 2계열 (소비) */
  b: number
}
