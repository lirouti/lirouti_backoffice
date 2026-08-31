/**
 * FAQ 규칙 (docs/ARCHITECTURE.md §27).
 *
 * 여기가 틀리면 **앱에 빈 답변이 나가거나**, 운영자가 끈 FAQ 와 점수가 낮은 FAQ 가
 * 구분되지 않는다.
 */
import { describe, expect, it } from 'vitest'

import {
  filterFaqs,
  isMeasured,
  needsWork,
  joinTags,
  parseTags,
  POOR_HELPFUL,
  replyTemplates,
  summarizeFaqs,
  validateFaq,
} from './rules'
import type { Faq, FaqInput } from './types'

const faq = (over: Partial<Faq> = {}): Faq => ({
  key: 0,
  category: '계정',
  question: '닉네임은 몇 번까지 바꿀 수 있나요',
  answer: '30일에 한 번 무료로 바꿀 수 있습니다.',
  views: 2310,
  helpful: 88,
  visible: true,
  tags: ['닉네임', '변경'],
  ...over,
})

const input = (over: Partial<FaqInput> = {}): FaqInput => ({
  category: '계정',
  question: '닉네임은 몇 번까지 바꿀 수 있나요',
  answer: '30일에 한 번 무료로 바꿀 수 있습니다.',
  visible: true,
  tags: '닉네임, 변경',
  ...over,
})

describe('filterFaqs', () => {
  const list = [faq({ key: 0, category: '계정' }), faq({ key: 1, category: '결제' })]

  it('분류로 거른다', () => {
    expect(filterFaqs(list, '결제').map((f) => f.key)).toEqual([1])
    expect(filterFaqs(list, '전체')).toHaveLength(2)
  })
})

describe('summarizeFaqs', () => {
  const list = [
    faq({ key: 0, visible: true, helpful: 92 }),
    faq({ key: 1, visible: true, helpful: 58 }),
    // 이미 끈 것은 손볼 이유가 없다.
    faq({ key: 2, visible: false, helpful: 12 }),
  ]

  it('노출 수와 전체 수', () => {
    const s = summarizeFaqs(list)
    expect([s.live, s.total]).toEqual([2, 3])
  })

  it('⚠️ 손봐야 할 것은 노출 중인 것만 센다', () => {
    expect(summarizeFaqs(list).poor).toBe(1)
  })

  it('경계값은 손볼 대상이 아니다', () => {
    expect(summarizeFaqs([faq({ helpful: POOR_HELPFUL })]).poor).toBe(0)
    expect(summarizeFaqs([faq({ helpful: POOR_HELPFUL - 1 })]).poor).toBe(1)
  })

  // 방금 등록한 FAQ 는 `views: 0 · helpful: 0` 이다. 이걸 낮은 점수로 세면
  // **등록하자마자 「손봐야 함」 에 잡힌다** — 화면은 같은 값을 「—」 로 그린다.
  it('⚠️ 아직 아무도 안 본 FAQ 는 손볼 대상이 아니다', () => {
    expect(summarizeFaqs([faq({ views: 0, helpful: 0 })]).poor).toBe(0)
  })
})

describe('isMeasured · needsWork', () => {
  it('한 번이라도 본 것만 잰 값이다', () => {
    expect(isMeasured(faq({ views: 0 }))).toBe(false)
    expect(isMeasured(faq({ views: 1 }))).toBe(true)
  })

  it('손볼 대상은 「노출 중 · 재 봤고 · 낮은 것」 셋을 다 만족한다', () => {
    expect(needsWork(faq({ visible: true, views: 100, helpful: 30 }))).toBe(true)
    expect(needsWork(faq({ visible: false, views: 100, helpful: 30 }))).toBe(false)
    expect(needsWork(faq({ visible: true, views: 0, helpful: 0 }))).toBe(false)
    expect(needsWork(faq({ visible: true, views: 100, helpful: 90 }))).toBe(false)
  })
})

describe('parseTags · joinTags', () => {
  it('쉼표로 나누고 공백·빈 값·중복을 버린다', () => {
    expect(parseTags(' 젬 , 결제 ,, 젬 ')).toEqual(['젬', '결제'])
  })

  it('비었으면 빈 배열', () => {
    expect(parseTags('  , ,')).toEqual([])
  })

  // 「젬, 결제」 와 「젬,결제」 가 다른 값이 되면 안 된다.
  it('⚠️ 왕복해도 같은 값이다', () => {
    expect(parseTags(joinTags(parseTags('젬,결제')))).toEqual(['젬', '결제'])
  })
})

describe('validateFaq', () => {
  it('제대로 채우면 통과', () => {
    expect(validateFaq(input())).toEqual({})
  })

  // 질문만 있고 답이 없는 FAQ 는 없는 것보다 나쁘다 — 눌러 봤는데 아무것도 없다.
  it('⚠️ 질문·답변은 필수 — 공백만 있는 것도 빈 것이다', () => {
    expect(validateFaq(input({ question: '  ' })).question).toBeTruthy()
    expect(validateFaq(input({ answer: '\n ' })).answer).toBeTruthy()
  })

  it('노출을 꺼도 저장은 된다 — 초안을 막지 않는다', () => {
    expect(validateFaq(input({ visible: false }))).toEqual({})
  })
})

describe('replyTemplates', () => {
  // 앱에 안 보이는 것과 운영자가 답변에 못 쓰는 것은 다른 말이다.
  it('⚠️ 노출을 끈 것도 답변 템플릿으로 쓸 수 있다', () => {
    const list = [faq({ key: 0, visible: true }), faq({ key: 1, visible: false })]
    expect(replyTemplates(list).map((f) => f.key)).toEqual([0, 1])
  })
})
