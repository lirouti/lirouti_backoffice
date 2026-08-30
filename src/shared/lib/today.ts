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
