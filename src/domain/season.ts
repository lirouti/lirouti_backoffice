/**
 * 시즌 — 시즌제 콘텐츠를 묶는 단위.
 *
 * ⚠️ **네 곳이 시즌을 각자 정의하고 서로 달랐다** (docs/ARCHITECTURE.md §34.1).
 *    헤더는 `시즌 3 · D-12` 를 문자열로 박아 D-12 가 줄지 않았고, 아이템 폼과 종 등록은
 *    고를 수 있는 시즌 목록이 **서로 어긋났으며**, 공통 코드의 `SEASON` 그룹은 자기가
 *    그 목록을 관리한다고 적어 두고도 아무도 보지 않았다.
 *
 * 여기가 **하나뿐인 출처**다.
 */
import { daysBetween } from '@/shared/lib/today'

export type Season = {
  /** 1부터. `시즌 3` 의 3 */
  no: number
  /** `YYYY-MM-DD`. 시즌이 시작한 날(포함) */
  startsAt: string
  /**
   * `YYYY-MM-DD`. **시즌의 마지막 날(포함)이다.**
   *
   * ⚠️ 「이 날까지 한다」 이지 「이 날 끝난다」 가 아니다. 배타로 읽으면 마지막 날에
   *    **하루 일찍 「종료」** 가 떠서, 그날 마감을 노리던 이벤트가 닫힌 것처럼 보인다.
   */
  endsAt: string
}

/** 시즌에 매이지 않는 것 */
export const ALWAYS = '상시'

export const seasonLabel = (no: number): string => `시즌 ${no}`

/**
 * 남은 날. **마지막 날에는 0** 이고, 지난 뒤에는 음수다.
 *
 * @param today `YYYY-MM-DD`. 안에서 읽으면 테스트가 실행한 날에 따라 달라진다
 */
export const daysLeft = (s: Season, today: string): number => daysBetween(today, s.endsAt)

/** 아직 하고 있는가. **마지막 날도 포함**이다 */
export const isRunning = (s: Season, today: string): boolean =>
  today >= s.startsAt && today <= s.endsAt

/**
 * 헤더 칩 문구.
 *
 * ⚠️ **`D-0` 대신 「오늘 마감」 이라고 쓴다.** `D-0` 은 「끝났다」 로도 「오늘까지」 로도
 *    읽혀서, 하필 제일 중요한 날에 제일 헷갈린다.
 *
 * 시작 전이면 `D+n` 이 아니라 「n일 뒤 시작」 이다 — 남은 날과 기다리는 날은 다른 값이라
 * 같은 모양으로 쓰면 카운트다운이 거꾸로 읽힌다.
 */
export function seasonChip(s: Season, today: string): string {
  const label = seasonLabel(s.no)
  if (today < s.startsAt) return `${label} · ${daysBetween(today, s.startsAt)}일 뒤 시작`

  const left = daysLeft(s, today)
  if (left < 0) return `${label} · 종료`
  if (left === 0) return `${label} · 오늘 마감`
  return `${label} · D-${left}`
}

/**
 * 고를 수 있는 시즌. **`상시` + 시즌 1부터 다음 시즌까지.**
 *
 * ⚠️ **지난 시즌을 빼면 안 된다.** 시즌 1 아이템을 수정하려고 열었을 때 그 시즌이 목록에
 *    없으면, 고치지도 않은 칸이 저장하는 순간 다른 값으로 바뀐다.
 *
 * ⚠️ **다음 시즌을 넣는다.** 시즌 4 콘텐츠는 시즌 3 동안 미리 만든다 — 그게 시즌제의
 *    운영 방식이다.
 */
export function seasonOptions(s: Season): string[] {
  const seasons = Array.from({ length: s.no + 1 }, (_, i) => seasonLabel(i + 1))
  return [ALWAYS, ...seasons]
}

/**
 * 지금 시즌.
 *
 * ⚠️ **날짜는 자리를 채워 둔 값이다.** 서버가 아직 시즌을 주지 않는다 — 하지만 **규칙은
 *    진짜라서** 이 날짜만 바뀌면 화면이 전부 따라온다. 원본의 `D-12` 와 맞도록 마감을
 *    잡았고(90일 시즌), 그래서 **하루 지날 때마다 실제로 줄고 지나면 「종료」 가 뜬다** —
 *    문자열로 박혀 있을 때는 영영 `D-12` 였다.
 *
 * ⚠️ **`daysAgo()` 로 만들지 않았다.** 오늘에 붙여 두면 숫자는 안 죽지만 **영원히 D-12** 라,
 *    박아 둔 것과 화면에서 구별되지 않는다 — 고친 것이 고쳐졌는지 볼 수 없다.
 *
 * TODO(서버가 시즌을 주기 시작하면): `api/season.ts` 로 옮기고 `Topbar` 는
 *       `setSignOutHandler` 와 같은 방식으로 주입받는다 — `layouts` 는 `api` 를 못 본다.
 */
export const CURRENT_SEASON: Season = {
  no: 3,
  startsAt: '2026-06-14',
  endsAt: '2026-09-12',
}
