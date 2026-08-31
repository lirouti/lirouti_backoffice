/** 1:1 문의 규칙. */
import type { Inquiry, InquiryCategory, InquiryStatus } from './types'

/** 이 시간을 넘기면 답이 늦은 것으로 본다 */
export const SLA_HOURS = 12

/** 아직 답을 못 한 건인가 */
export const isOpen = (status: InquiryStatus): boolean => status !== '답변완료'

/** `YYYY-MM-DD HH:mm` → 분. 못 읽으면 `null` */
export function minutesOf(at: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(at)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number]
  if (h > 23 || mi > 59) return null
  const t = Date.UTC(y, mo - 1, d, h, mi)
  // 달력에 없는 날(2월 30일)은 다른 날로 넘어간다 — 그건 시각이 아니다.
  const back = new Date(t)
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  return t / 60_000
}

/** 유저가 마지막으로 말한 시각. 없으면 접수 시각 */
export function lastAskedAt(inq: Inquiry): string {
  const asked = inq.messages.filter((m) => m.from === 'user')
  return asked.at(-1)?.at ?? inq.at
}

/**
 * 첫 응답까지 걸린 시간(분). **아직 한 번도 안 답했으면 `null`.**
 *
 * ⚠️ **재문의에 다시 답할 때 갱신하지 않는다.** 갱신하면 「첫 응답까지」 가 계속
 *    줄어 SLA 지표가 저절로 좋아진다 (docs/ARCHITECTURE.md §28.1).
 */
export function firstResponseMinutes(inq: Inquiry): number | null {
  if (!inq.answeredAt) return null
  const from = minutesOf(inq.at)
  const to = minutesOf(inq.answeredAt)
  if (from === null || to === null) return null
  return Math.max(0, to - from)
}

/**
 * 화면의 「대기」 열에 찍는 시간(분).
 *
 * | 상태 | 무엇을 재는가 |
 * |---|---|
 * | 열린 건 | **마지막 유저 말 → 지금.** 지금 얼마나 기다리게 하고 있는가 |
 * | 끝난 건 | 접수 → 첫 답변. 얼마 만에 답했는가 |
 *
 * ⚠️ **끝난 건에 「지금까지」 를 재면 안 된다** — 어제 답한 문의가 오늘도 계속 늘어난다.
 * ⚠️ **재문의로 다시 열린 건을 접수 시각부터 재면 안 된다** — 이미 답한 시간까지
 *    합쳐져, 답을 늦게 준 것처럼 보인다 (§28.1).
 *
 * @param now `YYYY-MM-DD HH:mm`
 */
export function waitMinutes(inq: Inquiry, now: string): number | null {
  if (!isOpen(inq.status)) return firstResponseMinutes(inq)
  const from = minutesOf(lastAskedAt(inq))
  const to = minutesOf(now)
  if (from === null || to === null) return null
  return Math.max(0, to - from)
}

/** `320` → `5시간 20분`. 한 시간 미만이면 분만 */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}분`
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

/**
 * 답이 늦은 건인가.
 *
 * ⚠️ **「보류」 는 빼지 않는다.** 개발 확인을 기다리는 것도 유저에게는 기다림이다 —
 *    빼면 보류로 넘긴 문의가 지표에서 사라져 잊힌다 (§28.1).
 */
export function isOverdue(inq: Inquiry, now: string): boolean {
  if (!isOpen(inq.status)) return false
  const waited = waitMinutes(inq, now)
  return waited !== null && waited >= SLA_HOURS * 60
}

export const INQUIRY_TABS = ['전체', '대기', '보류', '답변완료'] as const
export type InquiryTab = (typeof INQUIRY_TABS)[number]

export type InquiryFilter = {
  tab?: InquiryTab
  category?: InquiryCategory
  /** 제목 · 담당자 부분 일치 */
  q?: string
}

export function filterInquiries(list: Inquiry[], f: InquiryFilter): Inquiry[] {
  const q = f.q?.trim()
  return list.filter((inq) => {
    if (f.tab && f.tab !== '전체' && inq.status !== f.tab) return false
    if (f.category && inq.category !== f.category) return false
    if (q && !inq.title.includes(q) && !inq.assignee.includes(q)) return false
    return true
  })
}

/** 목록 위 지표 */
export type InquirySummary = {
  /** 아직 답을 못 한 건 (대기 + 보류) */
  open: number
  /** 그중 SLA 를 넘긴 건 */
  overdue: number
  /** 오늘 들어온 건 */
  today: number
  /** 평균 응답 시간(분). 답변한 건이 없으면 `null` */
  avgResponse: number | null
  /** 재문의 비율 (%) */
  reopenRate: number
}

/**
 * @param now `YYYY-MM-DD HH:mm`
 */
export function summarizeInquiries(list: Inquiry[], now: string): InquirySummary {
  const answered = list.filter((inq) => inq.answeredAt !== '')
  // 평균 응답은 **첫 응답까지** 다. 재문의로 다시 열린 건도 첫 답변은 있었다.
  const spent = answered.flatMap((inq) => {
    const m = firstResponseMinutes(inq)
    return m === null ? [] : [m]
  })
  return {
    open: list.filter((inq) => isOpen(inq.status)).length,
    overdue: list.filter((inq) => isOverdue(inq, now)).length,
    today: list.filter((inq) => inq.at.startsWith(now.slice(0, 10))).length,
    avgResponse:
      spent.length === 0 ? null : Math.round(spent.reduce((a, b) => a + b, 0) / spent.length),
    // 재문의는 답변이 문제를 못 풀었다는 신호다. 답한 건 중에서만 셀 수 있다.
    reopenRate:
      answered.length === 0
        ? 0
        : Math.round((answered.filter((inq) => inq.reopened).length / answered.length) * 100),
  }
}

/** 답변을 보낼 수 있는가. **이미 답한 건도 다시 보낼 수 있다** — 재문의가 그 자리다 */
export const canReply = (status: InquiryStatus): boolean => status !== '보류'

/** 보류로 넘길 수 있는가 */
export const canHold = (status: InquiryStatus): boolean => status === '대기'

/** 어느 칸이 왜 막혔는가 */
export type ReplyErrors = { text?: string }

/**
 * ⚠️ **빈 답변을 보내면 유저에게 빈 알림이 간다.** 되돌릴 수 없다.
 */
export function validateReply(text: string): ReplyErrors {
  const errors: ReplyErrors = {}
  if (!text.trim()) errors.text = '답변 내용을 입력하세요.'
  return errors
}

/** 같은 사람이 보낸 다른 문의. **최근 것부터** */
export function pastInquiries(list: Inquiry[], inq: Inquiry): Inquiry[] {
  return list
    .filter((x) => x.userKey === inq.userKey && x.key !== inq.key)
    .sort((a, b) => b.at.localeCompare(a.at))
}
