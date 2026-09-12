/** 성장 단계 규칙. */
import type { DayStage, GrowthBoundaries, GrowthStage } from './types'

/** 첫 단계는 0일차부터 시작한다. 가입한 날이 0일차다 */
export const FIRST_DAY = 0

/**
 * 이 단계의 「소요」 표시.
 *
 * ⚠️ **저장하지 말 것.** 경계 하나를 고치면 두 단계의 표시가 함께 바뀌므로, 문자열로 들고
 *    있으면 반드시 어긋난다 — 실제로 `'0–2일'` 과 `'3–13일'` 을 따로 들고 있었다
 *    (docs/ARCHITECTURE.md §42.3). 기간에서 나오는 값을 저장하지 않는 것은 공지·챌린지에서
 *    이미 세 번 정한 규칙이다 (§25.1 · §20.2).
 *
 * @param next 다음 **날짜 단계**의 시작일. 마지막 단계면 `null` — 끝이 없다
 */
export function stageSpan(stage: GrowthStage, next: number | null): string {
  if (stage.kind === 'event') return stage.note
  if (next === null) return `${stage.fromDay}일~`
  return `${stage.fromDay}–${next - 1}일`
}

/**
 * 각 단계에 「소요」 를 붙여 돌려준다.
 *
 * ⚠️ **다음 날짜 단계를 찾을 때 사건 단계를 건너뛴다.** 「금」 이 알과 유체 **사이에**
 *    놓이므로, 바로 다음 칸을 보면 일수가 없어서 알의 표시를 만들 수 없다.
 */
export function withSpans(stages: GrowthStage[]): { stage: GrowthStage; span: string }[] {
  return stages.map((stage, i) => {
    const next = stages.slice(i + 1).find(isDayStage)
    return { stage, span: stageSpan(stage, next ? next.fromDay : null) }
  })
}

export const isDayStage = (s: GrowthStage): s is DayStage => s.kind === 'days'

/** 경계 입력 오류. 다른 `validate*` 와 같은 모양이다 */
export type BoundaryErrors = Partial<Record<keyof GrowthBoundaries, string>>

/**
 * 경계 검증.
 *
 * ⚠️ **순서가 뒤집히면 단계가 사라진다.** 유체 시작이 성체 시작보다 뒤면 유체가 하루도
 *    없는 기간이 되는데, 화면에는 `'14–13일'` 처럼 **말이 안 되는 표시**로만 드러난다.
 *
 * ⚠️ **첫날은 1 이상이다.** 0 을 허용하면 알이 하루도 없이 끝난다 — 0일차는 알의 것이다.
 */
export function validateBoundaries(b: GrowthBoundaries): BoundaryErrors {
  const errors: BoundaryErrors = {}

  if (!Number.isInteger(b.juvenileFrom) || b.juvenileFrom <= FIRST_DAY)
    errors.juvenileFrom = `유체 시작일은 ${FIRST_DAY + 1}일 이상의 정수여야 합니다.`
  if (!Number.isInteger(b.adultFrom) || b.adultFrom <= FIRST_DAY)
    errors.adultFrom = `성체 시작일은 ${FIRST_DAY + 1}일 이상의 정수여야 합니다.`

  // 둘 다 모양이 맞아야 순서를 따질 수 있다 — 아니면 오류 둘이 겹쳐 나온다.
  if (!errors.juvenileFrom && !errors.adultFrom && b.adultFrom <= b.juvenileFrom)
    errors.adultFrom = '성체 시작일은 유체 시작일보다 뒤여야 합니다.'

  return errors
}

/** 지금 값에서 경계만 뽑는다. 폼의 기본값이 된다 */
export function boundariesOf(stages: GrowthStage[]): GrowthBoundaries {
  const days = stages.filter(isDayStage)
  return { juvenileFrom: days[1]?.fromDay ?? 1, adultFrom: days[2]?.fromDay ?? 2 }
}

/**
 * 경계를 적용한 새 배열. **원본을 건드리지 않는다** — 캐시된 배열을 제자리에서 고치면
 * 저장이 실패해도 화면이 이미 바뀌어 있다.
 */
export function applyBoundaries(stages: GrowthStage[], b: GrowthBoundaries): GrowthStage[] {
  let seen = 0
  return stages.map((s) => {
    if (!isDayStage(s)) return s
    seen += 1
    if (seen === 2) return { ...s, fromDay: b.juvenileFrom }
    if (seen === 3) return { ...s, fromDay: b.adultFrom }
    return s
  })
}
