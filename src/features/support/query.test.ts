/** 회원 문의 연결이 새로고침 가능한 URL과 같은 필터를 쓰는지 확인한다. */
import { describe, expect, it } from 'vitest'

import { inquiriesQueryOf, inquiryScopeLabel, parseInquiryQuery } from './query'

describe('문의 목록 query', () => {
  it('회원 UID와 기존 필터를 함께 읽는다', () => {
    expect(parseInquiryQuery(new URLSearchParams('who=U-10240&tab=대기&cat=버그&q=부화'))).toEqual({
      filter: { tab: '대기', category: '버그', q: '부화' },
      userUid: 'U-10240',
    })
  })

  it('API query에도 회원 UID와 목록 필터를 함께 싣는다', () => {
    expect(inquiriesQueryOf(new URLSearchParams('who=U-10240&tab=대기'))).toEqual({
      tab: '대기',
      category: undefined,
      q: undefined,
      userUid: 'U-10240',
    })
  })

  it('모르는 탭·분류는 전체 조건으로 버린다', () => {
    expect(parseInquiryQuery(new URLSearchParams('tab=없음&cat=없음'))).toEqual({
      filter: { tab: '전체', category: undefined, q: undefined },
      userUid: '',
    })
  })

  it('⚠️ 존재하지 않는 UID를 실제 회원처럼 안내하지 않는다', () => {
    expect(inquiryScopeLabel('U-NOT-FOUND', null)).toBe(
      '회원을 찾을 수 없습니다. · U-NOT-FOUND',
    )
    expect(inquiryScopeLabel('U-10240', { nick: '소이', uid: 'U-10240' })).toBe(
      '소이 · U-10240 회원의 문의만 보고 있습니다.',
    )
  })
})
