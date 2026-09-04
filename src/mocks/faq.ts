/**
 * FAQ 목 데이터. 디자인 원본 `FROWS` 18행을 값 그대로 옮겼다.
 *
 * ⚠️ **노출 여부는 저장 필드다.** 원본은 `도움됨 >= 60` 이면 노출로 쳤는데, 그러면
 *    운영자가 끈 것과 점수가 낮은 것이 구분되지 않는다 (docs/ARCHITECTURE.md §27.1).
 *    아래에서 한 건만 일부러 꺼 두었다 — 「끔」 이 화면에 실제로 나타나야 한다.
 */
import { parseTags, type Faq, type FaqCategory, type FaqInput } from '@/domain/faq'

type Row = [
  category: FaqCategory,
  question: string,
  answer: string,
  views: number,
  /** 「도움이 됐어요」 비율 (%) */
  helpful: number,
  /** 문의 자동 추천에 쓰는 키워드 */
  tags: string[],
]

// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const ROWS: Row[] = [
  ['계정', '기기를 바꿨는데 캐릭터를 못 찾겠어요', '설정 › 계정 연동에서 기존에 쓰던 소셜 계정으로 로그인하면 캐릭터가 그대로 복구됩니다.\n연동한 계정이 기억나지 않으면 1:1 문의로 가입 시 쓴 이메일을 알려주세요.', 4820, 92, ['기기변경', '계정연동', '복구']],
  ['계정', '닉네임은 몇 번까지 바꿀 수 있나요', '30일에 한 번 무료로 바꿀 수 있습니다. 그 안에 다시 바꾸려면 젬 200개가 듭니다.', 2310, 88, ['닉네임', '변경']],
  ['계정', '계정을 삭제하면 캐릭터도 사라지나요', '네. 삭제 후 7일이 지나면 캐릭터와 보유 아이템이 모두 사라지고 복구할 수 없습니다.', 1180, 74, ['탈퇴', '삭제']],
  ['결제', '젬을 결제했는데 들어오지 않아요', '스토어 결제가 완료되고도 5분 안에 지급되지 않으면 앱을 완전히 종료한 뒤 다시 켜주세요.\n그래도 안 들어오면 영수증 번호와 함께 문의해 주세요.', 6140, 90, ['젬', '결제', '미지급']],
  ['결제', '환불은 어떻게 하나요', '결제는 앱스토어와 구글플레이를 통해 이뤄지므로 환불도 각 스토어에서 신청해야 합니다.\n이미 쓴 젬이 있으면 환불이 제한될 수 있습니다.', 3920, 68, ['환불', '스토어']],
  ['결제', '젬은 유효기간이 있나요', '없습니다. 결제한 젬은 계정이 살아 있는 동안 계속 남습니다.', 1540, 86, ['젬', '유효기간']],
  ['캐릭터', '알이 언제 부화하나요', '알을 받은 뒤 3일이 지나면 부화합니다. 그동안 하루 한 번 먹이를 주면 반나절 빨라집니다.', 8730, 94, ['알', '부화']],
  ['캐릭터', '옷을 입혔는데 날개가 안 보여요', '소매가 있는 옷은 날개를 감싸는 형태라 소매 안으로 들어갑니다. 조끼처럼 팔이 트인 옷을 입히면 날개가 그대로 보입니다.', 3410, 79, ['의상', '날개']],
  ['캐릭터', '같은 옷을 여러 캐릭터에 입힐 수 있나요', '네. 옷은 슬롯 단위라 종류와 상관없이 어느 캐릭터에나 그대로 적용됩니다.', 2870, 91, ['의상', '슬롯']],
  ['캐릭터', '둥지는 어떻게 바꾸나요', '둥지는 함께한 누적 일수로 자동으로 바뀝니다. 30일에 튼튼한 둥지, 100일에 보금자리가 됩니다.', 4260, 87, ['둥지', '해금']],
  ['챌린지', '일상 챌린지는 언제 초기화되나요', '매일 새벽 5시에 초기화됩니다. 주간 챌린지는 월요일 새벽 5시입니다.', 5510, 93, ['챌린지', '초기화']],
  ['챌린지', '출석 연속 일수가 끊겼어요', '새벽 5시를 넘겨 접속하면 전날 출석으로 잡히지 않습니다. 시차가 있는 지역에서 접속했는지 확인해 주세요.', 3080, 61, ['출석', '연속']],
  ['챌린지', '시즌이 끝나면 보상은 어떻게 되나요', '시즌 종료 시점에 받지 않은 보상은 우편함으로 들어가고, 우편함 보관 기간은 30일입니다.', 2640, 84, ['시즌', '보상', '우편함']],
  ['챌린지', '챌린지 목표를 채웠는데 달성이 안 돼요', '달성 판정은 최대 1분 걸립니다. 그 뒤에도 그대로면 진행도 화면을 새로 고쳐 보세요.', 1930, 58, ['챌린지', '달성']],
  ['기타', '친구 초대 코드는 어디에 있나요', '설정 › 친구에서 내 코드를 확인할 수 있습니다. 상대가 코드를 입력하면 양쪽 모두 젬 300개를 받습니다.', 3760, 89, ['친구', '초대코드']],
  ['기타', '알림을 끄고 싶어요', '설정 › 알림에서 종류별로 끌 수 있습니다. 문의 답변 알림은 따로 켜 두시길 권합니다.', 1420, 82, ['알림']],
  ['기타', '기종 사양이 어떻게 되나요', 'iOS 15 이상, Android 9 이상에서 동작합니다.', 890, 71, ['사양', '기기']],
  ['기타', '데이터를 얼마나 쓰나요', '실행 중에는 시간당 약 3MB를 씁니다. 배경과 의상은 처음 볼 때만 내려받습니다.', 740, 66, ['데이터', '용량']],]

