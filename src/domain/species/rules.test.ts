/**
 * 종 규칙 (docs/ARCHITECTURE.md §19).
 *
 * 여기서 막지 못한 값은 **뽑기에 그대로 들어간다** — 가중치 0 인 종은 등록해 놓고
 * 영원히 안 나오고, 목록에 없는 부품은 클라이언트가 그릴 것이 없다.
 */
import { describe, expect, it } from 'vitest'

import { appearanceShare, emptySpeciesInput, speciesTint, toSpeciesInput, validateSpecies } from './rules'
import type { Species, SpeciesInput } from './types'

const input = (over: Partial<SpeciesInput> = {}): SpeciesInput => ({
  ...emptySpeciesInput(),
  code: 'SP-TEST',
  name: '시험',
  by: '최지우',
  ...over,
})

const species = (over: Partial<Species> = {}): Species => ({
  ...emptySpeciesInput(),
  code: 'SP-A',
  name: '가',
  key: 0,
  owners: 0,
  madeAt: '2026-08-01',
  hidden: false,
  ...over,
})

describe('validateSpecies', () => {
  it('다 채우면 오류가 없다', () => {
    expect(validateSpecies(input())).toEqual({})
  })

  it('이름은 필수 — 공백만 있는 것도 빈 것이다', () => {
    expect(validateSpecies(input({ name: '  ' })).name).toBeTruthy()
  })

  it('코드는 `SP-` + 대문자여야 한다', () => {
    expect(validateSpecies(input({ code: 'BLUE' })).code).toBeTruthy()
    expect(validateSpecies(input({ code: 'SP-blue' })).code).toBeTruthy()
    expect(validateSpecies(input({ code: 'SP-BLUE2' })).code).toBeUndefined()
  })

  // 코드가 겹치면 어느 종을 가리키는지 서버도 사람도 알 수 없다.
  it('⚠️ 이미 쓰는 코드는 막는다', () => {
    expect(validateSpecies(input({ code: 'SP-BLUE' }), ['SP-BLUE']).code).toBe('이미 쓰고 있는 코드입니다.')
  })

  // 수정 화면에서 자기 코드를 그대로 두고 저장하면 자기와 부딪힌다.
  it('⚠️ 자기 코드를 뺀 목록을 넘기면 통과한다', () => {
    expect(validateSpecies(input({ code: 'SP-BLUE' }), ['SP-SKY']).code).toBeUndefined()
  })

  it('대표 색은 #RRGGBB — 세 자리 축약은 막는다', () => {
    expect(validateSpecies(input({ tone: '#abc' })).tone).toBeTruthy()
    expect(validateSpecies(input({ tone: '7DBAFF' })).tone).toBeTruthy()
    expect(validateSpecies(input({ tone: '#7dbaff' })).tone).toBeUndefined()
  })

  // 0 이면 등록은 되는데 뽑기에서 영원히 안 나온다.
  it('⚠️ 가중치 0 은 막는다', () => {
    expect(validateSpecies(input({ weight: 0 })).weight).toBeTruthy()
    expect(validateSpecies(input({ weight: -5 })).weight).toBeTruthy()
    expect(validateSpecies(input({ weight: 1 })).weight).toBeUndefined()
  })

  it('목록에 없는 부품은 막고, 어느 슬롯인지 알려 준다', () => {
    const bad = input({ slots: { ...emptySpeciesInput().slots, 부리: '갈고리 부리' } })
    expect(validateSpecies(bad).slots).toContain('부리')
  })
})

describe('appearanceShare', () => {
  // 가중치는 절대값이라 그 자체로는 크고 작음을 알 수 없다.
  it('같은 희귀도 안에서만 견준다', () => {
    const all = [
      species({ key: 0, code: 'SP-A', rarity: '기본', weight: 300 }),
      species({ key: 1, code: 'SP-B', rarity: '기본', weight: 100 }),
      species({ key: 2, code: 'SP-C', rarity: '전설', weight: 12 }),
    ]
    expect(appearanceShare(all[0]!, all)).toBe(75)
    expect(appearanceShare(all[1]!, all)).toBe(25)
    // 전설은 혼자라 100% — 기본종의 400 과 견주지 않는다
    expect(appearanceShare(all[2]!, all)).toBe(100)
  })

  // 미출현은 뽑기 풀에서 빠진다 — 분모에도 분자에도 들어가면 안 된다.
  it('⚠️ 미출현은 0% 이고, 남은 종의 비율을 높인다', () => {
    const all = [
      species({ key: 0, code: 'SP-A', rarity: '기본', weight: 300 }),
      species({ key: 1, code: 'SP-B', rarity: '기본', weight: 100, hidden: true }),
    ]
    expect(appearanceShare(all[1]!, all)).toBe(0)
    expect(appearanceShare(all[0]!, all)).toBe(100)
  })
})

describe('speciesTint', () => {
  // 운영자가 넣는 색이라 명암비를 보증할 수 없다. 옅게 깔아야 그 위의 글자가 읽힌다.
  it('대표 색을 16% 로 옅게 깐다', () => {
    expect(speciesTint('#7DBAFF')).toBe('color-mix(in srgb, #7DBAFF 16%, var(--surf))')
  })
})

describe('toSpeciesInput', () => {
  it('서버가 소유한 필드는 떼어낸다', () => {
    const got = toSpeciesInput(species({ owners: 128400, madeAt: '2026-01-12' }))
    expect(got).not.toHaveProperty('owners')
    expect(got).not.toHaveProperty('key')
  })

  // 얕게 복사하면 폼에서 슬롯을 바꿀 때 원본 종까지 바뀐다.
  it('⚠️ 슬롯은 복사한다 — 폼이 원본을 건드리면 안 된다', () => {
    const sp = species()
    const got = toSpeciesInput(sp)
    got.slots.부리 = '뾰족한 부리'
    expect(sp.slots.부리).not.toBe('뾰족한 부리')
  })
})
