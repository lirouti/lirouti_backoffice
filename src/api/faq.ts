/**
 * FAQ 파사드.
 *
 * **순서가 곧 앱 노출 순서**라, 목록은 거르기 전 전체 순서를 그대로 준다.
 * 분류 탭은 화면이 거른다 — 거른 상태에서 순서를 바꾸면 안 보이는 항목과의
 * 상대 순서를 알 수 없다 (docs/ARCHITECTURE.md §27.2).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { summarizeFaqs, type Faq, type FaqInput, type FaqSummary } from '@/domain/faq'

import { allFaqs, removeFaq, saveFaqOrder, setFaqVisible, upsertFaq } from '@/mocks/faq'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export type FaqsResult = {
  faqs: Faq[]
  summary: FaqSummary
}

export async function getFaqs(): Promise<FaqsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const faqs = allFaqs()
    return { faqs, summary: summarizeFaqs(faqs) }
  }

  // TODO(백엔드 스펙 확정 후): http.get<FaqDto[]>('/admin/support/faq')
  throw new Error('FAQ API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useFaqs() {
  return useQuery({ queryKey: qk.faq.list(), queryFn: getFaqs })
}

export async function getFaq(faqId: string): Promise<Faq> {
  if (USE_MOCK) {
    await mockDelay()
    const found = allFaqs().find((f) => String(f.key) === faqId)
    if (!found) throw apiError('http', `FAQ #${faqId} 을(를) 찾을 수 없습니다.`, 404)
    return found
  }

  throw new Error('FAQ API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/** ⚠️ 빈 id 면 부르지 않는다 — 등록 화면이 같은 컴포넌트다 (§20.6) */
export function useFaq(faqId: string) {
  return useQuery({ queryKey: ['faq', 'detail', faqId], queryFn: () => getFaq(faqId), enabled: faqId !== '' })
}

export type SaveFaqVars = { input: FaqInput; faqId?: number }

export async function saveFaq({ input, faqId }: SaveFaqVars): Promise<Faq> {
  if (USE_MOCK) {
    await mockDelay()
    if (!input.question.trim()) throw apiError('http', '질문을 입력하세요.', 400)
    // ⚠️ 답변이 비면 앱에 빈 칸이 나간다 — 눌러 봤는데 아무것도 없는 FAQ 다.
    if (!input.answer.trim()) throw apiError('http', '답변을 입력하세요.', 400)
    return upsertFaq(input, faqId)
  }

  throw new Error('FAQ API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveFaq() {
  return useMutation({
    mutationFn: saveFaq,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.faq.all }),
  })
}

export async function reorderFaqs(keys: number[]): Promise<Faq[]> {
  if (USE_MOCK) {
    await mockDelay()
    return saveFaqOrder(keys)
  }

  throw new Error('FAQ API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useReorderFaqs() {
  return useMutation({
    mutationFn: reorderFaqs,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.faq.all }),
  })
}

export type ToggleFaqVars = { faqId: number; visible: boolean }

/**
 * 앱 노출을 켜고 끈다.
 *
 * **끄는 것은 지우는 것이 아니다** — 답변 템플릿으로는 계속 쓸 수 있다(§27.1).
 * 그래서 확인 창 없이 바로 반영한다.
 */
export async function toggleFaq({ faqId, visible }: ToggleFaqVars): Promise<Faq> {
  if (USE_MOCK) {
    await mockDelay()
    const saved = setFaqVisible(faqId, visible)
    if (!saved) throw apiError('http', `FAQ #${faqId} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  throw new Error('FAQ API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useToggleFaq() {
  return useMutation({
    mutationFn: toggleFaq,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.faq.all }),
  })
}

/** ⚠️ **지우면 답변 템플릿에서도 사라진다.** 화면이 확인 창을 받는다 */
export async function deleteFaq(faqId: number): Promise<void> {
  if (USE_MOCK) {
    await mockDelay()
    if (!removeFaq(faqId)) throw apiError('http', `FAQ #${faqId} 을(를) 찾을 수 없습니다.`, 404)
    return
  }

  throw new Error('FAQ API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useDeleteFaq() {
  return useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.faq.all }),
  })
}
