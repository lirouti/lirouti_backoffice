/**
 * 레벨 테이블 규칙 (docs/ARCHITECTURE.md §24).
 *
 * 여기가 틀리면 **표의 두 열이 서로 다른 말을 한다** — 운영자는 어느 쪽이 맞는지
 * 알 수 없고, 그 상수는 이미 그 레벨에 있는 회원에게 적용된다.
 */
import { describe, expect, it } from 'vitest'

import {
  applyLevelEdit,
  summarizeLevels,
  UNLOCK_MAX,
  levelDraftOf,
  toLevelInput,
  validateDraft,
  validateLevel,
  withTotals,
  type LevelSeed,
} from './rules'
import type { Level, LevelDraft, LevelInput } from './types'

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

describe('validateLevel', () => {
  const input = (over: Partial<LevelInput> = {}): LevelInput => ({
    need: 240,
    gem: 8,
    unlock: '둥지 2단계',
    ...over,
  })

  it('정상값은 통과', () => {
    expect(validateLevel(input())).toEqual({})
  })

  // 0 이면 그 레벨을 경험치 없이 지나가는데, 표에서는 누적이 안 는 것으로만 보인다.
  it('⚠️ 필요 경험치 0 은 막는다', () => {
    expect(validateLevel(input({ need: 0 })).need).toBeTruthy()
    expect(validateLevel(input({ need: -1 })).need).toBeTruthy()
    expect(validateLevel(input({ need: 1.5 })).need).toBeTruthy()
  })

  // 보상이 없는 레벨은 기획이 실제로 두는 값이다 — 「없음」 이 아니라 정말 0 개다.
  it('⚠️ 젬 보상 0 은 통과시킨다', () => {
    expect(validateLevel(input({ gem: 0 }))).toEqual({})
    expect(validateLevel(input({ gem: -1 })).gem).toBeTruthy()
  })

  it('해금은 비울 수 없고 길이 상한이 있다', () => {
    expect(validateLevel(input({ unlock: '   ' })).unlock).toBeTruthy()
    expect(validateLevel(input({ unlock: 'ㄱ'.repeat(UNLOCK_MAX + 1) })).unlock).toBeTruthy()
    expect(validateLevel(input({ unlock: 'ㄱ'.repeat(UNLOCK_MAX) }))).toEqual({})
  })
})

describe('applyLevelEdit', () => {
  const list = (): Level[] =>
    withTotals([
      { lv: 1, need: 100, gem: 5, unlock: '가', status: '적용' },
      { lv: 2, need: 200, gem: 6, unlock: '나', status: '적용' },
      { lv: 3, need: 300, gem: 7, unlock: '다', status: '적용' },
    ])

  // need 를 고치면 그 아래 모든 행의 누적이 움직인다 — 고친 행만 바꾸면 표가 어긋난다.
  it('⚠️ 아래 행의 누적이 전부 따라 움직인다', () => {
    const before = list().map((l) => l.total)
    expect(before).toEqual([100, 300, 600])

    const after = applyLevelEdit(list(), 2, { need: 500, gem: 6, unlock: '나' })
    expect(after.map((l) => l.total)).toEqual([100, 600, 900])
  })

  // 고친 채로 「적용」 이 남으면 검수를 건너뛴다.
  it('⚠️ 고친 행은 「검수 중」 으로 내려간다', () => {
    const after = applyLevelEdit(list(), 2, { need: 500, gem: 6, unlock: '나' })
    expect(after[1]!.status).toBe('검수 중')
    // 안 고친 행의 상태는 그대로다.
    expect(after[0]!.status).toBe('적용')
    expect(after[2]!.status).toBe('적용')
  })

  it('해금 문구의 앞뒤 공백을 떼고 저장한다', () => {
    const after = applyLevelEdit(list(), 1, { need: 100, gem: 5, unlock: '  가나  ' })
    expect(after[0]!.unlock).toBe('가나')
  })

  it('⚠️ 원본 배열을 건드리지 않는다', () => {
    const l = list()
    applyLevelEdit(l, 2, { need: 9999, gem: 0, unlock: 'x' })
    expect(l.map((x) => x.total)).toEqual([100, 300, 600])
    expect(l[1]!.status).toBe('적용')
  })

  it('없는 레벨이면 아무것도 바뀌지 않는다', () => {
    expect(applyLevelEdit(list(), 99, { need: 1, gem: 0, unlock: 'x' })).toEqual(list())
  })
})

