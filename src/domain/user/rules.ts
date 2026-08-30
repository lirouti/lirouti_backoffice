/** 회원 도메인 규칙. */
import type { Social, User, UserStatus, Wallet } from './types'

export type UserFilter = {
  /** 닉네임·이메일 부분 일치 */
  q?: string
  social?: Social
  status?: UserStatus
  /**
   * 탈퇴 회원을 포함하는가.
   *
   * ⚠️ **기본은 제외다.** 탈퇴 계정은 개인정보가 지워지는 중이거나 이미 지워졌고,
   *    운영자가 평소에 보고 싶은 대상이 아니다. 보려면 명시적으로 켠다.
   */
  withLeft?: boolean
}

/**
 * 목록 필터. 빈 조건은 무시한다.
 *
 * ⚠️ **상태로 「탈퇴」 를 직접 고르면 `withLeft` 와 무관하게 보여 준다** — 탈퇴만 보려고
 *    고른 사람에게 "포함" 스위치를 또 켜라고 하면 화면이 빈 채로 남는다.
 */
export function filterUsers(list: User[], f: UserFilter): User[] {
  const q = f.q?.trim()
  return list.filter((u) => {
    if (u.status === 'LEFT' && !f.withLeft && f.status !== 'LEFT') return false
    if (f.social && u.social !== f.social) return false
    if (f.status && u.status !== f.status) return false
    if (q && !u.nick.includes(q) && !u.email.includes(q)) return false
    return true
  })
}

/** 보유 재화 합계. 화면에는 항상 나눠 보이지만 정렬·요약에는 합이 쓰인다 */
export const walletTotal = (w: Wallet): number => w.gem + w.topaz

/**
 * 제재를 걸거나 풀었을 때의 다음 상태.
 *
 * ⚠️ **탈퇴 계정은 제재할 수 없다.** 이미 떠난 계정에 제재를 걸면 상태가 되살아난 것처럼
 *    보이고, 푸는 순간 「정상」 이 되어 **탈퇴가 취소된 것처럼** 읽힌다.
 *
 * ⚠️ **제재를 풀면 「정상」 이다** — 휴면이었는지 아닌지는 모른다(휴면은 접속 기록이
 *    정하는 파생 상태고, 우리는 그 기록을 갖고 있지 않다). 다음 접속에 서버가 다시 정한다.
 */
export function nextBanStatus(u: User, ban: boolean): UserStatus {
  if (u.status === 'LEFT') return 'LEFT'
  return ban ? 'BANNED' : 'ACTIVE'
}

/** 제재를 걸거나 풀 수 있는가. 탈퇴 계정은 대상이 아니다 */
export const canBan = (u: User): boolean => u.status !== 'LEFT'

/** 목록 위 지표 넷 */
export type UserSummary = {
  /** 탈퇴를 뺀 전체 */
  total: number
  paying: number
  banned: number
}

export function summarize(list: User[]): UserSummary {
  const live = list.filter((u) => u.status !== 'LEFT')
  return {
    total: live.length,
    paying: live.filter((u) => u.paid > 0).length,
    banned: live.filter((u) => u.status === 'BANNED').length,
  }
}
