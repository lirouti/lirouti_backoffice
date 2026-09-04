/** 문의 목록 URL을 화면과 API가 쓰는 필터로 바꾼다. */
import {
  INQUIRY_CATEGORIES,
  INQUIRY_TABS,
  type InquiryCategory,
  type InquiryFilter,
  type InquiryTab,
} from '@/domain/inquiry'

const isTab = (value: string | null): value is InquiryTab =>
  INQUIRY_TABS.some((tab) => tab === value)
const isCategory = (value: string | null): value is InquiryCategory =>
  INQUIRY_CATEGORIES.some((category) => category === value)

export type InquiryScreenQuery = {
  filter: InquiryFilter
  /** 회원 상세에서 넘어온 UID. 빈 값이면 전체 회원이다. */
  userUid: string
}

export function parseInquiryQuery(params: URLSearchParams): InquiryScreenQuery {
  const tab = params.get('tab')
  const category = params.get('cat')
  return {
    filter: {
      tab: isTab(tab) ? tab : '전체',
      category: isCategory(category) ? category : undefined,
      q: params.get('q') ?? undefined,
    },
    userUid: (params.get('who') ?? '').trim(),
  }
}

/** API 훅이 받는 평평한 query. */
export function inquiriesQueryOf(params: URLSearchParams): InquiryFilter & { userUid: string } {
  const parsed = parseInquiryQuery(params)
  return { ...parsed.filter, userUid: parsed.userUid }
}
