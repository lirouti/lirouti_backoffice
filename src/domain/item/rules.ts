/**
 * 아이템 도메인 규칙.
 *
 * 데이터가 목이든 서버든 여기 규칙은 그대로다. 목 생성기(`mocks/items.ts`)가
 * 사라져도 이 파일은 남는다 — 그게 이 층을 따로 둔 이유다.
 */
import type { AssetKind } from '../asset'
import type { Item, ItemInput, ItemStatus, Slot, Tier } from './types'

/**
 * 판매량 상위 N개.
 *
 * `n` 을 그대로 `slice` 에 넘기지 않는다 — 음수면 `slice(0, -1)` 이 되어
 * **마지막 항목만 빠진 전체 목록**이 나온다. "상위 N개" 라는 계약과 정반대다.
 */
export function topSelling(items: Item[], n: number): Item[] {
  return [...items].sort((a, b) => b.sold - a.sold).slice(0, Math.max(0, n))
}

export type ItemFilter = {
  slot?: Slot
  tier?: Tier
  /** 이름 부분 일치 */
  q?: string
}

/** 목록 화면의 필터 규칙. 빈 조건은 무시한다. */
export function filterItems(items: Item[], f: ItemFilter): Item[] {
  const q = f.q?.trim()
  return items.filter(
    (it) =>
      (!f.slot || it.slot === f.slot) &&
      (!f.tier || it.tier === f.tier) &&
      (!q || it.name.includes(q)),
  )
}

/**
 * 아이템 슬롯이 곧 에셋 종류다. 대문자/소문자만 다르다.
 *
 * `domain/asset.ts` 가 아니라 여기 있는 이유는 방향 때문이다 — 아이템은 에셋을 알지만
 * 에셋은 아이템을 몰라야 한다(배경·업적도 같은 에셋을 쓴다).
 */
export const kindOfSlot = (slot: Slot): AssetKind =>
  slot.toLowerCase() as Extract<AssetKind, 'head' | 'body' | 'hand' | 'face'>

/** 상점에 실제로 노출되는가 */
export const isOnSale = (it: Item): boolean => it.status === 'VISIBLE'

/** 어느 칸이 왜 막혔는가. 비어 있으면 저장할 수 있다. */
export type ItemInputErrors = Partial<Record<keyof ItemInput, string>>

/**
 * 등록·수정 폼의 검증.
 *
 * ⚠️ **화면의 체크리스트도 이걸 쓴다.** 원본은 오른쪽 체크리스트를 따로 계산했는데,
 *    그러면 **체크는 초록인데 저장이 막히는** 화면이 만들어진다. 규칙은 한 곳에만 둔다.
 *
 * 형식만 본다 — "이미 쓰는 이름인가" 같은 것은 서버가 안다.
 */
export function validateItem(input: ItemInput): ItemInputErrors {
  const errors: ItemInputErrors = {}

  if (!input.name.trim()) errors.name = '아이템명을 입력하세요.'

  // 꾸미기 아이템이라 그림이 없으면 목록에서 `?` 로 뜬다. 등록 단계에서 막는다.
  if (!input.assetId) errors.assetId = '에셋을 고르세요.'

  // 등급과 가격은 서로를 구속한다. 유료인데 0원이면 상점에서 공짜로 나간다.
  if (input.tier === 'PAID' && input.price <= 0) errors.price = '유료 아이템은 가격을 입력하세요.'
  if (input.tier === 'FREE' && input.price !== 0) errors.price = '무료 아이템은 가격이 0이어야 합니다.'

  // 둘 다 있을 때만 본다 — 빈 문자열은 "제한 없음" 이라 비교 대상이 아니다.
  if (input.visibleFrom && input.visibleTo && input.visibleTo < input.visibleFrom) {
    errors.visibleTo = '노출 종료가 시작보다 빠릅니다.'
  }

  return errors
}

/** 등록 화면의 초기값. 슬롯·등급은 원본처럼 첫 번째가 골라져 있다. */
export function emptyItemInput(): ItemInput {
  return {
    name: '',
    sub: '',
    slot: 'HEAD',
    tier: 'FREE',
    price: 0,
    source: 'SHOP',
    season: '상시',
    assetId: '',
    visibleFrom: '',
    visibleTo: '',
    flags: { shop: true, gacha: false, gift: true },
  }
}

/**
 * 노출 상태를 정한다. **등록과 수정이 같은 규칙을 쓴다.**
 *
 * `visibleFrom` 이 있으면 예약, 비어 있으면 노출이다. 수정 쪽에서 이 전이를 빠뜨리면
 * 예약 아이템의 노출 시작을 지워도 `SCHEDULED` 로 남아, **같은 입력인데 등록과 수정의
 * 결과가 달라진다.**
 *
 * ⚠️ **`HIDDEN` 은 유지한다.** 미노출은 날짜가 아니라 사람이 내린 결정이라,
 *    기간을 손봤다고 풀리면 안 된다.
 *
 * TODO(노출 상태를 서버가 계산하기 시작하면): 지금은 `visibleFrom` 의 유무만 본다.
 * 이미 지난 날짜면 `VISIBLE` 이어야 하지만, 그러려면 "지금"이 필요해 순수 함수가 아니게 된다.
 *
 * @param prev 수정 전 상태. 등록이면 없다.
 */
export function statusOf(input: ItemInput, prev?: ItemStatus): ItemStatus {
  if (prev === 'HIDDEN') return 'HIDDEN'
  return input.visibleFrom ? 'SCHEDULED' : 'VISIBLE'
}

/** `Item` 에서 폼이 편집하는 부분만 떼어낸다 (수정 화면의 초기값). */
export function toItemInput(item: Item): ItemInput {
  const { name, sub, slot, tier, price, source, season, assetId, visibleFrom, visibleTo, flags } = item
  return { name, sub, slot, tier, price, source, season, assetId, visibleFrom, visibleTo, flags }
}
