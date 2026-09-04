/**
 * 1:1 문의 목 데이터. 디자인 원본 `QROWS` 14행을 옮겼다.
 *
 * ⚠️ **작성자를 실제 회원에 붙였다.** 원본은 `solbi_92 · u_10248` 같은 이름을 쓰는데
 *    회원 목록에 없는 사람이라, 상세의 「작성자」 패널이 **아무 회원과도 대응되지
 *    않는 값**을 보여 준다 (docs/ARCHITECTURE.md §28.2).
 *
 * ⚠️ **대기 시간도 박아 두지 않는다.** 원본의 `'4시간'` 은 문자열이라 시간이 지나도
 *    그대로다 — 접수 시각에서 계산한다.
 */
import { daysAgo } from '@/shared/lib/today'

import type { Inquiry, InquiryCategory, InquiryMessage, InquiryStatus } from '@/domain/inquiry'

import { allUsers } from './users'

/** 분류별 유저의 첫 마디. 원본이 분류로 갈라 두었다 */
const OPENING: Record<InquiryCategory, string> = {
  버그: '며칠 전부터 계속 같은 화면만 나옵니다. 앱을 지우고 다시 깔아도 그대로예요.',
  결제: '결제 내역에는 남아 있는데 앱에는 반영이 안 됐습니다. 영수증 번호도 같이 보냅니다.',
  캐릭터: '분명히 착용은 됐다고 나오는데 화면에서는 안 보입니다. 스크린샷 첨부합니다.',
  계정: '예전에 쓰던 캐릭터를 되찾고 싶습니다. 어떻게 해야 하나요?',
  챌린지: '어제까지 분명히 이어졌는데 오늘 보니 1일로 돌아가 있습니다.',
  기타: '기능 관련해서 문의드립니다. 확인 부탁드립니다.',
}

const ANSWER =
  '문의 주신 내용 확인했습니다.\n말씀하신 증상은 앱 버전 2.4.1에서 보고된 것으로, 다음 업데이트에서 수정될 예정입니다.\n불편을 드려 죄송하며, 보상으로 젬 200개를 지급했습니다.'

const REOPEN = '답변 감사합니다. 그런데 여전히 같은 증상이 나타납니다. 다시 확인 부탁드립니다.'

type Row = [
  category: InquiryCategory,
  title: string,
  /** 며칠 전 접수인가 */
  ago: number,
  /** `HH:mm` */
  time: string,
  status: InquiryStatus,
  assignee: string,
  reopened: boolean,
  /** 첫 답변까지 걸린 시간(분). 아직이면 0 */
  answeredInMin: number,
]

// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const ROWS: Row[] = [
  ['버그', '알이 3일째 부화하지 않아요', 0, '09:14', '대기', '', false, 0],
  ['결제', '젬 1800개 결제했는데 안 들어왔어요', 0, '08:02', '대기', '', false, 0],
  ['캐릭터', '조끼를 입혔는데 날개가 안 보여요', 0, '07:41', '대기', '', false, 0],
  // ⚠️ **재문의는 답변 이력이 있어야 한다.** 답을 받은 적 없는데 다시 물을 수는 없다 (§28.1).
  ['계정', '기기를 바꿨는데 캐릭터가 사라졌어요', 1, '21:30', '대기', '이CS', true, 96],
  ['챌린지', '7일 연속 출석이 초기화됐습니다', 1, '19:12', '보류', '박라이브', false, 0],
  ['결제', '환불 요청합니다', 1, '15:44', '답변완료', '이CS', false, 128],
  ['캐릭터', '성좌의 로브 오라가 안 나와요', 1, '11:20', '답변완료', '김운영', false, 214],
  ['기타', '친구 초대 코드가 안 먹혀요', 2, '22:05', '답변완료', '이CS', false, 342],
  ['버그', '보금자리에서 화분이 안 보입니다', 2, '18:33', '답변완료', '김운영', false, 176],
  ['계정', '닉네임을 바꾸고 싶어요', 2, '14:10', '답변완료', '이CS', false, 92],
  ['챌린지', '시즌 도감 진행도가 멈췄어요', 3, '20:47', '답변완료', '박라이브', true, 405],
  ['결제', '스타터 팩 두 번 결제됐습니다', 3, '16:22', '답변완료', '이CS', false, 251],
  ['기타', '이모티콘 추가 요청', 4, '13:05', '답변완료', '김운영', false, 488],
  ['캐릭터', '튜브 착용 시 발이 잘려요', 5, '10:41', '답변완료', '김운영', false, 163],
]

