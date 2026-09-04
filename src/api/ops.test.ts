/** 공지 작성 파사드가 화면 밖에서도 같은 검증과 서버 필드를 보장하는지 확인한다. */
import { afterEach, describe, expect, it } from 'vitest'

import { resetEvents, resetNotices } from '@/mocks/ops'

import { getEventFormData, saveEvent, saveNotice } from './ops'

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

describe('saveEvent', () => {
  afterEach(resetEvents)

  it('잘못된 입력은 목 저장소에도 넣지 않는다', async () => {
    await expect(saveEvent({
      title: '',
      desc: '설명',
      startAt: '2026-09-04',
      endAt: '',
      accent: '#2F7CEF',
      rewardItemKey: 0,
    })).rejects.toThrow('제목을 입력하세요.')
  })

  it('없는 보상 아이템은 저장 시점에 다시 막는다', async () => {
    await expect(saveEvent({
      title: '새 이벤트',
      desc: '설명',
      startAt: '2026-09-04',
      endAt: '',
      accent: '#2F7CEF',
      rewardItemKey: 999999,
    })).rejects.toThrow('없는 아이템입니다.')
  })

  it('검증을 통과하면 key와 참여자 수를 서버 값으로 채운다', async () => {
    const { itemOptions } = await getEventFormData()
    await expect(saveEvent({
      title: '새 이벤트',
      desc: '설명',
      startAt: '2026-09-04',
      endAt: '',
      accent: '#2F7CEF',
      rewardItemKey: itemOptions[0]!.key,
    })).resolves.toMatchObject({ key: 6, joined: 0 })
  })
})
