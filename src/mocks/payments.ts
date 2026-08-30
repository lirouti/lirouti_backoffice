/**
 * 결제 목 데이터. 디자인 원본 `PAYS` 12행을 값 그대로 옮겼다.
 *
 * 원본 행은 `[일시, 주문번호, 회원, 상품, 금액, 결제사, 상태, 지급량, 보너스,
 * 유상잔액, 미사용유상]` 이다.
 */
import { daysAgo } from '@/shared/lib/today'

import type { PayStatus, Payment, Pg } from '@/domain/payment'

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
  walletGem: number,
  unusedGem: number,
]

const ROWS: Row[] = [
  [0, '09:12', '9921', '소이', '파란보석 1,100개', 12100, '토스', '완료', 1000, 100, 1840, 1200],
  [0, '08:41', '9918', '새벽러너', '파란보석 10,000개+보너스', 110000, '카카오페이', '완료', 10000, 1500, 3200, 2900],
  [0, '07:55', '9902', '민트초코', '파란보석 300개', 3300, '토스', '준비', 300, 0, 980, 800],
  [1, '22:30', '8874', '밤톨', '파란보석 500개', 5500, '토스', '완료', 500, 30, 640, 500],
  [1, '18:40', '8841', '소이', '파란보석 1,100개', 12100, '카카오페이', '완료', 1000, 100, 1840, 1200],
  [1, '14:02', '8820', '버들', '파란보석 3,000개', 33000, '토스', '완료', 3000, 300, 1120, 900],
  [1, '11:18', '8807', '모카', '파란보석 100개', 1100, '토스', '실패', 100, 0, 210, 100],
  [2, '20:44', '7793', '해든', '파란보석 300개', 3300, '카카오페이', '준비', 300, 0, 75, 0],
  [2, '16:09', '7761', '하루뭉치', '파란보석 500개', 5500, '토스', '완료', 500, 30, 420, 300],
  [2, '09:33', '7740', '도토리', '파란보석 100개', 1100, '토스', '완료', 100, 0, 60, 0],
  [3, '21:57', '6688', '새벽러너', '파란보석 3,000개', 33000, '카카오페이', '완료', 3000, 300, 3200, 2900],
  [3, '13:20', '6650', '콩순이', '파란보석 100개', 1100, '토스', '실패', 100, 0, 15, 0],
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
  cache = ROWS.map(([ago, time, seq, who, product, amount, pg, status, give, bonus, walletGem, unusedGem], i) => {
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
    walletGem,
    unusedGem,
    }
  })
  return cache
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
  const next: Payment = { ...list[at]!, status: 'REFUNDED', unusedGem: 0 }
  list[at] = next
  return next
}
