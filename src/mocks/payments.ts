/**
 * 결제 목 데이터. 디자인 원본 `PAYS` 12행을 값 그대로 옮겼다.
 *
 * 원본 행은 `[일시, 주문번호, 회원, 상품, 금액, 결제사, 상태, 지급량, 보너스,
 * 유상잔액, 미사용유상]` 이다.
 */
import { daysAgo } from '@/shared/lib/today'

import { canRefund, type PayStatus, type Payment, type Pg } from '@/domain/payment'

type Row = [
  /** 며칠 전인가. **날짜를 박아 두면 「오늘 결제」 가 영원히 0 이 된다** (아래 ⚠️) */
  daysAgo: number,
  /** `HH:mm` */
  time: string,
  /** 일련번호만. 날짜는 `at` 과 같은 날로 붙인다 — 어긋나면 가짜로 보인다 */
  seq: string,
  who: string,
  product: string,
  amount: number,
  pg: '토스' | '카카오페이',
  status: '완료' | '준비' | '실패',
  give: number,
  bonus: number,
  /** **회원 전체**의 미사용 유상. 결제별 잔여로 나누는 것은 아래 `spread` 가 한다 */
  memberUnused: number,
]

// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const ROWS: Row[] = [
  [0, '09:12', '9921', '소이', '파란보석 1,100개', 12100, '토스', '완료', 1000, 100, 1200],
  [0, '08:41', '9918', '새벽러너', '파란보석 10,000개+보너스', 110000, '카카오페이', '완료', 10000, 1500, 2900],
  [0, '07:55', '9902', '민트초코', '파란보석 300개', 3300, '토스', '준비', 300, 0, 800],
  [1, '22:30', '8874', '밤톨', '파란보석 500개', 5500, '토스', '완료', 500, 30, 500],
  [1, '18:40', '8841', '소이', '파란보석 1,100개', 12100, '카카오페이', '완료', 1000, 100, 1200],
  [1, '14:02', '8820', '버들', '파란보석 3,000개', 33000, '토스', '완료', 3000, 300, 900],
  [1, '11:18', '8807', '모카', '파란보석 100개', 1100, '토스', '실패', 100, 0, 100],
  [2, '20:44', '7793', '해든', '파란보석 300개', 3300, '카카오페이', '준비', 300, 0, 0],
  [2, '16:09', '7761', '하루뭉치', '파란보석 500개', 5500, '토스', '완료', 500, 30, 300],
  [2, '09:33', '7740', '도토리', '파란보석 100개', 1100, '토스', '완료', 100, 0, 0],
  [3, '21:57', '6688', '새벽러너', '파란보석 3,000개', 33000, '카카오페이', '완료', 3000, 300, 2900],
  [3, '13:20', '6650', '콩순이', '파란보석 100개', 1100, '토스', '실패', 100, 0, 0],
]

/** 원본이 닉네임 → 이메일 표를 따로 들고 있다 */
const EMAILS: Record<string, string> = {
  소이: 'soi@kakao.com',
  하루뭉치: 'haru.m@gmail.com',
  도토리: 'dotori@kakao.com',
  민트초코: 'mint@gmail.com',
  새벽러너: 'dawn@kakao.com',
  콩순이: 'kong@kakao.com',
  밤톨: 'bamtol@gmail.com',
  모카: 'mocha@gmail.com',
  버들: 'beodeul@kakao.com',
  해든: 'haeden@kakao.com',
}

const PG: Record<Row[6], Pg> = { 토스: 'TOSS', 카카오페이: 'KAKAOPAY' }
const STATUS: Record<Row[7], PayStatus> = { 완료: 'DONE', 준비: 'READY', 실패: 'FAILED' }

let cache: Payment[] | null = null

/**
 * ⚠️ **날짜는 오늘을 기준으로 만든다.** 원본은 `2026-08-14` 처럼 박아 뒀는데, 그대로 두면
 *    「오늘 결제」 지표가 **영원히 0 원**이 된다 — 화면은 멀쩡한데 죽은 숫자다.
 *    원본의 **날짜 간격**(14일 3건 · 13일 4건 · 12일 3건 · 11일 2건)은 그대로 옮겼다.
 *
 * ⚠️ **캐시가 날짜를 고정한다.** 자정을 넘겨도 이 탭에서는 안 바뀐다 — 목이 메모리에만
 *    살아서 새로고침하면 다시 계산되므로 앞뒤가 맞는다.
 */
