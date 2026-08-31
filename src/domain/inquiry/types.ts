/**
 * 1:1 문의.
 *
 * **답변은 앱 알림으로 나간다** — 보내면 유저 화면이 바뀐다. 되돌릴 수 없다.
 */
import type { User } from '../user/types'

export type InquiryCategory = '계정' | '결제' | '버그' | '캐릭터' | '챌린지' | '기타'

export const INQUIRY_CATEGORIES: InquiryCategory[] = [
  '계정',
  '결제',
  '버그',
  '캐릭터',
  '챌린지',
  '기타',
]

/**
 * 처리 상태.
 *
 * `보류` 는 **답을 못 하는 것이 아니라 미룬 것**이다 — 개발 확인이 필요할 때 쓴다.
 * 그래서 밀린 시간(SLA)에서는 빼지만 「답변 대기」 에서도 빼면 잊힌다 (docs/ARCHITECTURE.md §28.1).
 */
export type InquiryStatus = '대기' | '보류' | '답변완료'

/** 대화 한 줄 */
export type InquiryMessage = {
  /** 누가 썼는가 */
  from: 'user' | 'admin'
  /** 표시 이름. 운영자면 「김운영 · 운영팀」 */
  name: string
  /** `YYYY-MM-DD HH:mm` */
  at: string
  /** 여러 줄. 줄바꿈 그대로 보인다 */
  text: string
  /**
   * 이 답변이 **앱 알림으로도 나갔는가.** 운영자 답변에만 있다.
   *
   * ⚠️ **남겨야 한다.** 「알림 없이 남긴 답변」 은 유저가 못 볼 수도 있어서,
   *    나중에 「답을 안 줬다」 는 문의가 다시 올 때 근거가 된다
   *    (docs/ARCHITECTURE.md §28.4).
   */
  notified?: boolean
}

export type Inquiry = {
  key: number
  /** `Q-3001` — 유저에게 알려 주는 번호라 등폭으로 쓴다 */
  code: string
  category: InquiryCategory
  title: string
  /**
   * 보낸 회원. **`User['key']` 를 가리키기만 한다.**
   *
   * ⚠️ 닉네임·레벨을 여기 복사하면 회원이 바뀌었을 때 문의만 옛 값을 들고 있게 된다.
   */
  userKey: number
  /** 접수 시각 `YYYY-MM-DD HH:mm` */
  at: string
  status: InquiryStatus
  /** 담당 운영자. 아직 없으면 빈 문자열 */
  assignee: string
  /**
   * 답변을 받고도 다시 물어 온 건.
   *
   * ⚠️ **재문의는 답변이 문제를 못 풀었다는 신호다.** 건수보다 이 비율이 CS 품질을
   *    말한다.
   */
  reopened: boolean
  /** 처음 답변한 시각. 아직이면 빈 문자열 */
  answeredAt: string
  messages: InquiryMessage[]
}

/** 상세 화면이 옆에 띄우는, 이 문의를 보낸 사람 */
export type InquiryAuthor = {
  /** 회원 목록에서 찾은 사람. **탈퇴했거나 지워졌으면 `null`** */
  user: User | null
  /** 같은 사람이 보낸 다른 문의 */
  past: Inquiry[]
}