describe('validateDraft', () => {
  const draft = (over: Partial<LevelDraft> = {}): LevelDraft => ({
    need: '240',
    gem: '8',
    unlock: '둥지 2단계',
    ...over,
  })

  it('정상값은 통과', () => {
    expect(validateDraft(draft())).toEqual({})
  })

  /*
    ⚠️ **`Number('')` 는 `0` 이다.** 숫자로 들고 있으면 「지웠다」 가 「0 으로 바꿨다」 가
       되는데, 젬 보상은 0 이 유효해서 **저장 버튼이 열린 채로 남는다** — 실제로 60 이
       0 으로 바뀌었다. 빈 칸은 값이 아니라 **아직 안 적은 것**이다.
  */
  it('⚠️ 빈 칸을 0 으로 읽지 않는다', () => {
    expect(validateDraft(draft({ gem: '' })).gem).toBe('젬 보상을 입력해 주세요.')
    expect(validateDraft(draft({ gem: '   ' })).gem).toBeTruthy()
    expect(validateDraft(draft({ need: '' })).need).toBe('필요 경험치를 입력해 주세요.')
  })

  // 빈 칸에 「1 이상이어야 한다」 고 하면 딴소리다 — 무엇을 하라는 말인지가 달라진다.
  it('⚠️ 빈 칸 오류가 값 오류를 덮는다', () => {
    expect(validateDraft(draft({ need: '' })).need).not.toContain('1 이상')
  })

  it('정수가 아니면 막는다 — 친 글자는 그대로 둔다', () => {
    expect(validateDraft(draft({ gem: '-5' })).gem).toBeTruthy()
    expect(validateDraft(draft({ gem: '1.5' })).gem).toBeTruthy()
    expect(validateDraft(draft({ need: 'abc' })).need).toBeTruthy()
  })

  // 같은 칸이 무엇을 치느냐에 따라 다른 하한을 말하면 안 된다 —
  // `abc` 에 「0 이상」 이라 해 놓고 `0` 을 치면 「1 이상」 이라고 하던 자리다.
  it('⚠️ 형식 오류와 값 오류가 같은 하한을 말한다', () => {
    expect(validateDraft(draft({ need: 'abc' })).need).toContain('1 이상')
    expect(validateDraft(draft({ need: '0' })).need).toContain('1 이상')
    expect(validateDraft(draft({ gem: 'abc' })).gem).toContain('0 이상')
    expect(validateDraft(draft({ gem: '-1' })).gem).toContain('0 이상')
  })

  it('젬 0 은 통과한다', () => {
    expect(validateDraft(draft({ gem: '0' }))).toEqual({})
  })

  it('값 검증도 그대로 걸린다', () => {
    expect(validateDraft(draft({ need: '0' })).need).toBeTruthy()
    expect(validateDraft(draft({ unlock: '  ' })).unlock).toBeTruthy()
  })
})

describe('levelDraftOf · toLevelInput', () => {
  it('뽑아서 그대로 되돌리면 제자리다', () => {
    const l = withTotals([{ lv: 1, need: 100, gem: 0, unlock: '가', status: '적용' }])[0]!
    expect(toLevelInput(levelDraftOf(l))).toEqual({ need: 100, gem: 0, unlock: '가' })
  })

  it('앞뒤 공백이 있어도 숫자로 읽는다', () => {
    expect(toLevelInput({ need: ' 100 ', gem: ' 0 ', unlock: 'x' })).toMatchObject({
      need: 100,
      gem: 0,
    })
  })
})
