/**
 * 운영 기준일.
 *
 * ⚠️ **`toISOString().slice(0,10)` 을 쓰면 안 된다.** 그건 UTC 날짜라 한국 자정~오전 9시
 *    사이에는 **전날**로 찍힌다 — 오늘 시작하는 챌린지가 「예약」 으로 잡히고, 오늘 들어온
 *    결제가 「오늘 결제」 에서 빠진다. `format.ts` 의 `date()` 도 같은 이유로 한 번 깨졌다.
 *
 * 도메인 함수들이 오늘을 **인자로 받는** 이유도 여기 있다 — 안에서 시각을 읽으면
 * 테스트가 실행한 날에 따라 달라진다. 오늘이 언제인지는 부르는 쪽이 안다.
 *
 * ⚠️ **`api/core` 가 아니라 여기 있다.** `mocks/` 도 써야 하는데 `mocks` 는 `api` 를
 *    볼 수 없다(docs/ARCHITECTURE.md §4.3). 인프라가 아니라 순수 계산이라 `shared` 가 맞다.
 *
 * TODO(백엔드 스펙 확정 후): 서버가 쓰는 기준 시간대와 같은지 확인한다
 */
const OPERATING_TZ = 'Asia/Seoul'

/** `YYYY-MM-DD`. `sv-SE` 로케일이 그 형식을 그대로 준다 */
export const today = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: OPERATING_TZ }).format(new Date())

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * `YYYY-MM-DD` 에서 `n` 일을 뺀다. **달력 날짜 계산이라 시간대가 끼어들지 않는다.**
 *
 * ⚠️ **`Date#setDate` 로 빼면 안 된다.** 그건 **실행 환경의 시간대**로 계산하는데,
 *    그 시간대에 서머타임이 있으면 하루가 23시간·25시간이 되어 **서울 달력과 어긋난다.**
 *    실제로 `America/New_York` 에서 서울 기준 2026-11-02 일 때 `daysAgo(1)` 이
 *    **2026-10-31** 을 줬다 — 11-01 을 통째로 건너뛴다.
 *
 * UTC 자정 기준으로 빼면 서머타임이 없어 정확하다. **문자열을 받는 순수 함수**라
 * 테스트가 실행 환경에 기대지 않는다.
 */
export function shiftDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const at = new Date(Date.UTC(y!, m! - 1, d!) - n * 86_400_000)
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`
}

/**
 * `n` 일 전 날짜 `YYYY-MM-DD` (운영 기준 시간대).
 *
 * **목 데이터가 오늘을 기준으로 살아 있게 하는 데 쓴다.** 날짜를 과거에 박아 두면
 * 「오늘 결제」 같은 지표가 **영원히 0** 이 된다 — 화면은 멀쩡한데 죽은 숫자다.
 */
export const daysAgo = (n: number): string => shiftDays(today(), n)

/**
 * 지금 시각 `YYYY-MM-DD HH:mm` (운영 기준 시간대).
 *
 * **야간 발송 차단처럼 「지금」 이 언제인지가 규칙에 들어갈 때 쓴다.** 예약 시각과 같은
 * 모양이라 도메인 함수가 둘을 구분하지 않아도 된다 (docs/ARCHITECTURE.md §26.2).
 *
 * ⚠️ **`Date#getHours()` 를 쓰면 안 된다.** 그건 실행 환경의 시간대라, 서버에 배포된
 *    브라우저나 해외에서 접속한 운영자에게 **다른 시각**이 나온다.
 */
export function nowAt(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: OPERATING_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
  // `sv-SE` 는 `2026-08-31 21:04` 로 준다 — 우리가 쓰는 모양 그대로다.
  return parts
}

/**
 * `from` 에서 `to` 까지 며칠인가. 같은 날이면 0, `to` 가 미래면 양수.
 *
 * ⚠️ **`shiftDays` 와 같은 이유로 UTC 자정 기준으로 뺀다.** 실행 환경 시간대로 파싱하면
 *    서머타임이 있는 곳에서 두 끝의 오프셋이 달라져 **하루가 어긋난다** — D-day 는 그
 *    하루가 곧 「오늘 마감인가」 라 조용히 넘어가지 않는다.
 *
 * UTC 자정끼리의 차는 **정확히 86,400,000 의 배수**라 반올림이 필요 없다. 나눗셈만으로
 * 정수가 나온다 — `Math.round` 를 두면 「무언가를 막고 있다」 로 읽히는데 막을 것이 없다.
 *
 * @param from `YYYY-MM-DD`
 * @param to   `YYYY-MM-DD`
 */
export function daysBetween(from: string, to: string): number {
  const at = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y!, m! - 1, d!)
  }
  return (at(to) - at(from)) / 86_400_000
}
