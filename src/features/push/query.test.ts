/** 알림 재발송 URL과 초안 범위가 서로 어긋나지 않는지 확인한다. */
import { describe, expect, it } from 'vitest'

import { pushDraftScope, pushEditorKey, pushSourceFrom } from './query'

describe('푸시 재발송 query', () => {
  it('from을 복사 원본으로 읽는다', () => {
    expect(pushSourceFrom(new URLSearchParams('from=4'))).toBe('4')
    expect(pushSourceFrom(new URLSearchParams())).toBe('')
  })

  it('일반 작성과 원본별 재발송 초안을 나눈다', () => {
    expect(pushDraftScope('')).toBe('push:new')
    expect(pushDraftScope('4')).toBe('push:resend:4')
    expect(pushDraftScope('7')).toBe('push:resend:7')
  })

  // 이 scope를 편집기 key로도 쓴다. 같아지면 이전 폼 state가 다음 원본으로 넘어간다.
  it('⚠️ A → B → 일반 작성은 서로 다른 편집기와 초안 칸을 쓴다', () => {
    const transitions = ['4', '7', ''].map(pushEditorKey)

    expect(new Set(transitions).size).toBe(3)
    expect(transitions).toEqual(['push:resend:4', 'push:resend:7', 'push:new'])
    expect(transitions).toEqual(['4', '7', ''].map(pushDraftScope))
  })
})
