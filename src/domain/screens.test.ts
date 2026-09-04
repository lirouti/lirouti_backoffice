import { describe, expect, it } from 'vitest'

import {
  isScreenId,
  matchScreen,
  paramOf,
  SCREEN_IDS,
  SCREENS,
  sectionOf,
  type ScreenMeta,
} from './screens'

/**
 * 경로 매칭은 **구체성 정렬**에 기대고 있다. 화면이 늘 때마다 정렬 결과가 바뀌는데,
 * 틀려도 예외가 나지 않고 그냥 엉뚱한 화면이 뜬다 — 조용히 깨지는 종류라 여기서 잡는다.
 */
describe('matchScreen', () => {
  it('리터럴 경로가 :param 보다 먼저 잡힌다', () => {
    // `/items/new` 는 `/items/:itemId` 에도 맞는다. 정렬이 뒤집히면 등록 화면 대신 상세가 뜬다.
    expect(matchScreen('/items/new')).toBe('itemnew')
    expect(matchScreen('/items/7')).toBe('item')
    expect(matchScreen('/challenges/new')).toBe('chalnew')
    expect(matchScreen('/challenges/7')).toBe('chaldet')
    expect(matchScreen('/ops/push/new')).toBe('pushnew')
    expect(matchScreen('/ops/push/7')).toBe('pushdet')
  })

  it('세그먼트 수가 다르면 맞지 않는다', () => {
    expect(matchScreen('/items')).toBe('items')
    expect(matchScreen('/items/7/extra')).toBeNull()
    expect(matchScreen('/nope')).toBeNull()
  })

  it('빈 동적 세그먼트는 받지 않는다', () => {
    // `/items/` 로 끝나면 마지막이 빈 문자열이다. 이걸 통과시키면 id 없는 상세가 열린다.
    expect(matchScreen('/items/')).toBeNull()
  })

  it('등록된 모든 화면은 자기 경로로 자기를 찾는다', () => {
    // 새 화면을 넣다가 경로가 겹치면 여기서 걸린다.
    for (const id of SCREEN_IDS) {
      const sample = SCREENS[id].path.replace(/:[^/]+/g, '7')
      expect(matchScreen(sample), `${id} (${SCREENS[id].path})`).toBe(id)
    }
  })
})

describe('sectionOf', () => {
  it('상세 화면은 부모 목록으로 환원된다', () => {
    expect(sectionOf('item')).toBe('items')
    expect(sectionOf('itemnew')).toBe('items')
    expect(sectionOf('qnadet')).toBe('qna')
  })

  it('목록 화면은 자기 자신이 섹션이다', () => {
    expect(sectionOf('items')).toBe('items')
    expect(sectionOf('dash')).toBe('dash')
  })

  it('section 은 실재하는 화면 id 여야 한다', () => {
    // 오타가 나면 sectionOf 가 조용히 자기 자신을 돌려준다 — 사이드바 활성 표시만 안 켜진다.
    for (const id of SCREEN_IDS) {
      // `as const satisfies` 라서 section 없는 항목의 리터럴 타입엔 그 키가 아예 없다.
      const s = (SCREENS[id] as ScreenMeta).section
      if (s) expect(SCREEN_IDS, `${id}.section`).toContain(s)
    }
  })
})

describe('paramOf', () => {
  it('마지막 동적 세그먼트를 뽑는다', () => {
    expect(paramOf('/items/7')).toBe('7')
    expect(paramOf('/support/inquiries/42')).toBe('42')
  })

  it('동적 세그먼트가 없으면 null', () => {
    expect(paramOf('/items')).toBeNull()
    expect(paramOf('/items/new')).toBeNull()
    expect(paramOf('/nope/1')).toBeNull()
  })
})

describe('isScreenId', () => {
  it('등록된 화면 id 를 통과시킨다', () => {
    expect(isScreenId('dash')).toBe(true)
    expect(isScreenId('items')).toBe(true)
  })

  /**
   * `v in SCREENS` 는 **프로토타입 체인까지 본다.** `'toString'` 이 `ScreenId` 로
   * 좁혀지면 이후 `SCREENS[id]` 가 화면이 아니라 함수를 집는다. 타입 서술어는
   * TS 가 검증해 주지 않아서, 몸통이 거짓말을 하면 컴파일은 통과하고 런타임에 깨진다.
   */
  it('프로토타입 속성을 화면 id 로 오인하지 않는다', () => {
    for (const v of ['toString', 'constructor', 'hasOwnProperty', 'valueOf', '__proto__']) {
      expect(isScreenId(v), v).toBe(false)
    }
  })

  it('모르는 문자열은 거부한다', () => {
    expect(isScreenId('nope')).toBe(false)
    expect(isScreenId('')).toBe(false)
  })
})
