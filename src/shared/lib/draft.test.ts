/**
 * 초안 모양 검사 (docs/ARCHITECTURE.md §33).
 *
 * 여기가 헐거우면 **`undefined` 가 폼에 들어가 그대로 저장된다.** `sessionStorage` 는
 * 사용자가 직접 고칠 수 있고, 입력 타입을 바꾸면 예전 초안이 남아 있다.
 */
import { describe, expect, it } from 'vitest'

import { changed, draftKey, readDraft, sameShape, writeDraft } from './draft'

const SAMPLE = {
  name: '',
  price: 0,
  tier: 'FREE',
  flags: { shop: true, gift: false },
  tags: ['a'],
}

describe('draftKey', () => {
  // 한 칸을 나눠 쓰면 등록을 쓰다 만 사람이 수정 화면에서 남의 초안을 받는다.
  it('⚠️ 화면마다 칸이 다르다', () => {
    expect(draftKey('items:new')).not.toBe(draftKey('items:3'))
  })
})

describe('sameShape', () => {
  it('같은 모양이면 통과한다', () => {
    expect(sameShape({ ...SAMPLE, name: '성좌의 로브', price: 720 }, SAMPLE)).toBe(true)
  })

  // 이게 이 파일의 존재 이유다 — 빠진 칸은 폼에서 `undefined` 가 된다.
  it('⚠️ 칸이 빠지면 버린다', () => {
    const missing = { ...SAMPLE }
    delete (missing as Partial<typeof SAMPLE>).price
    expect(sameShape(missing, SAMPLE)).toBe(false)
  })

  // 우리가 칸을 지웠는데 예전 초안에 남아 있으면, 되살릴 때 없는 칸이 딸려 들어온다.
  it('⚠️ 모르는 칸이 있어도 버린다', () => {
    expect(sameShape({ ...SAMPLE, gone: 1 }, SAMPLE)).toBe(false)
  })

  it('⚠️ 타입이 다르면 버린다 — 숫자 자리의 문자열', () => {
    expect(sameShape({ ...SAMPLE, price: '720' }, SAMPLE)).toBe(false)
  })

  it('⚠️ `null` 은 문자열 자리를 채우지 못한다', () => {
    expect(sameShape({ ...SAMPLE, name: null }, SAMPLE)).toBe(false)
  })

  // `JSON.stringify(NaN)` 은 `null` 이지만, 손으로 고친 값은 들어올 수 있다.
  it('⚠️ `NaN` 과 `Infinity` 는 숫자로 치지 않는다 — 계산이 조용히 무너진다', () => {
    expect(sameShape({ ...SAMPLE, price: NaN }, SAMPLE)).toBe(false)
    expect(sameShape({ ...SAMPLE, price: Infinity }, SAMPLE)).toBe(false)
  })

  it('중첩된 객체도 끝까지 본다', () => {
    expect(sameShape({ ...SAMPLE, flags: { shop: true, gift: true } }, SAMPLE)).toBe(true)
    expect(sameShape({ ...SAMPLE, flags: { shop: true } }, SAMPLE)).toBe(false)
    expect(sameShape({ ...SAMPLE, flags: { shop: true, gift: 'yes' } }, SAMPLE)).toBe(false)
  })

  it('배열은 원소까지 본다', () => {
    expect(sameShape({ ...SAMPLE, tags: ['x', 'y'] }, SAMPLE)).toBe(true)
    expect(sameShape({ ...SAMPLE, tags: [] }, SAMPLE)).toBe(true)
    expect(sameShape({ ...SAMPLE, tags: [1] }, SAMPLE)).toBe(false)
  })

  // 배열과 객체는 `typeof` 가 둘 다 'object' 다. **빈 것끼리는 키 개수도 같아서**
  // 따로 가르지 않으면 그냥 통과한다 — 칸이 `{}` 에서 `[]` 로 바뀌는 건 실제로 있는 변경이다.
  it('⚠️ 빈 객체 자리에 빈 배열이 들어와도 버린다', () => {
    expect(sameShape([], {})).toBe(false)
    expect(sameShape({ v: [] }, { v: {} })).toBe(false)
  })

  it('⚠️ 배열과 객체를 섞지 않는다', () => {
    expect(sameShape({ ...SAMPLE, flags: [] }, SAMPLE)).toBe(false)
    expect(sameShape({ ...SAMPLE, tags: {} }, SAMPLE)).toBe(false)
  })

  // 비교할 것이 없으므로 못 본다. 화면이 모르는 값을 안 그리는 쪽으로 견딘다.
  it('⚠️ 빈 배열이 표본이면 원소를 못 본다', () => {
    expect(sameShape({ list: [1, 2] }, { list: [] })).toBe(true)
  })

  it('표본이 `null` 이면 `null` 만 받는다', () => {
    expect(sameShape({ v: null }, { v: null })).toBe(true)
    expect(sameShape({ v: 'x' }, { v: null })).toBe(false)
  })
})

describe('readDraft', () => {
  it('저장한 것을 그대로 돌려준다', () => {
    const v = { ...SAMPLE, name: '성좌의 로브' }
    expect(readDraft(writeDraft(v), SAMPLE)).toEqual(v)
  })

  it('없으면 null', () => {
    expect(readDraft(null, SAMPLE)).toBeNull()
    expect(readDraft('', SAMPLE)).toBeNull()
  })

  // 사용자가 직접 고칠 수 있는 자리라 깨진 JSON 이 들어온다.
  it('⚠️ 깨진 JSON 에 터지지 않는다', () => {
    expect(readDraft('{oops', SAMPLE)).toBeNull()
  })

  it('⚠️ 객체가 아니면 버린다', () => {
    expect(readDraft('42', SAMPLE)).toBeNull()
    expect(readDraft('null', SAMPLE)).toBeNull()
    expect(readDraft('[]', SAMPLE)).toBeNull()
  })

  // 모양으로는 `'WING'` 을 못 거른다 — 열거값은 부르는 쪽이 안다.
  it('⚠️ `refine` 이 값 제약을 본다', () => {
    const ok = (v: typeof SAMPLE) => v.tier === 'FREE' || v.tier === 'PAID'
    expect(readDraft(writeDraft({ ...SAMPLE, tier: 'PAID' }), SAMPLE, ok)).not.toBeNull()
    expect(readDraft(writeDraft({ ...SAMPLE, tier: 'WING' }), SAMPLE, ok)).toBeNull()
    // refine 이 없으면 그대로 통과한다 — 모양은 맞기 때문이다
    expect(readDraft(writeDraft({ ...SAMPLE, tier: 'WING' }), SAMPLE)).not.toBeNull()
  })
})

describe('changed', () => {
  it('같으면 안 더럽다', () => {
    expect(changed({ ...SAMPLE }, SAMPLE)).toBe(false)
  })

  it('한 칸만 달라도 더럽다', () => {
    expect(changed({ ...SAMPLE, name: 'x' }, SAMPLE)).toBe(true)
    expect(changed({ ...SAMPLE, flags: { shop: false, gift: false } }, SAMPLE)).toBe(true)
  })

  // 되돌려 놓으면 안 더럽다 — 고쳤다 원래대로 돌린 사람에게 경고를 띄우지 않는다.
  it('⚠️ 되돌리면 다시 깨끗해진다', () => {
    const edited = { ...SAMPLE, name: 'x' }
    expect(changed(edited, SAMPLE)).toBe(true)
    expect(changed({ ...edited, name: SAMPLE.name }, SAMPLE)).toBe(false)
  })
})
