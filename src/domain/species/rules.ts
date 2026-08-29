/**
 * 캐릭터 종 규칙.
 *
 * 데이터가 목이든 서버든 여기 규칙은 그대로다.
 */
import { RIG_SLOTS, SLOT_PARTS, type Species, type SpeciesInput } from './types'

/** `#RRGGBB` 만 받는다. 세 자리 축약(`#abc`)은 넓히지 않고 막는다 — 값이 둘로 갈린다 */
const HEX = /^#[0-9a-fA-F]{6}$/

/**
 * 대표 색을 **배경으로** 쓸 때의 값.
 *
 * ⚠️ **글자색으로 쓰지 말 것.** 운영자가 넣는 색이라 명암비를 우리가 보증할 수 없고,
 *    `scripts/check-contrast.ts` 는 토큰만 보므로 이 값은 검사되지 않는다.
 *    16% 로 옅게 깔아야 어떤 색이 와도 그 위의 `ink` 가 읽힌다.
 */
export const speciesTint = (tone: string): string => `color-mix(in srgb, ${tone} 16%, var(--surf))`

/** 어느 칸이 왜 막혔는가. 비어 있으면 저장할 수 있다 */
export type SpeciesInputErrors = Partial<Record<keyof SpeciesInput, string>>

/**
 * 등록·수정 폼의 검증.
 *
 * @param taken 이미 쓰이는 코드들. **자기 코드는 빼고** 넘긴다(수정 화면에서 자기와 부딪힌다).
 */
export function validateSpecies(input: SpeciesInput, taken: string[] = []): SpeciesInputErrors {
  const errors: SpeciesInputErrors = {}

  if (!input.name.trim()) errors.name = '종 이름을 입력하세요.'

  const code = input.code.trim()
  if (!code) errors.code = '코드를 입력하세요.'
  else if (!/^SP-[A-Z0-9]+$/.test(code)) errors.code = '`SP-` 로 시작하는 대문자 코드여야 합니다.'
  else if (taken.includes(code)) errors.code = '이미 쓰고 있는 코드입니다.'

  if (!HEX.test(input.tone)) errors.tone = '대표 색을 #RRGGBB 로 입력하세요.'

  // 0 이면 뽑기에서 절대 안 나온다 — 등록해 놓고 안 나오는 종이 생긴다.
  if (!Number.isFinite(input.weight) || input.weight <= 0) {
    errors.weight = '출현 가중치는 1 이상이어야 합니다.'
  }

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
