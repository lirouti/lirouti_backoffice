/** 레벨 테이블 규칙. */
import type { Level, LevelErrors, LevelInput, LevelStatus } from './types'

/** `total` 이 아직 없는 행 — 목·서버가 주는 원재료 */
export type LevelSeed = Omit<Level, 'total'>

/**
 * 누적 경험치를 채운다. **앞 행들의 `need` 를 더한 값**이다.
 *
 * ⚠️ **누적을 따로 계산하지 말 것.** `need` 와 다른 식으로 만들면 두 열이 어긋나고,
 *    운영자는 어느 쪽이 맞는지 알 수 없다. 원본이 그래서 Lv1 에 「필요 100 · 누적 62」
 *    를 찍었다 (docs/ARCHITECTURE.md §24.1).
 */
export function withTotals(seeds: LevelSeed[]): Level[] {
  let sum = 0
  return seeds.map((s) => {
    sum += s.need
    return { ...s, total: sum }
  })
}

/** 헤더에 붙는 요약 */
export type LevelSummary = {
  /** 표의 마지막 레벨 */
  maxLv: number
  /** 아직 검수가 안 끝난 행 수 */
  reviewing: number
  /** 만렙까지 필요한 총 경험치 */
  totalExp: number
  /** 만렙까지 받는 젬 합 */
  totalGem: number
}

export function summarizeLevels(list: Level[]): LevelSummary {
  const count = (s: LevelStatus): number => list.filter((l) => l.status === s).length
  return {
    maxLv: list.length === 0 ? 0 : Math.max(...list.map((l) => l.lv)),
    reviewing: count('검수 중'),
    totalExp: list.at(-1)?.total ?? 0,
    totalGem: list.reduce((sum, l) => sum + l.gem, 0),
  }
}

/** 해금 문구의 최대 길이. 표 한 칸에 들어와야 한다 */
export const UNLOCK_MAX = 40

/**
 * 편집 입력 검증.
 *
 * ⚠️ **필요 경험치는 1 이상이다.** 0 이면 그 레벨을 **경험치 없이 지나간다** — 표에서는
 *    누적이 안 늘어난 것으로만 보여서 알아채기 어렵다.
 *
 * ⚠️ **젬 보상은 0 을 허용한다.** 보상이 없는 레벨은 기획이 실제로 두는 값이고,
 *    「0 이면 없음」 이 아니라 **정말 0 개**를 준다는 뜻이다.
 */
export function validateLevel(input: LevelInput): LevelErrors {
  const errors: LevelErrors = {}
  const unlock = input.unlock.trim()

  if (!Number.isInteger(input.need) || input.need < 1)
    errors.need = '필요 경험치는 1 이상의 정수여야 합니다.'
  if (!Number.isInteger(input.gem) || input.gem < 0)
    errors.gem = '젬 보상은 0 이상의 정수여야 합니다.'

  if (!unlock) errors.unlock = '해금 내용을 적어 주세요.'
  else if (unlock.length > UNLOCK_MAX)
    errors.unlock = `해금 내용은 ${UNLOCK_MAX}자를 넘을 수 없습니다.`

  return errors
}

/**
 * 한 행을 고친 새 표.
 *
 * ⚠️ **고친 행은 「검수 중」 으로 내린다.** 여기 숫자를 바꾸면 **이미 그 레벨에 있는
 *    회원이 영향을 받는다** — 릴리스 전에 기획이 확인한 행만 「적용」 이어야 한다는 것이
 *    이 표에 상태가 있는 이유다(§24.1.1). 고친 채로 「적용」 이 남으면 검수를 건너뛴다.
 *
 * ⚠️ **누적은 다시 계산한다.** `need` 를 고치면 **그 아래 모든 행의 `total` 이 움직인다**
 *    — 고친 행만 바꾸면 표가 그 지점부터 어긋난다(§24.1).
 *
 * ⚠️ **원본 배열을 건드리지 않는다.** 저장이 실패해도 화면이 이미 바뀌어 있으면 안 된다.
 */
export function applyLevelEdit(list: Level[], lv: number, input: LevelInput): Level[] {
  return withTotals(list.map((l) => toSeed(l, lv, input)))
}

/** 지금 값에서 편집 입력만 뽑는다. 폼의 기본값이 된다 */
export const levelInputOf = (l: Level): LevelInput => ({
  need: l.need,
  gem: l.gem,
  unlock: l.unlock,
})

/** 한 행을 씨앗으로 되돌린다. 고치는 행이면 입력을 얹고 「검수 중」 으로 내린다 */
function toSeed(l: Level, lv: number, input: LevelInput): LevelSeed {
  const { total, ...seed } = l
  void total // 누적은 `withTotals` 가 다시 채운다
  if (seed.lv !== lv) return seed
  return { ...seed, ...input, unlock: input.unlock.trim(), status: '검수 중' }
}
