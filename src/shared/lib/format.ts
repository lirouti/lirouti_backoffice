const nf = new Intl.NumberFormat('ko-KR')

/** 24180 → "24,180" */
export const num = (n: number): string => nf.format(n)

/** 24180 → "24,180건" */
export const count = (n: number): string => `${nf.format(n)}건`

/** 720 → "720 젬", 0 → "무료" */
export const gem = (n: number): string => (n > 0 ? `${nf.format(n)} 젬` : '무료')

/** 68.4 → "68.4%" */
export const pct = (n: number, digits = 0): string => `${n.toFixed(digits)}%`

/** 8_400_000 → "8.4M" — KPI 카드용 축약 표기 */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const df = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

/** ISO 8601 → "2026년 3월 14일". 파싱 못 하면 원문을 그대로 돌려준다. */
export function date(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : df.format(d)
}
