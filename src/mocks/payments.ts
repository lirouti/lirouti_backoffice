/**
 * 결제 목 데이터. 디자인 원본 `PAYS` 12행을 값 그대로 옮겼다.
 *
 * 원본 행은 `[일시, 주문번호, 회원, 상품, 금액, 결제사, 상태, 지급량, 보너스,
 * 유상잔액, 미사용유상]` 이다.
 */
import type { PayStatus, Payment, Pg } from '@/domain/payment'

type Row = [
  at: string,
  orderNo: string,
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
  ['2026-08-14 09:12', 'ord_20260814_9921', '소이', '파란보석 1,100개', 12100, '토스', '완료', 1000, 100, 1840, 1200],
  ['2026-08-14 08:41', 'ord_20260814_9918', '새벽러너', '파란보석 10,000개+보너스', 110000, '카카오페이', '완료', 10000, 1500, 3200, 2900],
  ['2026-08-14 07:55', 'ord_20260814_9902', '민트초코', '파란보석 300개', 3300, '토스', '준비', 300, 0, 980, 800],
  ['2026-08-13 22:30', 'ord_20260813_8874', '밤톨', '파란보석 500개', 5500, '토스', '완료', 500, 30, 640, 500],
  ['2026-08-13 18:40', 'ord_20260813_8841', '소이', '파란보석 1,100개', 12100, '카카오페이', '완료', 1000, 100, 1840, 1200],
  ['2026-08-13 14:02', 'ord_20260813_8820', '버들', '파란보석 3,000개', 33000, '토스', '완료', 3000, 300, 1120, 900],
  ['2026-08-13 11:18', 'ord_20260813_8807', '모카', '파란보석 100개', 1100, '토스', '실패', 100, 0, 210, 100],
  ['2026-08-12 20:44', 'ord_20260812_7793', '해든', '파란보석 300개', 3300, '카카오페이', '준비', 300, 0, 75, 0],
  ['2026-08-12 16:09', 'ord_20260812_7761', '하루뭉치', '파란보석 500개', 5500, '토스', '완료', 500, 30, 420, 300],
  ['2026-08-12 09:33', 'ord_20260812_7740', '도토리', '파란보석 100개', 1100, '토스', '완료', 100, 0, 60, 0],
  ['2026-08-11 21:57', 'ord_20260811_6688', '새벽러너', '파란보석 3,000개', 33000, '카카오페이', '완료', 3000, 300, 3200, 2900],
  ['2026-08-11 13:20', 'ord_20260811_6650', '콩순이', '파란보석 100개', 1100, '토스', '실패', 100, 0, 15, 0],
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

const PG: Record<Row[5], Pg> = { 토스: 'TOSS', 카카오페이: 'KAKAOPAY' }
const STATUS: Record<Row[6], PayStatus> = { 완료: 'DONE', 준비: 'READY', 실패: 'FAILED' }

let cache: Payment[] | null = null

export function allPayments(): Payment[] {
  if (cache) return cache
  cache = ROWS.map(([at, orderNo, who, product, amount, pg, status, give, bonus, walletGem, unusedGem], i) => ({
    key: i,
    orderNo,
    at,
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
  }))
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
