/**
 * 공통 코드 규칙 (docs/ARCHITECTURE.md §29).
 *
 * 여기가 틀리면 **저장된 데이터가 무엇인지 알 수 없게 된다** — 쓰이는 코드를 지우거나,
 * 같은 코드가 둘 생기면 그 값을 가진 행들이 어느 쪽인지 판정할 수 없다.
 */
import { describe, expect, it } from 'vitest'

import {
  CODE_RULE_TEXT,
  canDeleteValue,
  hasDuplicateCodes,
  normalizeCodeGroupInput,
  deletableValues,
  filterGroups,
  isCodeKey,
  suggestCodeKey,
  summarizeCodes,
  usableValues,
  validateCodeGroup,
} from './rules'
import type { CodeGroup, CodeGroupInput, CodeValue } from './types'

const val = (over: Partial<CodeValue> = {}): CodeValue => ({
  code: 'ACCOUNT',
  label: '계정 · 로그인',
  tone: '파랑',
  uses: 412,
  visible: true,
  ...over,
})

const group = (over: Partial<CodeGroup> = {}): CodeGroup => ({
  key: 0,
  name: '문의 분류',
  codeKey: 'QNA_CATEGORY',
  category: '고객 소통',
  note: '1:1 문의를 접수할 때 유저가 고르는 분류',
  values: [val()],
  usages: [],
  updatedAt: '2026-08-09 14:22',
  updatedBy: '박서준',
  ...over,
})

const input = (over: Partial<CodeGroupInput> = {}): CodeGroupInput => ({
  name: '신고 유형',
  codeKey: 'REPORT_KIND',
  category: '모더레이션' as CodeGroupInput['category'],
  note: '',
  values: [{ code: 'SPAM', label: '스팸', tone: '빨강' }],
  ...over,
})

describe('isCodeKey', () => {
  it('영문 대문자 · 숫자 · 밑줄', () => {
    expect(isCodeKey('QNA_CATEGORY')).toBe(true)
    expect(isCodeKey('A1_B2')).toBe(true)
  })

  // `Account` 와 `ACCOUNT` 가 다른 값이 되면 비교가 조용히 어긋난다.
  it('⚠️ 소문자 · 한글 · 앞자리 숫자·밑줄은 막는다', () => {
    for (const bad of ['Account', '문의분류', '1ABC', '_ABC', '', 'A-B']) {
      expect(isCodeKey(bad)).toBe(false)
    }
  })

  // 시즌 코드가 `S1` · `S2` · `S3` 다 — 숫자를 막으면 지금 있는 데이터가 못 들어온다.
  it('⚠️ 첫 글자 뒤의 숫자는 허용한다', () => {
    for (const ok of ['S1', 'S2', 'S3', 'A1_B2']) expect(isCodeKey(ok)).toBe(true)
  })

  // 메시지와 실제 규칙이 어긋나면 사람이 규칙을 못 배운다.
  it('⚠️ 안내 문구가 실제 패턴과 맞는다', () => {
    expect(CODE_RULE_TEXT).toContain('숫자')
    expect(validateCodeGroup(input({ codeKey: 'bad key' })).codeKey).toContain(CODE_RULE_TEXT)
  })
})

describe('suggestCodeKey', () => {
  it('사전에 있는 낱말을 옮긴다', () => {
    expect(suggestCodeKey('문의 분류')).toBe('QNA_CATEGORY')
    expect(suggestCodeKey('신고 유형')).toBe('REPORT_KIND')
  })

  it('사전에 없으면 대문자로 올린다', () => {
    expect(suggestCodeKey('item slot')).toBe('ITEM_SLOT')
  })

  // 제안한 키가 그대로 못 쓰는 값이면 자동이 아무 도움이 안 된다.
  it('⚠️ 제안한 키는 언제나 쓸 수 있는 값이다', () => {
    for (const name of ['', '   ', '???', '한글만', '1234']) {
      expect(isCodeKey(suggestCodeKey(name))).toBe(true)
    }
  })
})

describe('normalizeCodeGroupInput', () => {
  it('앞뒤 공백을 없애고 빈 줄을 버린다', () => {
    const out = normalizeCodeGroupInput(
      input({
        name: ' 신고 유형 ',
        codeKey: 'REPORT_KIND ',
        note: '  설명  ',
        values: [
          { code: ' SPAM ', label: ' 스팸 ', tone: '빨강' },
          { code: '', label: '', tone: '회색' },
        ],
      }),
    )
    expect(out.name).toBe('신고 유형')
    expect(out.codeKey).toBe('REPORT_KIND')
    expect(out.note).toBe('설명')
    expect(out.values).toEqual([{ code: 'SPAM', label: '스팸', tone: '빨강' }])
  })

  // 다듬기가 검증과 저장에 흩어져 있으면 한쪽만 고쳤을 때 둘이 갈린다.
  it('⚠️ 다듬은 값은 그대로 다시 다듬어도 같다', () => {
    const once = normalizeCodeGroupInput(input({ codeKey: ' A_B ' }))
    expect(normalizeCodeGroupInput(once)).toEqual(once)
  })
})

describe('hasDuplicateCodes', () => {
  it('겹치면 참', () => {
    expect(hasDuplicateCodes(['A', 'B'])).toBe(false)
    expect(hasDuplicateCodes(['A', 'B', 'A'])).toBe(true)
    expect(hasDuplicateCodes([])).toBe(false)
  })
})

