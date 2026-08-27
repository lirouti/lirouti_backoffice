/**
 * 아이템 엔티티 타입.
 *
 * 디자인 원본은 '노출' · '유료' 같은 한글 표시값을 그대로 상태값으로 쓴다.
 * 실서버는 VISIBLE / PAID 같은 코드를 줄 가능성이 높으므로 코드값으로 정의하고,
 * 한글은 `./labels.ts` 로 분리한다.
 */

/** 캐릭터 착용 슬롯 */
export type Slot = 'HEAD' | 'BODY' | 'HAND' | 'FACE'

/** 과금 등급 */
export type Tier = 'FREE' | 'PAID'

/** 노출 상태 */
export type ItemStatus = 'VISIBLE' | 'SCHEDULED' | 'HIDDEN'

/** 획득 경로 */
export type ItemSource = 'SHOP' | 'CHALLENGE' | 'ACHIEVEMENT' | 'LEVEL' | 'SEASON_PASS'

export type Item = {
  key: number
  /** 표시용 코드 — 'IT-1001' */
  code: string
  /** 에셋 파일 id — 'as_head_0' */
  assetId: string
  name: string
  sub: string
  slot: Slot
  tier: Tier
  /** 젬 가격. 무료면 0 */
  price: number
  source: ItemSource
  /** 누적 판매 건수 */
  sold: number
  /** 보유율 (%) */
  own: number
  status: ItemStatus
  season: string
  madeAt: string
}

/** 슬롯의 정렬 순서. 타입의 열거 짝이라 여기 둔다. */
export const SLOT_ORDER: Slot[] = ['HEAD', 'BODY', 'HAND', 'FACE']
