/**
 * FAQ — 자주 묻는 질문.
 *
 * **두 곳에서 쓰인다.** 앱의 도움말 목록이자, 1:1 문의 답변의 템플릿이다.
 * 그래서 「앱에 노출」 을 꺼도 지우는 것이 아니다 — 답변에는 계속 쓸 수 있다.
 */

export type FaqCategory = '계정' | '결제' | '캐릭터' | '챌린지' | '기타'

export const FAQ_CATEGORIES: FaqCategory[] = ['계정', '결제', '캐릭터', '챌린지', '기타']

export type Faq = {
  key: number
  category: FaqCategory
  question: string
  /** 여러 줄. 앱에서 줄바꿈 그대로 보인다 */
  answer: string
  /** 앱에서 펼쳐 본 횟수 */
  views: number
  /**
   * 「도움이 됐어요」 비율 (%).
   *
   * ⚠️ **노출 여부를 이 값에서 유추하지 말 것.** 원본은 `help >= 60` 이면 노출로
   *    쳤는데, 그러면 **운영자가 끈 것과 점수가 낮은 것이 구분되지 않는다**
   *    (docs/ARCHITECTURE.md §27.1).
   */
  helpful: number
  /** 앱에 보이는가. **저장되는 값이다** */
  visible: boolean
  /**
   * 문의 자동 추천에 쓰는 키워드.
   *
   * 화면에서는 쉼표로 적지만 저장은 배열이다 — 「젬, 결제」 와 「젬,결제」 가
   * 다른 값이 되면 안 된다.
   */
  tags: string[]
}

/** 폼이 채우는 값. 조회수·도움됨은 집계라 서버가 갖는다 */
export type FaqInput = Pick<Faq, 'category' | 'question' | 'answer' | 'visible'> & {
  /** 화면이 적는 그대로. 저장할 때 배열로 쪼갠다 */
  tags: string
}
