/** 배경 도메인 규칙 (docs/ARCHITECTURE.md §41). */
import type { Background, BackgroundInput } from './types'

/** 어느 칸이 왜 막혔는가. 비어 있으면 저장할 수 있다. */
export type BackgroundInputErrors = Partial<Record<keyof BackgroundInput, string>>

/**
 * 등록·수정 폼의 검증.
 *
 * ⚠️ **화면의 체크리스트도 이걸 쓴다.** 따로 계산하면 **체크는 초록인데 저장이 막히는**
 *    화면이 만들어진다 (§18.7 과 같은 규칙).
 */
export function validateBackground(input: BackgroundInput): BackgroundInputErrors {
  const errors: BackgroundInputErrors = {}

  if (!input.name.trim()) errors.name = '배경명을 입력하세요.'

  // 배경은 그림이 곧 상품이다. 없으면 목록이 `?` 타일로 찬다.
  if (!input.assetId) errors.assetId = '에셋을 고르세요.'

  // ⚠️ **숫자로 다룰 수 없는 값을 먼저 막는다.** 309자리 이상을 붙여넣으면 `Number` 가
  //    `Infinity` 가 되는데, `Infinity > 0` 은 참이라 아래 규칙을 **그냥 통과하고**
  //    목록에 「∞ 젬」 이 찍힌다.
  if (!Number.isFinite(input.price)) errors.price = '가격이 너무 큽니다.'

  // 등급과 가격은 서로를 구속한다. 유료인데 0원이면 상점에서 공짜로 나간다 (아이템과 같은 규칙).
  else if (input.tier === 'PAID' && input.price <= 0) errors.price = '유료 배경은 가격을 입력하세요.'
  else if (input.tier === 'FREE' && input.price !== 0) errors.price = '무료 배경은 가격이 0이어야 합니다.'

  return errors
}

/** 등록 화면의 초기값. 원본처럼 무료가 골라져 있다 */
export function emptyBackgroundInput(): BackgroundInput {
  return { assetId: '', name: '', tier: 'FREE', price: 0 }
}

/** `Background` 에서 폼이 편집하는 부분만 떼어낸다 (수정 화면의 초기값). */
export function toBackgroundInput(b: Background): BackgroundInput {
  const { assetId, name, tier, price } = b
  return { assetId, name, tier, price }
}

/**
 * 카드에 붙는 한 줄.
 *
 * 원본은 `i < 16 ? '무료 해금' : '유료 · 시즌'` 로 **순서**를 보고 정했는데, 그건 지금
 * 목록이 무료 16 + 유료 4 로 정렬돼 있기 때문에만 맞는 식이다. 등록으로 무료 배경이
 * 하나 늘면 그대로 어긋나므로 **등급에서 끌어온다.**
 */
export const backgroundMeta = (b: Pick<Background, 'tier'>): string =>
  b.tier === 'PAID' ? '유료 · 시즌' : '무료 해금'
