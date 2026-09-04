import { isHexColor } from '@/shared/lib/color'

/**
 * 캐릭터 종 규칙.
 *
 * 데이터가 목이든 서버든 여기 규칙은 그대로다.
 */
import { CURRENT_SEASON, seasonOptions } from '../season'
import { RIG_SLOTS, SLOT_PARTS, type Species, type SpeciesInput } from './types'

/**
 * 대표 색을 **배경으로** 쓸 때의 값.
 *
 * ⚠️ **글자색으로 쓰지 말 것.** 운영자가 넣는 색이라 명암비를 우리가 보증할 수 없고,
 *    `scripts/check-contrast.ts` 는 토큰만 보므로 이 값은 검사되지 않는다.
 *    16% 로 옅게 깔아야 어떤 색이 와도 그 위의 `ink` 가 읽힌다.
 */
export const speciesTint = (tone: string): string =>
  `color-mix(in srgb, ${tone} 16%, var(--surf))`

/**
 * 저장 전에 다듬는다.
 *
 * ⚠️ **검증도 저장도 이 값을 봐야 한다.** 검증만 `trim()` 하고 저장은 원본을 넣으면
 *    `' SP-NEW '` 가 통과한 뒤 그대로 저장되고, 나중에 `'SP-NEW'` 가 중복 검사를
 *    빠져나가 **같은 코드의 종이 둘** 생긴다. 파사드(`api/species.ts`)가 저장 직전에
 *    반드시 거친다.
 *
 * 대문자로 올리지는 않는다 — `SP-blue` 를 조용히 고치면 아래 형식 규칙이 무의미해지고,
 * 운영자는 자기가 친 것과 다른 값이 저장된 걸 모른다.
 */
export function normalizeSpeciesInput(input: SpeciesInput): SpeciesInput {
  return { ...input, code: input.code.trim(), name: input.name.trim() }
}

/** 어느 칸이 왜 막혔는가. 비어 있으면 저장할 수 있다 */
export type SpeciesInputErrors = Partial<Record<keyof SpeciesInput, string>>

/**
 * 등록·수정 폼의 검증.
 *
 * @param taken 이미 쓰이는 코드들. **자기 코드는 빼고** 넘긴다(수정 화면에서 자기와 부딪힌다).
 */
export function validateSpecies(input: SpeciesInput, taken: string[] = []): SpeciesInputErrors {
  const errors: SpeciesInputErrors = {}
  // 저장될 값을 검증한다 (위 `normalizeSpeciesInput` 의 ⚠️).
  const v = normalizeSpeciesInput(input)

  if (!v.name) errors.name = '종 이름을 입력하세요.'

  const code = v.code
  if (!code) errors.code = '코드를 입력하세요.'
  else if (!/^SP-[A-Z0-9]+$/.test(code))
    errors.code = '`SP-` 로 시작하는 대문자 코드여야 합니다.'
  // 이미 저장된 값에도 공백이 섞여 있을 수 있다 — 양쪽을 같은 자로 잰다.
  else if (taken.some((t) => t.trim() === code)) errors.code = '이미 쓰고 있는 코드입니다.'

  if (!isHexColor(input.tone)) errors.tone = '대표 색을 #RRGGBB 로 입력하세요.'

  // 0 이면 뽑기에서 절대 안 나온다 — 등록해 놓고 안 나오는 종이 생긴다.
  if (!Number.isFinite(input.weight) || input.weight <= 0) {
    errors.weight = '출현 가중치는 1 이상이어야 합니다.'
  }

  // ⚠️ **아는 시즌인지 여기서 본다.** 목록이 값(`seasonOptions`)이라 타입이 못 막는다 —
  //    모르는 시즌으로 저장하면 그 종은 어느 시즌에도 안 뜬다 (docs/ARCHITECTURE.md §34.1).
  if (!seasonOptions(CURRENT_SEASON).includes(v.season)) errors.season = '없는 시즌입니다.'

  // 목록에 없는 부품을 넣으면 클라이언트가 그릴 것이 없다.
  const badSlot = RIG_SLOTS.find((s) => !SLOT_PARTS[s].includes(input.slots[s]))
  if (badSlot) errors.slots = `${badSlot} 슬롯의 기본 부품이 목록에 없습니다.`

  return errors
}

/** 등록 화면의 초기값. 슬롯은 각 목록의 첫 번째가 골라져 있다 */
export function emptySpeciesInput(): SpeciesInput {
  return {
    code: '',
    name: '',
    rarity: '기본',
    tone: '#7DBAFF',
    weight: 420,
    unlock: '조건 없음',
    season: '상시',
    slots: Object.fromEntries(RIG_SLOTS.map((s) => [s, SLOT_PARTS[s][0]!])) as Species['slots'],
    note: '',
    by: '',
  }
}

/** `Species` 에서 폼이 편집하는 부분만 (수정 화면의 초기값) */
export function toSpeciesInput(sp: Species): SpeciesInput {
  const { code, name, rarity, tone, weight, unlock, season, slots, note, by } = sp
  return { code, name, rarity, tone, weight, unlock, season, slots: { ...slots }, note, by }
}

/**
 * 같은 희귀도 안에서 이 종이 차지하는 비율 (%).
 *
 * 가중치는 절대값이라 그 자체로는 크고 작음을 알 수 없다 — 420 이 흔한 건지 드문 건지는
 * **같은 등급끼리 견줘야** 나온다. 뽑기 확률이 곧 이 값이다.
 */
export function appearanceShare(sp: Species, all: Species[]): number {
  const peers = all.filter((s) => s.rarity === sp.rarity && !s.hidden)
  const total = peers.reduce((sum, s) => sum + s.weight, 0)
  if (total === 0 || sp.hidden) return 0
  return Math.round((sp.weight / total) * 1000) / 10
}
