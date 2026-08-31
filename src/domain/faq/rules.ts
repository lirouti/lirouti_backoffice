/** FAQ 규칙. */
import type { Faq, FaqCategory, FaqInput } from './types'

/** 목록 탭 */
export const FAQ_TABS = ['전체', '계정', '결제', '캐릭터', '챌린지', '기타'] as const
export type FaqTab = (typeof FAQ_TABS)[number]

export function filterFaqs(list: Faq[], tab: FaqTab): Faq[] {
  if (tab === '전체') return list
  return list.filter((f) => f.category === (tab as FaqCategory))
}

/** 목록 위 지표 */
export type FaqSummary = {
  /** 앱에 보이는 수 */
  live: number
  total: number
  /**
   * 도움됨이 낮아 손봐야 하는 수. **노출 중인 것만** 센다 —
   * 이미 끈 것은 손볼 이유가 없다.
   */
  poor: number
}

/** 이 아래면 답이 문제를 못 풀어 주고 있다는 신호 */
export const POOR_HELPFUL = 60

export function summarizeFaqs(list: Faq[]): FaqSummary {
  return {
    live: list.filter((f) => f.visible).length,
    total: list.length,
    poor: list.filter((f) => f.visible && f.helpful < POOR_HELPFUL).length,
  }
}

/** 화면이 적은 쉼표 문자열 → 키워드 배열. 공백·중복을 버린다 */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  for (const piece of raw.split(',')) {
    const tag = piece.trim()
    if (tag) seen.add(tag)
  }
  return [...seen]
}

/** 저장된 배열 → 폼이 보여 줄 문자열 */
export const joinTags = (tags: string[]): string => tags.join(', ')

/** 어느 칸이 왜 막혔는가 */
export type FaqErrors = Partial<Record<'question' | 'answer', string>>

/**
 * 폼 검증.
 *
 * ⚠️ **답변이 비면 앱에 빈 칸이 나간다.** 질문만 있고 답이 없는 FAQ 는
 *    없는 것보다 나쁘다 — 눌러 봤는데 아무것도 없다.
 */
export function validateFaq(input: FaqInput): FaqErrors {
  const errors: FaqErrors = {}
  if (!input.question.trim()) errors.question = '질문을 입력하세요.'
  if (!input.answer.trim()) errors.answer = '답변을 입력하세요.'
  return errors
}

/**
 * 1:1 문의 답변에 끌어다 쓸 템플릿.
 *
 * ⚠️ **노출을 끈 것도 포함한다.** 앱에 안 보이는 것과 운영자가 답변에 못 쓰는 것은
 *    다른 말이다 — 「내부 안내용」 FAQ 가 그 자리다 (docs/ARCHITECTURE.md §27.1).
 */
export const replyTemplates = (list: Faq[]): Faq[] => list