/** `YYYY-MM-DD HH:mm` 에 분을 더한다. 날짜를 넘어가면 다음 날로 */
function addMinutes(at: string, minutes: number): string {
  const [d, t] = at.split(' ')
  const [y, mo, dd] = d!.split('-').map(Number)
  const [h, mi] = t!.split(':').map(Number)
  const ms = Date.UTC(y!, mo! - 1, dd!, h!, mi!) + minutes * 60_000
  return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
}

const INQUIRIES: Inquiry[] = ROWS.map(
  ([category, title, ago, time, status, assignee, reopened, answeredInMin], key) => {
    const at = `${daysAgo(ago)} ${time}`
    const answeredAt = answeredInMin > 0 ? addMinutes(at, answeredInMin) : ''
    // 회원 목록을 돌려 쓴다 — 상세의 「작성자」 가 실재하는 사람이어야 한다.
    const user = allUsers()[key % allUsers().length]!
    const messages: InquiryMessage[] = [
      { from: 'user', name: user.nick, at, text: OPENING[category] },
    ]
    if (answeredAt) {
      // ⚠️ **탈퇴한 뒤에는 알림이 못 간다.** 파사드가 새 답변에 거는 규칙(§28.4)을
      //    씨앗 데이터에도 똑같이 건다 — 한쪽만 지키면 화면이 스스로 모순된다.
      //    탈퇴 **전에** 답한 것은 갔다. 그래서 상태가 아니라 시점을 비교한다.
      const notified = user.leftAt === '' || answeredAt < user.leftAt
      messages.push({
        from: 'admin',
        name: `${assignee} · 운영팀`,
        at: answeredAt,
        text: ANSWER,
        notified,
      })
    }
    if (reopened && answeredAt) {
      // ⚠️ **재문의는 답변 뒤 · 지금 앞**이어야 한다. 미래 시각이면 대기 시간이 0 이 된다.
      messages.push({
        from: 'user',
        name: user.nick,
        at: addMinutes(answeredAt, 180),
        text: REOPEN,
      })
    }
    return {
      key,
      code: `Q-${3001 + key}`,
      category,
      title,
      userKey: user.key,
      at,
      status,
      assignee,
      reopened,
      answeredAt,
      messages,
    }
  },
)

export const allInquiries = (): Inquiry[] => INQUIRIES

/**
 * 답변을 붙이고 완료로 바꾼다.
 *
 * ⚠️ **`answeredAt` 은 첫 답변 때만 찍는다.** 재문의에 다시 답할 때 갱신하면
 *    「첫 응답까지 걸린 시간」 이 계속 줄어 지표가 좋아 보인다 (§28.1).
 */
export function replyToInquiry(
  key: number,
  text: string,
  by: string,
  at: string,
  notified: boolean,
): Inquiry | undefined {
  const found = INQUIRIES.find((i) => i.key === key)
  if (!found) return undefined
  found.messages = [
    ...found.messages,
    { from: 'admin', name: `${by} · 운영팀`, at, text, notified },
  ]
  found.status = '답변완료'
  found.assignee = by
  if (!found.answeredAt) found.answeredAt = at
  return found
}

/** 보류로 넘긴다 */
export function holdInquiry(key: number, by: string): Inquiry | undefined {
  const found = INQUIRIES.find((i) => i.key === key)
  if (!found) return undefined
  found.status = '보류'
  found.assignee = by
  return found
}