export function allPayments(): Payment[] {
  if (cache) return cache

  // 회원별 미사용 수량. 같은 사람의 여러 결제에 **나눠 담아야** 한다 (아래 `spread`).
  const perMember = new Map<string, number>()
  for (const r of ROWS) perMember.set(r[3], r[10])

  const rows: Payment[] = ROWS.map(
    ([ago, time, seq, who, product, amount, pg, status, give, bonus], i) => {
      const day = daysAgo(ago)
      return {
        key: i,
        // ⚠️ **주문번호의 날짜도 일시와 같아야 한다.** 원본 값을 그대로 두면
        //    `ord_20260814_…` 가 오늘 결제에 붙어 **한눈에 가짜로 보인다.**
        orderNo: `ord_${day.replaceAll('-', '')}_${seq}`,
        at: `${day} ${time}`,
        who,
        email: EMAILS[who] ?? '',
        product,
        amount,
        pg: PG[pg],
        status: STATUS[status],
        give,
        bonus,
        // 아래 `spread` 가 채운다. 여기서는 자리만 잡는다.
        unusedGem: 0,
      }
    },
  )

  cache = spread(rows, perMember)
  return cache
}

/**
 * 회원의 미사용 유상 재화를 **결제별 잔여**로 나눠 담는다.
 *
 * ⚠️ **회원 잔액을 결제마다 복사하면 안 된다.** 소이는 결제가 둘(각 1,000개)이고 미사용이
 *    1,200개인데, 둘 다 1,200 을 들면 **각각 전액 환불이 가능해져 2,000개어치가 나간다.**
 *    실제로 그렇게 넣었다가 24,200원이 나왔다 (docs/ARCHITECTURE.md §22.2.2).
 *
 * **오래 산 것부터 쓴다**고 본다(FIFO) — 그래서 잔여는 **최신 결제에 남는다.**
 * 각 결제의 잔여는 그 결제로 산 수량(`give`)을 넘을 수 없다.
 *
 * ```text
 * 소이  미사용 1,200
 *   오늘  give 1,000  →  잔여 1,000   (최신부터 채운다)
 *   어제  give 1,000  →  잔여   200
 * ```
 */
function spread(rows: Payment[], perMember: Map<string, number>): Payment[] {
  const left = new Map(perMember)
  // `ROWS` 가 이미 최신순이라 그대로 훑으면 최신부터 채워진다.
  for (const p of rows) {
    // 실패·환불 건에는 남은 것이 없고, 준비는 아직 지급 전이다.
    if (p.status !== 'DONE') continue
    const remain = left.get(p.who) ?? 0
    const take = Math.min(remain, p.give)
    p.unusedGem = take
    left.set(p.who, remain - take)
  }
  return rows
}

/**
 * 환불 처리. **되돌릴 수 없다** — 상태를 `REFUNDED` 로 두고 미사용 재화를 0 으로 만든다.
 *
 * ⚠️ 실제로는 결제사 취소와 재화 회수가 **함께** 일어나야 한다 — 둘 중 하나만 성공하면
 * 돈은 돌려줬는데 재화가 남거나 그 반대가 된다. 그 배선은 파사드에 적어 뒀다.
 */
export function refundPayment(key: number): Payment {
  const list = allPayments()
  const at = list.findIndex((p) => p.key === key)
  if (at < 0) throw new Error(`결제가 없습니다: ${key}`)

  // ⚠️ **여기서도 상태를 본다.** 화면의 비활성 버튼은 **이 화면의 이 버튼**만 막는다 —
  //    북마크한 주소·재시도·나중에 붙을 다른 호출 경로는 그대로 들어온다. 준비·실패 건을
  //    환불하면 받지도 않은 돈을 돌려주고, 이미 환불한 건은 두 번 나간다.
  if (!canRefund(list[at]!)) throw new Error(`환불할 수 없는 결제입니다: ${key}`)

  const next: Payment = { ...list[at]!, status: 'REFUNDED', unusedGem: 0 }
  list[at] = next
  return next
}
