/**
 * 주소 ⇄ 화면 상태. **남이 고친 URL** 과 기본값 생략이 전부다.
 *
 * 북마크는 오래 살고 주소는 손으로 고쳐진다 — 여기서 깨지면 화면이 통째로 안 뜬다.
 */
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_QUERY,
  hasFilter,
  parseItemsQuery,
  patchQuery,
  toSearchParams,
  type ItemsScreenQuery,
} from './query'

const parse = (search: string) => parseItemsQuery(new URLSearchParams(search))
const write = (q: ItemsScreenQuery) => toSearchParams(q).toString()

describe('parseItemsQuery', () => {
  it('빈 주소는 기본값', () => {
    expect(parse('')).toEqual(DEFAULT_QUERY)
  })

  it('아는 값은 그대로 읽는다', () => {
    expect(parse('q=로브&slot=BODY&tier=PAID&view=grid&page=3')).toEqual({
      q: '로브',
      slot: 'BODY',
      tier: 'PAID',
      view: 'grid',
      page: 3,
    })
  })

  it('모르는 값은 버린다 — 남이 고친 주소가 화면을 깨뜨리면 안 된다', () => {
    expect(parse('slot=WING&tier=LEGENDARY&view=hologram')).toEqual(DEFAULT_QUERY)
  })

  it('소문자·빈 값도 아는 값이 아니면 버린다', () => {
    expect(parse('slot=body').slot).toBeUndefined()
    expect(parse('slot=').slot).toBeUndefined()
  })

  it('쪽은 문자열로 오고, 숫자가 아니면 1쪽', () => {
    expect(parse('page=7').page).toBe(7)
    expect(parse('page=2.9').page).toBe(2)
    for (const bad of ['abc', '0', '-3', '', 'NaN', 'Infinity']) {
      expect(parse(`page=${bad}`).page).toBe(1)
    }
  })

  it('⚠️ 검색어의 공백을 건드리지 않는다 — 입력창의 값이 이 결과다', () => {
    expect(parse('q=%20%20로브%20%20').q).toBe('  로브  ')
  })
})

describe('타이핑 왕복', () => {
  // 입력창은 `parse` 의 결과를 그대로 그린다. `parse` 가 `trim()` 하면 사용자가 친
  // 공백이 화면에서 사라지고, 이 목록의 아이템 이름은 전부 공백을 포함한다.
  const type = (text: string) => {
    let shown = ''
    for (const ch of text) shown = parseItemsQuery(toSearchParams({ ...DEFAULT_QUERY, q: shown + ch })).q
    return shown
  }

  it('공백이 든 이름을 그대로 칠 수 있다', () => {
    expect(type('왕실 벨벳')).toBe('왕실 벨벳')
    expect(type('성좌의 로브')).toBe('성좌의 로브')
  })
})

describe('toSearchParams', () => {
  it('기본값은 적지 않는다 — 첫 진입부터 주소창이 지저분해지면 안 된다', () => {
    expect(write(DEFAULT_QUERY)).toBe('')
    expect(write({ ...DEFAULT_QUERY, view: 'list', page: 1 })).toBe('')
  })

  it('공백뿐인 검색어는 적지 않는다 — 조건이 걸린 것처럼 보인다', () => {
    expect(write({ ...DEFAULT_QUERY, q: '   ' })).toBe('')
    expect(write({ ...DEFAULT_QUERY, q: '\t\n' })).toBe('')
  })

  it('값 자체는 다듬지 않는다 — 끝 공백을 털면 입력창에서도 사라진다', () => {
    expect(write({ ...DEFAULT_QUERY, q: '왕실 ' })).toBe('q=%EC%99%95%EC%8B%A4+')
  })

  it('기본과 다른 것만 적는다', () => {
    expect(write({ q: '', slot: 'HEAD', view: 'list', page: 1 })).toBe('slot=HEAD')
    expect(write({ q: '', view: 'grid', page: 4 })).toBe('view=grid&page=4')
  })

  it('왕복해도 같다', () => {
    const cases: ItemsScreenQuery[] = [
      DEFAULT_QUERY,
      { q: '로브', slot: 'BODY', tier: 'PAID', view: 'grid', page: 5 },
      { q: '', slot: 'FACE', view: 'list', page: 2 },
      { q: '티아라', view: 'grid', page: 1 },
    ]
    for (const c of cases) expect(parseItemsQuery(toSearchParams(c))).toEqual(c)
  })
})

describe('patchQuery', () => {
  const at5: ItemsScreenQuery = { q: '', slot: 'HEAD', view: 'list', page: 5 }

  it('쪽만 바꾸면 쪽만 바뀐다', () => {
    expect(patchQuery(at5, { page: 2 })).toEqual({ ...at5, page: 2 })
  })

  it('⚠️ 필터를 바꾸면 1쪽으로 — 5쪽에서 걸렀는데 결과가 2쪽뿐이면 빈 화면이 뜬다', () => {
    expect(patchQuery(at5, { tier: 'PAID' }).page).toBe(1)
    expect(patchQuery(at5, { q: '로브' }).page).toBe(1)
    expect(patchQuery(at5, { slot: undefined }).page).toBe(1)
  })

  it('뷰를 바꿔도 1쪽으로 — 그리드와 목록의 쪽당 개수가 달라질 수 있다', () => {
    expect(patchQuery(at5, { view: 'grid' }).page).toBe(1)
  })

  it('쪽과 필터를 같이 주면 필터 쪽이 이긴다', () => {
    expect(patchQuery(at5, { page: 3, tier: 'PAID' }).page).toBe(1)
  })
})

describe('hasFilter', () => {
  it('조건이 하나라도 있으면 참', () => {
    expect(hasFilter(DEFAULT_QUERY)).toBe(false)
    expect(hasFilter({ ...DEFAULT_QUERY, view: 'grid', page: 9 })).toBe(false)
    expect(hasFilter({ ...DEFAULT_QUERY, q: '로브' })).toBe(true)
    // 공백뿐이면 거르는 쪽이 무시하므로 「필터 초기화」를 띄울 이유가 없다
    expect(hasFilter({ ...DEFAULT_QUERY, q: '   ' })).toBe(false)
    expect(hasFilter({ ...DEFAULT_QUERY, slot: 'HEAD' })).toBe(true)
    expect(hasFilter({ ...DEFAULT_QUERY, tier: 'FREE' })).toBe(true)
  })
})
