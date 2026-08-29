/**
 * 캐릭터 종(種) 엔티티.
 *
 * ⚠️ **13종이 전부 같은 그림(`#rg`)을 쓴다.** 종을 구분하는 것은 **대표 색 하나**이고,
 *    그 색을 옅게 깐 배경(`tint`)으로만 드러난다. 그래서 종에는 올릴 이미지가 없다 —
 *    아트는 캐릭터팀이 저장소에서 관리한다 (docs/ARCHITECTURE.md §19).
 */

/** 희귀도. 출현 가중치와 함께 뽑기 확률을 만든다 */
export type Rarity = '기본' | '희귀' | '영웅' | '전설'

export const RARITIES: Rarity[] = ['기본', '희귀', '영웅', '전설']

/** 종을 얻는 조건. 원본의 `UNLOCK_OPTS` 그대로 */
export type Unlock = '조건 없음' | '레벨 5 이상' | '업적 3개 달성' | '친구 3명 이상'

export const UNLOCKS: Unlock[] = ['조건 없음', '레벨 5 이상', '업적 3개 달성', '친구 3명 이상']

export const SEASONS = ['상시', '시즌 1', '시즌 2', '시즌 3'] as const
export type Season = (typeof SEASONS)[number]

/** 리그의 여섯 슬롯. 종마다 기본 부품만 다르다 */
export type RigSlot = '정수리' | '눈' | '부리' | '꼬리' | '몸' | '손'

export const RIG_SLOTS: RigSlot[] = ['정수리', '눈', '부리', '꼬리', '몸', '손']

/** 슬롯별로 고를 수 있는 기본 부품. 원본의 `SLOT_OPTS` 그대로 */
export const SLOT_PARTS: Record<RigSlot, string[]> = {
  정수리: ['기본 볏', '낮은 볏', '뒤로 넘긴 볏', '별 모양 깃', '없음'],
  눈: ['기본 눈', '큰 눈', '처진 눈', '반짝임'],
  부리: ['짧은 부리', '둥근 부리', '뾰족한 부리'],
  꼬리: ['짧은 꼬리', '세 갈래', '금테 꼬리', '길게 늘어짐'],
  몸: ['기본 몸', '통통한 몸'],
  손: ['기본 날개', '투명 날개끝'],
}

export type Species = {
  key: number
  /** `SP-BLUE` — 사람이 읽는 식별자. 종끼리 겹칠 수 없다 */
  code: string
  name: string
  rarity: Rarity
  /**
   * 대표 색. `#RRGGBB`.
   *
   * ⚠️ **칠하는 색이지 쓰는 색이 아니다.** `speciesTint` 로 옅게 깔아 배경으로만 쓴다 —
   *    운영자가 넣는 값이라 명암비를 우리가 보증할 수 없어 글자색으로 쓰면 안 된다.
   */
  tone: string
  /** 출현 가중치. 같은 희귀도 안에서 서로의 비율을 정한다 */
  weight: number
  unlock: Unlock
  season: Season
  /** 슬롯별 기본 부품 */
  slots: Record<RigSlot, string>
  /** 이 종을 가진 계정 수 */
  owners: number
  /** `YYYY-MM-DD` */
  madeAt: string
  /** 아트 담당자 이름 */
  by: string
  note: string
  /** 뽑기에서 빠져 있는가. 아트가 아직 없는 새 종이 여기서 시작한다 */
  hidden: boolean
}

/** 폼이 편집하는 부분만. `key`·`owners`·`madeAt` 은 서버가 소유한다 */
export type SpeciesInput = Pick<
  Species,
  'code' | 'name' | 'rarity' | 'tone' | 'weight' | 'unlock' | 'season' | 'slots' | 'note' | 'by'
>

/** 종류 상세의 변경 이력 한 줄 */
export type SpeciesLog = {
  /** `YYYY-MM-DD HH:mm` */
  at: string
  /** 무엇을 만졌는가 — 가중치 · 슬롯 · 아트 · 출현 */
  kind: string
  what: string
  by: string
}
