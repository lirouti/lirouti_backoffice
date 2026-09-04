/** 2단계 인증 복구가 화면 밖에서도 같은 안전 규칙과 변경 범위를 지키는지 확인한다. */
import { afterEach, describe, expect, it } from 'vitest'

import { findAdmin, setAdminMfa } from '@/mocks/admins'

import { requestPasswordReset, resetMfa } from './admins'

describe('requestPasswordReset', () => {
  it('없는 관리자에게는 메일을 보내지 않는다', async () => {
    await expect(requestPasswordReset(999999)).rejects.toThrow('찾을 수 없습니다.')
  })

  it('⚠️ 최초 로그인 전 계정은 초기화 대신 초대 링크를 쓴다', async () => {
    await expect(requestPasswordReset(7)).rejects.toThrow('초대 링크')
  })

  it('등록된 계정의 사내 이메일에는 초기화 메일을 보낼 수 있다', async () => {
    await expect(requestPasswordReset(2)).resolves.toBeUndefined()
  })
})

describe('resetMfa', () => {
  afterEach(() => setAdminMfa(2, '앱 OTP'))

  it('없는 관리자는 초기화하지 않는다', async () => {
    await expect(resetMfa({ adminId: 999999, meEmail: 'sky@riruti.co' })).rejects.toThrow(
      '찾을 수 없습니다.',
    )
  })

  it('⚠️ 자기 계정은 열린 세션만으로 초기화할 수 없다', async () => {
    await expect(resetMfa({ adminId: 2, meEmail: 'seojun@riruti.co' })).rejects.toThrow(
      '자기 계정',
    )
  })

  it('등록 상태만 지우고 나머지 계정 정보는 보존한다', async () => {
    const before = findAdmin(2)!

    await resetMfa({ adminId: 2, meEmail: 'sky@riruti.co' })

    expect(findAdmin(2)).toEqual({ ...before, mfa: '미설정' })
  })

  it('이미 미설정인 계정은 다시 초기화할 수 없다', async () => {
    setAdminMfa(2, '미설정')
    await expect(resetMfa({ adminId: 2, meEmail: 'sky@riruti.co' })).rejects.toThrow(
      '초기화할 2단계 인증이 없습니다.',
    )
  })
})
