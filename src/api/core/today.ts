/**
 * 운영 기준일.
 *
 * ⚠️ **`toISOString().slice(0,10)` 을 쓰면 안 된다.** 그건 UTC 날짜라 한국 자정~오전 9시
 *    사이에는 **전날**로 찍힌다 — 오늘 시작하는 챌린지가 「예약」 으로 잡히고, 오늘 가입한
 *    회원이 어제 가입으로 세어진다. `shared/lib/format.ts` 의 `date()` 도 같은 이유로
 *    한 번 깨진 적이 있다.
 *
 * 도메인 함수들이 오늘을 **인자로 받는** 이유도 여기 있다 — 안에서 시각을 읽으면
 * 테스트가 실행한 날에 따라 달라진다. 오늘이 언제인지는 파사드가 안다.
 *
 * TODO(백엔드 스펙 확정 후): 서버가 쓰는 기준 시간대와 같은지 확인한다
 */
const OPERATING_TZ = 'Asia/Seoul'

/** `YYYY-MM-DD`. `sv-SE` 로케일이 그 형식을 그대로 준다 */
export const today = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: OPERATING_TZ }).format(new Date())
