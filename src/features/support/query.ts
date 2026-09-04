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

export type FilteredInquiryUser = { nick: string; uid: string } | null | undefined

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

/** 회원 필터의 조회 상태를 거짓 없는 한 문장으로 바꾼다. */
export function inquiryScopeLabel(requestedUid: string, user: FilteredInquiryUser): string {
  if (user === undefined) return `${requestedUid} 회원 정보를 확인하는 중입니다.`
  if (user === null) return `회원을 찾을 수 없습니다. · ${requestedUid}`
  return `${user.nick} · ${user.uid} 회원의 문의만 보고 있습니다.`
}
