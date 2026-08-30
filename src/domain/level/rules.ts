/** 레벨 테이블 규칙. */
import type { Level, LevelStatus } from './types'

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
