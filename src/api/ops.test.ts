/** 공지 작성 파사드가 화면 밖에서도 같은 검증과 서버 필드를 보장하는지 확인한다. */
import { afterEach, describe, expect, it } from 'vitest'

import { resetNotices } from '@/mocks/ops'

import { saveNotice } from './ops'

describe('saveNotice', () => {
  afterEach(resetNotices)

  it('잘못된 입력은 목 저장소에도 넣지 않는다', async () => {
    await expect(saveNotice({
      title: '',
      body: '본문',
      category: '점검',
      startAt: '2026-09-04',
      endAt: '',
      pinned: false,
    })).rejects.toThrow('제목을 입력하세요.')
  })

  it('검증을 통과하면 key와 조회수를 서버 값으로 채운다', async () => {
    await expect(saveNotice({
      title: '새 공지',
      body: '본문',
      category: '점검',
      startAt: '2026-09-04',
      endAt: '',
      pinned: false,
    })).resolves.toMatchObject({ key: 6, views: 0 })
  })
})
