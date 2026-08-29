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

/**
 * 진열·유통 스위치.
 *
 * 어디에도 표시되지 않지만 폼이 편집하고 저장한다 — 수정 화면을 다시 열었을 때
 * 값이 남아 있어야 하기 때문이다.
 */
export type ItemFlags = {
  /** 상점 첫 화면에 진열 */
  shop: boolean
  /** 확률 뽑기 풀에 포함 */
  gacha: boolean
  /** 유저 간 선물 허용 */
  gift: boolean
}

/** 획득 경로 */
export type ItemSource = 'SHOP' | 'CHALLENGE' | 'ACHIEVEMENT' | 'LEVEL' | 'SEASON_PASS'

export type Item = {
  key: number
  /** 표시용 코드 — 'IT-1001' */
  code: string
  /** 에셋 파일 id — 'as_head_0' */
  assetId: string
  /**
   * 그림의 URL. **서버가 채운다** — 빌드에 없는(올린) 에셋은 `assetId` 로 찾을 수 없다.
   *
   * 비어 있으면 빌드 에셋이라는 뜻이고 `assetId` 로 찾는다. 폼이 편집하는 값이 아니라
   * `ItemInput` 에는 없다.
   */
  assetSrc?: string
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
  /** 노출 시작 — `YYYY-MM-DD`. **빈 문자열이면 제한 없음** */
  visibleFrom: string
  /** 노출 종료 — `YYYY-MM-DD`. **빈 문자열이면 제한 없음** */
  visibleTo: string
  flags: ItemFlags
}


/**
 * 폼이 편집하는 부분만.
 *
 * `key`·`code`·`sold`·`own`·`status`·`madeAt` 는 **서버가 소유한다** — 사람이 손으로
 * 넣는 값이 아니다. 등록·수정이 주고받는 것은 이만큼이다.
 */
export type ItemInput = Pick<
  Item,
  'name' | 'sub' | 'slot' | 'tier' | 'price' | 'source' | 'season' | 'assetId'
  | 'visibleFrom' | 'visibleTo' | 'flags'
>

/** 슬롯의 정렬 순서. 타입의 열거 짝이라 여기 둔다. */
export const SLOT_ORDER: Slot[] = ['HEAD', 'BODY', 'HAND', 'FACE']
