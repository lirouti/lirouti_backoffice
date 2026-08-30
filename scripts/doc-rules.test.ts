/**
 * 문서 검사 판정 (docs/ARCHITECTURE.md §17.10).
 *
 * 여기가 틀리면 **검사가 조용히 무의미해진다** — 없는 오류를 만들면 사람이 검사를
 * 끄게 되고, 있는 오류를 놓치면 애초에 만든 이유가 사라진다.
 */
import { describe, expect, it } from 'vitest'

import {
  badCalls,
  callExamples,
  countArgs,
  danglingSections,
  duplicateSections,
  filePathRefs,
  sectionNumbers,
  type Arity,
} from './doc-rules'

describe('countArgs', () => {
  it('빈 것은 0, 쉼표로 나뉜 것은 그 수', () => {
    expect(countArgs('')).toBe(0)
    expect(countArgs('  ')).toBe(0)
    expect(countArgs('a')).toBe(1)
    expect(countArgs('a, b, c')).toBe(3)
  })

  // 쉼표로 그냥 자르면 객체 안의 쉼표까지 세어 **없는 오류를 만든다.**
  // 실제로 `saveItem({ itemId, input })` 이 2개로 세어졌다.
  it('⚠️ 객체·배열·중첩 호출 안의 쉼표는 세지 않는다', () => {
    expect(countArgs('{ itemId, input }')).toBe(1)
    expect(countArgs('[a, b], c')).toBe(2)
    expect(countArgs('f(a, b), c')).toBe(2)
    expect(countArgs('{ a: { b, c } }')).toBe(1)
  })

  it('⚠️ 문자열 안의 쉼표도 세지 않는다', () => {
    expect(countArgs("'a, b'")).toBe(1)
    expect(countArgs('"a, b", c')).toBe(2)
  })
})

describe('callExamples', () => {
  // 이 문서는 함수를 **이름으로 부를 때** 그 형태를 쓴다("`date()` 가 깨진 게 …").
  // 호출 예시로 다루면 오탐이 쏟아진다 — 실제로 6건 중 5건이 이것이었다.
  it('⚠️ 인자 없는 언급(`date()`)은 호출 예시가 아니다', () => {
    expect(callExamples('`date()` 가 깨졌다')).toEqual([])
  })

  it('인자가 있으면 잡고 개수를 센다', () => {
    const [c] = callExamples('파사드가 `summarize(all, today())` 로 낸다')
    expect(c).toMatchObject({ name: 'summarize', args: 2 })
  })

  it('한 줄에 여러 개가 있어도 각각 잡는다', () => {
    expect(callExamples('`f(a)` 와 `g(a, b)`').map((c) => c.name)).toEqual(['f', 'g'])
  })
})

describe('badCalls', () => {
  const sigs = new Map<string, Arity>([
    ['summarize', { req: 2, max: 2 }],
    ['topSelling', { req: 1, max: 2 }],
    ['spread', { req: 1, max: Infinity }],
  ])

  it('실제로 났던 어긋남을 잡는다', () => {
    const out = badCalls(callExamples('`summarize(all)`'), sigs)
    expect(out).toHaveLength(1)
    expect(out[0]!.why).toContain('2개')
  })

  it('맞으면 아무 말 안 한다', () => {
    expect(badCalls(callExamples('`summarize(all, today())`'), sigs)).toEqual([])
  })

  // 선택 인자를 안 넘긴 것은 오류가 아니다.
  it('⚠️ 선택 인자는 생략해도 된다', () => {
    expect(badCalls(callExamples('`topSelling(items)`'), sigs)).toEqual([])
    expect(badCalls(callExamples('`topSelling(items, 5)`'), sigs)).toEqual([])
  })

  it('⚠️ 나머지 인자는 몇 개든 받는다', () => {
    expect(badCalls(callExamples('`spread(a, b, c, d)`'), sigs)).toEqual([])
  })

  // 모르는 이름을 틀렸다고 말하면 문서에 쓰인 남의 API 가 전부 걸린다.
  it('⚠️ 모르는 함수는 건드리지 않는다', () => {
    expect(badCalls(callExamples('`useQuery(opts)`'), sigs)).toEqual([])
  })
})

describe('filePathRefs', () => {
  it('구체적인 파일 경로를 잡는다', () => {
    expect(filePathRefs('`src/domain/item/rules.ts` 에 있다').map((r) => r.path)).toEqual([
      'src/domain/item/rules.ts',
    ])
  })

  // 문서에는 실재하지 않는 이름이 정상적으로 쓰인다. 이것들을 오류로 만들면
  // 사람이 검사를 끈다.
  it('⚠️ 글롭과 자리표시자는 뺀다', () => {
    const md = '`src/api/*.ts` · `src/assets/{icons,images}/index.ts` · `src/features/<name>/Page.tsx`'
    expect(filePathRefs(md)).toEqual([])
  })

  it('⚠️ 디렉터리는 뺀다 — 아직 없는 것을 가리키는 경우가 있다', () => {
    expect(filePathRefs('`src/entities/` 는 아직 없다')).toEqual([])
  })
})

describe('sectionNumbers · danglingSections', () => {
  const md = ['## 9. 공용', '### 9.4 예산', '## 10. 권한'].join('\n')

  it('절 번호를 모은다', () => {
    expect(sectionNumbers(md)).toEqual(['9', '9.4', '10'])
  })

  it('있는 절을 가리키면 조용하다', () => {
    expect(danglingSections(`${md}\n\n자세한 건 §9.4 를 볼 것`)).toEqual([])
  })

  it('없는 절을 가리키면 잡는다', () => {
    expect(danglingSections(`${md}\n\n§99.9 를 볼 것`)).toHaveLength(1)
  })

  // 같은 참조가 열 번 나오면 열 줄이 찍혀 진짜 문제를 덮는다.
  it('⚠️ 같은 참조가 여러 번 나와도 한 번만 말한다', () => {
    expect(danglingSections(`${md}\n\n§99.9 · §99.9 · §99.9`)).toHaveLength(1)
  })
})

describe('duplicateSections', () => {
  it('같은 절 번호가 두 번 나오면 잡고, 앞의 줄을 알려 준다', () => {
    const md = ['### 9.4 예산', '본문', '### 9.4 또 다른 예산'].join('\n')
    const [issue] = duplicateSections(md)
    expect(issue!.why).toContain('1행')
  })

  it('번호가 다르면 조용하다', () => {
    expect(duplicateSections('### 9.4 가\n### 9.5 나')).toEqual([])
  })
})
