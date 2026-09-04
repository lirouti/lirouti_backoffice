/** 공지 목 저장소 — 작성 결과가 목록 재조회에서도 유지되는지 고정한다. */
import { afterEach, describe, expect, it } from 'vitest'

import { addNotice, allNotices, resetNotices } from './ops'

describe('공지 목 저장소', () => {
  afterEach(resetNotices)

  it('작성한 공지를 목록 앞에 넣고 서버 필드를 채운다', () => {
    const before = allNotices()
    const added = addNotice({
      title: '  새 공지  ',
      body: '  본문입니다.  ',
      category: '점검',
      startAt: '2026-09-04',
      endAt: '',
      pinned: true,
    })

    expect(added).toMatchObject({ key: before.length, title: '새 공지', body: '본문입니다.', views: 0 })
    expect(allNotices()[0]).toEqual(added)
  })

  it('초기화하면 작성한 공지와 key를 함께 되돌린다', () => {
    const input = {
      title: '새 공지',
      body: '본문입니다.',
      category: '점검' as const,
      startAt: '2026-09-04',
      endAt: '',
      pinned: false,
    }
    addNotice(input)
    resetNotices()

    expect(allNotices()).toHaveLength(6)
    expect(addNotice(input).key).toBe(6)
  })
})
