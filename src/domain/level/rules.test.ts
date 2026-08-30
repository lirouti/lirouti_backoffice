/**
 * 레벨 테이블 규칙 (docs/ARCHITECTURE.md §24).
 *
 * 여기가 틀리면 **표의 두 열이 서로 다른 말을 한다** — 운영자는 어느 쪽이 맞는지
 * 알 수 없고, 그 상수는 이미 그 레벨에 있는 회원에게 적용된다.
 */
import { describe, expect, it } from 'vitest'

import { summarizeLevels, withTotals, type LevelSeed } from './rules'

const seed = (lv: number, need: number, over: Partial<LevelSeed> = {}): LevelSeed => ({
  lv,
  need,
  gem: 20,
  unlock: '기본 표정',
  status: '적용',
  ...over,
})

describe('withTotals', () => {
  it('누적은 앞 행들의 필요 경험치 합이다', () => {
    expect(withTotals([seed(1, 100), seed(2, 238), seed(3, 412)]).map((l) => l.total)).toEqual([
      100, 338, 750,
    ])
  })

  // 원본은 `need × lv × 0.62` 라는 별개 식이라 Lv1 이 「필요 100 · 누적 62」 였다.
  it('⚠️ 첫 행의 누적은 그 행의 필요 경험치와 같다 — 더 작을 수 없다', () => {
    const [first] = withTotals([seed(1, 100), seed(2, 238)])
    expect(first!.total).toBe(first!.need)
  })

  it('⚠️ 누적은 절대 줄지 않는다', () => {
    const list = withTotals([seed(1, 100), seed(2, 238), seed(3, 412), seed(4, 622)])
    for (const [i, l] of list.entries()) {
      expect(l.total).toBeGreaterThanOrEqual(list[i - 1]?.total ?? 0)
      expect(l.total).toBeGreaterThanOrEqual(l.need)
    }
  })

  it('빈 표는 빈 표', () => {
    expect(withTotals([])).toEqual([])
  })
})

describe('summarizeLevels', () => {
  const list = withTotals([
    seed(1, 100, { gem: 20 }),
    seed(2, 238, { gem: 30 }),
    seed(3, 412, { gem: 40, status: '검수 중' }),
  ])

  it('만렙 · 검수 중 건수 · 젬 합', () => {
    const s = summarizeLevels(list)
    expect([s.maxLv, s.reviewing, s.totalGem]).toEqual([3, 1, 90])
  })

  // 마지막 행의 누적이 곧 전체 합이다 — 따로 더하면 러닝 합과 어긋날 여지가 생긴다.
  it('⚠️ 총 경험치는 마지막 행의 누적이다', () => {
    expect(summarizeLevels(list).totalExp).toBe(750)
  })

  it('빈 표에서 만렙은 0 — `Math.max()` 는 -Infinity 를 준다', () => {
    expect(summarizeLevels([]).maxLv).toBe(0)
    expect(summarizeLevels([]).totalExp).toBe(0)
  })
})