/** 운영자가 일부러 내려 둔 것. **점수와 무관하다**는 것을 화면에서 보이게 한다 */
const HIDDEN_KEYS = [17]

/**
 * 전체 FAQ. **배열 순서가 곧 앱 노출 순서**다.
 *
 * ⚠️ 모듈 캐시라 새로고침하면 편집·순서가 사라진다 — 목이라서다.
 */
let FAQS: Faq[] = ROWS.map(([category, question, answer, views, helpful, tags], key) => ({
  key,
  category,
  question,
  answer,
  views,
  helpful,
  visible: !HIDDEN_KEYS.includes(key),
  tags,
}))

export const allFaqs = (): Faq[] => FAQS

/**
 * 순서를 통째로 저장한다.
 *
 * ⚠️ **목록에 없는 key 는 버리고 빠진 것은 뒤에 붙인다.** 저장하다 항목이
 *    사라지면 안 된다 — 그사이 남이 등록했을 수 있다.
 */
export function saveFaqOrder(keys: number[]): Faq[] {
  const byKey = new Map(FAQS.map((f) => [f.key, f]))
  const ordered = keys.flatMap((k) => {
    const hit = byKey.get(k)
    return hit ? [hit] : []
  })
  const rest = FAQS.filter((f) => !keys.includes(f.key))
  FAQS = [...ordered, ...rest]
  return FAQS
}

export function setFaqVisible(key: number, visible: boolean): Faq | undefined {
  const found = FAQS.find((f) => f.key === key)
  if (!found) return undefined
  found.visible = visible
  return found
}

let nextKey = ROWS.length

/**
 * 등록(`key` 없음) 또는 수정.
 *
 * ⚠️ **없는 `key` 로 부르면 `undefined` 다.** 새로 만들지 않는다 — 다른 탭에서 지운 뒤
 *    열어 둔 편집 화면에서 저장하면 **의도하지 않은 FAQ 가 생긴다**
 *    (docs/ARCHITECTURE.md §27.5).
 */
export function upsertFaq(input: FaqInput, key?: number): Faq | undefined {
  const patch = {
    category: input.category,
    question: input.question.trim(),
    answer: input.answer.trim(),
    visible: input.visible,
    tags: parseTags(input.tags),
  }
  if (key !== undefined) {
    const found = FAQS.find((f) => f.key === key)
    return found ? Object.assign(found, patch) : undefined
  }
  // 새 FAQ 는 조회·도움됨이 없다. 화면은 0 이 아니라 「—」 로 그린다.
  const created: Faq = { key: nextKey, views: 0, helpful: 0, ...patch }
  nextKey += 1
  FAQS = [...FAQS, created]
  return created
}

export function removeFaq(key: number): boolean {
  const before = FAQS.length
  FAQS = FAQS.filter((f) => f.key !== key)
  return FAQS.length < before
}
