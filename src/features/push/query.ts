/** 알림 작성 URL이 가리키는 복사 원본과 초안 칸을 정한다. */

/** `from`이 있으면 복사할 발송 기록 key를 돌려준다 */
export const pushSourceFrom = (params: URLSearchParams): string => (params.get('from') ?? '').trim()

/** 일반 작성과 원본별 재발송이 초안을 덮어쓰지 않게 칸을 나눈다 */
export const pushDraftScope = (sourceId: string): string =>
  sourceId ? `push:resend:${sourceId}` : 'push:new'

/** 원본 전환 때 이전 로컬 state를 버리도록 편집기 인스턴스를 가르는 key. */
export const pushEditorKey = (sourceId: string): string => pushDraftScope(sourceId)
