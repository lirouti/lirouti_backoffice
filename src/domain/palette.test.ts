/**
 * 커맨드 팔레트 (docs/ARCHITECTURE.md §36).
 *
 * 여기가 틀리면 **열 수 없는 주소로 보내거나, 권한 밖 화면의 존재를 알려 준다.**
 */
import { describe, expect, it } from 'vitest'

import { TOP_VIEWER, type Viewer } from './access'
import { openableScreens, searchScreens } from './palette'
import { SCREENS } from './screens'

const operator: Viewer = {
  role: 'operator',
  name: '최지우',
  email: 'jiwoo@riruti.co',
  scopes: ['char', 'bg', 'levels'],
}

const labels = (v: Viewer, q: string): string[] => searchScreens(v, q).map((i) => i.label)

describe('openableScreens', () => {
  // `/items/:itemId` 를 목록에 두면 눌렀을 때 그 글자 그대로의 주소로 간다.
  it('⚠️ 파라미터가 있는 경로는 하나도 없다', () => {
    expect(openableScreens().every((i) => !i.path.includes('/:'))).toBe(true)
  })

  it('⚠️ 상세 화면이 섞이지 않는다', () => {
    const screens = openableScreens().map((i) => i.screen)
    expect(screens).not.toContain('item')
    expect(screens).not.toContain('user')
    expect(screens).toContain('items')
  })

  // 팔레트로 제일 가고 싶은 곳들이 사이드바에는 없다 — 목록을 거쳐야만 닿는다.
  it('⚠️ 사이드바에 없는 등록 화면도 넣는다', () => {
    const screens = openableScreens().map((i) => i.screen)
    expect(screens).toEqual(expect.arrayContaining(['itemnew', 'couponnew', 'adminnew']))
  })

  // 목록에서 어디 것인지 말하려면 그룹이 필요하다. `section` 을 따라가 찾는다.
  it('⚠️ 사이드바에 없어도 그룹을 찾아 붙인다', () => {
    const found = openableScreens().find((i) => i.screen === 'itemnew')
    expect(found?.group).toBe('아이템')
  })

  // 어느 그룹에도 안 속하는 화면이 있다 — 없는 그룹을 지어내지 않는다.
  it('그룹이 없으면 빈 문자열', () => {
    expect(openableScreens().find((i) => i.screen === 'security')?.group).toBe('')
  })

  // 손가락이 기억한 자리를 못 믿게 되면 팔레트를 안 쓴다.
  it('정의 순서를 지킨다 — 지표가 맨 앞', () => {
    expect(openableScreens()[0]?.screen).toBe('dash')
  })
})

describe('searchScreens · 권한', () => {
  // 보여 주고 막으면 있는 줄도 몰랐던 화면의 존재를 알게 된다.
  it('⚠️ 권한 밖 화면은 아예 안 보인다', () => {
    expect(labels(operator, '')).not.toContain(SCREENS.admins.label)
    expect(labels(operator, '관리자')).toEqual([])
    expect(labels(operator, '')).not.toContain(SCREENS.adminnew.label)
  })

  it('최고 관리자는 전부 본다', () => {
    expect(labels(TOP_VIEWER, '')).toContain(SCREENS.admins.label)
  })

  it('담당 모듈 안의 화면은 보인다', () => {
    expect(labels(operator, '')).toContain(SCREENS.bg.label)
  })
})

describe('searchScreens · 찾기', () => {
  it('빈 검색어는 전부 준다', () => {
    expect(searchScreens(TOP_VIEWER, '')).toHaveLength(openableScreens().length)
  })

  it('이름 일부로 찾는다', () => {
    expect(labels(TOP_VIEWER, '감사')).toEqual(['감사 로그'])
  })

  // ⚠️ **양쪽 다 공백을 지워야 한다.** 찾는 쪽만 지우면 「아이템 목록」 이라고 띄어 친
  //    사람이 못 찾는다 — 검색어에 공백이 있는 쪽이 오히려 흔하다.
  it('⚠️ 공백은 양쪽 다 무시한다', () => {
    expect(labels(TOP_VIEWER, '아이템목록')).toContain('아이템 목록')
    expect(labels(TOP_VIEWER, '아이템 목록')).toContain('아이템 목록')
  })

  it('⚠️ 영문은 대소문자를 가리지 않는다', () => {
    expect(labels(TOP_VIEWER, 'faq')).toContain('FAQ')
    expect(labels(TOP_VIEWER, 'FAQ')).toContain('FAQ')
  })

  // ⚠️ **이름에 없는 말로 찾아야 그룹 검색이 일한 것이다.** 「코드」 로 「공통 코드」 가
  //    나오는 건 이름이 맞은 것이라 아무것도 증명하지 못한다.
  it('⚠️ 이름에 없는 그룹 이름으로도 찾는다', () => {
    expect(labels(TOP_VIEWER, '고객')).toContain('FAQ')
    expect(labels(TOP_VIEWER, '운영')).toContain('공지')
  })

  it('안 맞으면 빈 목록', () => {
    expect(labels(TOP_VIEWER, '없는화면이름')).toEqual([])
  })
})

describe('searchScreens · 초성', () => {
  // 화면이 48개인데 이름이 두세 글자라, 「ㄱㅅ」 로 못 찾으면 팔레트를 안 쓴다.
  it('⚠️ 초성으로 찾는다', () => {
    expect(labels(TOP_VIEWER, 'ㄱㅅ')).toContain('감사 로그')
    expect(labels(TOP_VIEWER, 'ㅎㅇㅁㄹ')).toContain('회원 목록')
  })

  it('⚠️ 초성 검색도 권한을 지킨다', () => {
    expect(labels(operator, 'ㄱㄹㅈ')).toEqual([])
  })

  // 「감사」 까지 쳤으면 초성으로 볼 이유가 없다.
  it('음절을 치면 보통 검색으로 돌아간다', () => {
    expect(labels(TOP_VIEWER, '감사')).toEqual(['감사 로그'])
  })
})

describe('searchScreens · 차례', () => {
  // 「코드」 를 치면 「코드 …」 로 시작하는 것이 먼저 나와야 손이 멈추지 않는다.
  it('⚠️ 앞에서 맞는 것이 위로 온다', () => {
    const found = labels(TOP_VIEWER, '코드')
    expect(found[0]).toBe('코드 그룹 추가')
  })

  // 정렬이 안정적이지 않으면 같은 검색어에 매번 다른 차례가 나온다.
  it('⚠️ 같은 점수면 정의 순서를 지킨다', () => {
    const a = labels(TOP_VIEWER, '목록')
    const b = labels(TOP_VIEWER, '목록')
    expect(a).toEqual(b)
    expect(a.indexOf('회원 목록')).toBeLessThan(a.indexOf('아이템 목록'))
  })
})