describe('canDeleteValue · deletableValues', () => {
  // 412건이 이 값을 들고 있는데 지우면 그 데이터가 무엇인지 알 수 없게 된다.
  it('⚠️ 쓰이고 있는 값은 못 지운다', () => {
    expect(canDeleteValue(val({ uses: 412 }))).toBe(false)
    expect(canDeleteValue(val({ uses: 0 }))).toBe(true)
  })

  // 감추는 것과 지우는 것은 다르다 — 감춰도 데이터는 그 값을 들고 있다.
  it('⚠️ 감춰 뒀어도 쓰이면 못 지운다', () => {
    expect(canDeleteValue(val({ uses: 412, visible: false }))).toBe(false)
  })

  it('지울 수 있는 것만 고른다', () => {
    const g = group({ values: [val({ code: 'A', uses: 0 }), val({ code: 'B', uses: 3 })] })
    expect(deletableValues(g).map((v) => v.code)).toEqual(['A'])
  })
})

describe('filterGroups', () => {
  const list = [
    group({ key: 0, name: '문의 분류', codeKey: 'QNA_CATEGORY', category: '고객 소통' }),
    group({
      key: 1,
      name: '아이템 슬롯',
      codeKey: 'ITEM_SLOT',
      category: '아이템',
      values: [val({ code: 'HEAD', label: '머리' })],
    }),
  ]

  it('분류로 거른다', () => {
    expect(filterGroups(list, { category: '아이템' }).map((g) => g.key)).toEqual([1])
    expect(filterGroups(list, { category: '전체' })).toHaveLength(2)
  })

  it('그룹명 · 코드 키로 찾는다', () => {
    expect(filterGroups(list, { q: '슬롯' }).map((g) => g.key)).toEqual([1])
    expect(filterGroups(list, { q: 'qna' }).map((g) => g.key)).toEqual([0])
  })

  // 「이 값이 어느 그룹 거지」 가 실제 쓰임이다.
  it('⚠️ 코드 값으로도 찾는다', () => {
    expect(filterGroups(list, { q: 'HEAD' }).map((g) => g.key)).toEqual([1])
    expect(filterGroups(list, { q: '머리' }).map((g) => g.key)).toEqual([1])
  })

  it('공백만 있는 검색어는 무시한다', () => {
    expect(filterGroups(list, { q: '  ' })).toHaveLength(2)
  })
})

describe('summarizeCodes', () => {
  const list = [
    group({
      key: 0,
      category: '고객 소통',
      values: [val({ code: 'A' }), val({ code: 'B', visible: false })],
    }),
    group({ key: 1, category: '아이템', values: [val({ code: 'C' })] }),
    group({ key: 2, category: '아이템', values: [] }),
  ]

  it('그룹 · 값 · 분류 · 감춘 값을 센다', () => {
    const s = summarizeCodes(list)
    expect([s.groups, s.values, s.categories, s.hidden]).toEqual([3, 3, 2, 1])
  })

  it('빈 목록도 0', () => {
    const s = summarizeCodes([])
    expect([s.groups, s.values, s.categories, s.hidden]).toEqual([0, 0, 0, 0])
  })
})

describe('validateCodeGroup', () => {
  it('제대로 채우면 통과', () => {
    expect(validateCodeGroup(input())).toEqual({})
  })

  it('그룹명 · 코드 키는 필수', () => {
    expect(validateCodeGroup(input({ name: '  ' })).name).toBeTruthy()
    expect(validateCodeGroup(input({ codeKey: '' })).codeKey).toBeTruthy()
  })

  it('코드 키 모양을 본다', () => {
    expect(validateCodeGroup(input({ codeKey: 'report kind' })).codeKey).toBeTruthy()
  })

  // 같은 키가 둘이면 어느 그룹을 가리키는지 알 수 없다.
  it('⚠️ 중복 코드 키는 대소문자 구분 없이 막는다', () => {
    expect(validateCodeGroup(input(), ['REPORT_KIND']).codeKey).toBeTruthy()
    expect(
      validateCodeGroup(input({ codeKey: 'REPORT_KIND' }), ['report_kind']).codeKey,
    ).toBeTruthy()
  })

  it('값이 하나도 없으면 막는다', () => {
    expect(validateCodeGroup(input({ values: [] })).values).toBeTruthy()
  })

  // 폼은 빈 줄을 들고 있을 수 있다 — 그걸 값으로 세면 안 된다.
  it('⚠️ 완전히 빈 줄은 값으로 세지 않는다', () => {
    const withBlank = input({
      values: [
        { code: 'SPAM', label: '스팸', tone: '빨강' },
        { code: '', label: '', tone: '회색' },
      ],
    })
    expect(validateCodeGroup(withBlank)).toEqual({})
    expect(usableValues(withBlank)).toHaveLength(1)
  })

  it('반쯤 채운 줄은 막는다', () => {
    expect(
      validateCodeGroup(input({ values: [{ code: 'SPAM', label: '', tone: '회색' }] })).values,
    ).toBeTruthy()
  })

  // 같은 코드가 둘이면 저장된 데이터가 어느 쪽인지 알 수 없다.
  it('⚠️ 값 안의 중복 코드를 막는다', () => {
    const dup = input({
      values: [
        { code: 'SPAM', label: '스팸', tone: '빨강' },
        { code: 'SPAM', label: '스팸2', tone: '회색' },
      ],
    })
    expect(validateCodeGroup(dup).values).toBe('코드가 중복됐습니다.')
  })

  // 소문자는 중복 검사에 닿기 전에 모양 검사에서 걸린다 — 두 메시지를 갈라 둔다.
  it('⚠️ 소문자는 「중복」 이 아니라 「모양」 으로 막힌다', () => {
    const lower = input({
      values: [
        { code: 'SPAM', label: '스팸', tone: '빨강' },
        { code: 'spam', label: '스팸2', tone: '회색' },
      ],
    })
    expect(validateCodeGroup(lower).values).toBe(`코드는 ${CODE_RULE_TEXT}.`)
  })
})
