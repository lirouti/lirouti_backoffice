const nf = new Intl.NumberFormat('ko-KR')

/** 24180 → "24,180" */
export const num = (n: number): string => nf.format(n)

/** 24180 → "24,180건" */
export const count = (n: number): string => `${nf.format(n)}건`

/** 720 → "720 젬", 0 → "무료" */
export const gem = (n: number): string => (n > 0 ? `${nf.format(n)} 젬` : '무료')

/** 68.4 → "68.4%" */
export const pct = (n: number, digits = 0): string => `${n.toFixed(digits)}%`

/**
 * `part / total` 을 백분율로. **모수가 0 이면 `—`.**
 *
 * ⚠️ **0 으로 나눈 결과를 그대로 찍으면 `NaN%` 가 화면에 뜬다.** 「아직 집계 전」 이나
 *    「대상 없음」 을 0% 로 그리는 것도 틀렸다 — 0% 는 "있는데 하나도 안 됐다" 는 뜻이다
 *    (docs/ARCHITECTURE.md §26.3).
 */
export const share = (part: number, total: number): string =>
  total === 0 ? '—' : `${Math.round((part / total) * 100)}%`

/** 8_400_000 → "8.4M" — KPI 카드용 축약 표기 */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const df = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

/**
 * ISO 8601 → "2026년 3월 14일". 파싱 못 하면 원문을 그대로 돌려준다.
 *
 * `'2026-03-14'` 처럼 **날짜만 있는 값은 UTC 자정**으로 파싱된다(명세가 그렇다).
 * 그대로 지역 시간으로 찍으면 UTC 보다 뒤진 지역에서 하루 전날이 나온다.
 * 한국(UTC+9)에서는 드러나지 않지만 **Spring 의 `LocalDate` 가 정확히 이 모양**이라
 * 실서버를 붙이면 들어올 값이다. 날짜만 오면 지역 자정으로 직접 만든다.
 *
 * 그런데 `new Date(y, m, d)` 는 **잘못된 날짜를 조용히 굴린다** — `2026-02-31` 을
 * 거부하지 않고 3월 3일로 바꾼다. 그러면 "파싱 못 하면 원문" 계약이 깨진다.
 * 또 연도 0~99 를 1900 년대로 매핑한다(`0001` → 1901). 둘 다 `setFullYear` 로
 * 만든 뒤 **구성 요소를 되돌려 대조**해서 막는다.
 */
export function date(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (m) {
    const [y, mo, dd] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])]
    const d = new Date(0)
    d.setFullYear(y, mo, dd) // 생성자와 달리 0~99 를 1900 년대로 바꾸지 않는다
    d.setHours(0, 0, 0, 0)
    const rolled = d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== dd
    return rolled ? iso : df.format(d)
  }
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : df.format(d)
}
