import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as Core from './core'

/**
 * 이 저장소에서 유일하게 **모듈을 모킹하는** 테스트다.
 *
 * 로그아웃은 서버 호출이 실패해도 query 캐시를 비워야 한다. 그 실패 경로는
 * `USE_MOCK` 을 끄고 http 를 던지게 만들어야만 지나갈 수 있어서, `./core` 를
 * 부분 모킹한다 — `queryClient` 는 **진짜를 쓴다.** 가짜로 바꾸면 "비워졌다"는
 * 단언이 아무것도 증명하지 못한다.
 */
const post = vi.fn()

vi.mock('./core', async (importOriginal) => {
  const real = await importOriginal<typeof Core>()
  return { ...real, USE_MOCK: false, http: { ...real.http, post } }
})

const { logout } = await import('./auth')
const { queryClient } = await import('./core')

describe('logout', () => {
  beforeEach(() => {
    post.mockReset()
    queryClient.setQueryData(['dashboard'], { secret: '이전 사용자 데이터' })
  })

  it('성공하면 캐시를 비운다', async () => {
    post.mockResolvedValue(undefined)
    await logout()
    expect(queryClient.getQueryData(['dashboard'])).toBeUndefined()
  })

  /**
   * 회귀 방지. 서버가 500 을 주면 `queryClient.clear()` 에 도달하지 못했고,
   * `viewerStore.signOut` 은 finally 로 세션을 끊으므로 **로그아웃은 된 것처럼
   * 보이는데 이전 사용자의 캐시만 남았다.** 어드민은 스코프로 화면을 가르기
   * 때문에 그건 낡은 데이터가 아니라 권한 밖 데이터다.
   */
  it('서버가 실패해도 캐시를 비운다', async () => {
    post.mockRejectedValue(new Error('500'))
    await expect(logout()).rejects.toThrow('500')
    expect(queryClient.getQueryData(['dashboard'])).toBeUndefined()
  })
})
