import { describe, expect, it } from 'vitest'

import {
  canAccess,
  canOpen,
  firstScreen,
  isLoginResult,
  isViewer,
  TOP_VIEWER,
  validateCredentials,
  visibleNav,
  type Viewer,
} from './access'
import { NAV } from './nav'
import { SCREEN_IDS, SCREENS } from './screens'

/**
 * ⚠️ 여기서 검증하는 건 **UI 게이팅**이지 보안이 아니다 (실제 판정은 서버).
 *    그래도 틀리면 운영자에게 안 보여야 할 메뉴가 보이거나, 반대로 자기 화면이 사라진다.
 */
const operator: Viewer = {
  role: 'operator',
  name: '박라이브',
  email: 'op@riruti.co',
  scopes: ['items', 'chal'],
}

describe('canAccess', () => {
  it('최고 관리자는 전부 통과', () => {
    for (const id of SCREEN_IDS) expect(canOpen(TOP_VIEWER, id), id).toBe(true)
  })

  it('운영자는 가진 스코프만', () => {
    expect(canAccess(operator, 'items')).toBe(true)
    expect(canAccess(operator, 'chal')).toBe(true)
    expect(canAccess(operator, 'pay')).toBe(false)
  })

  it('admin 스코프는 스코프에 넣어줘도 운영자에게 막힌다', () => {
    // 관리자 모듈은 위임 대상이 아니다 — 실수로 스코프가 붙어도 열리면 안 된다.
    const rogue: Viewer = { ...operator, scopes: [...operator.scopes, 'admin'] }
    expect(canAccess(rogue, 'admin')).toBe(false)
  })

  it('me 스코프는 스코프가 하나도 없어도 통과', () => {
    // 자기 계정 보안(2단계 인증)은 권한과 무관하다. 막히면 2FA 를 켤 방법이 사라진다.
    const noScope: Viewer = { ...operator, scopes: [] }
    expect(canAccess(noScope, 'me')).toBe(true)
    expect(canOpen(noScope, 'security')).toBe(true)
  })
})

describe('visibleNav · firstScreen', () => {
  it('운영자 내비는 가진 스코프 그룹만 남는다', () => {
    const labels = visibleNav(operator).map((g) => g.scope)
    expect(labels).toEqual(['items', 'chal'])
  })

  it('최고 관리자는 전체 내비', () => {
    expect(visibleNav(TOP_VIEWER)).toHaveLength(NAV.length)
  })

  it('첫 화면은 실제로 열 수 있는 화면이다', () => {
    // 권한 밖 URL 진입 시 보낼 곳이라, 여기가 또 권한 밖이면 리다이렉트가 무한히 돈다.
    for (const v of [TOP_VIEWER, operator, { ...operator, scopes: [] } as Viewer]) {
      const id = firstScreen(v)
      expect(canOpen(v, id), `${v.role}/${v.scopes.join()} → ${id}`).toBe(true)
    }
  })

  it('내비가 가리키는 화면은 전부 실재한다', () => {
    for (const g of NAV) {
      const ids = g.screen ? [g.screen] : (g.children ?? []).map((c) => c.screen)
      expect(ids.length, g.label).toBeGreaterThan(0)
      for (const id of ids) expect(SCREENS[id], `${g.label} → ${id}`).toBeDefined()
    }
  })
})

describe('validateCredentials', () => {
  it('통과하면 null', () => {
    expect(validateCredentials({ email: 'a@riruti.co', password: '12345678' })).toBeNull()
  })

  it('빈 값 · 형식 · 길이를 각각 잡는다', () => {
    expect(validateCredentials({ email: '', password: '' })).toContain('모두 입력')
    expect(validateCredentials({ email: 'nope', password: '12345678' })).toContain('이메일 형식')
    expect(validateCredentials({ email: 'a@riruti.co', password: '1234567' })).toContain('8자 이상')
  })
})

/**
 * `http.post<Viewer>()` 의 제네릭은 **컴파일 타임 단언일 뿐 런타임 검증이 아니다.**
 * 서버가 다른 모양을 주면 `undefined` 가 그대로 `viewerStore` 에 들어가 권한 판정이
 * 조용히 어긋난다. 인증 경계라 여기만은 값을 믿지 않는다.
 */
describe('isViewer', () => {
  const ok = { role: 'top', name: '김하늘', email: 'sky@riruti.co', scopes: [] }

  it('온전한 값만 통과시킨다', () => {
    expect(isViewer(ok)).toBe(true)
    expect(isViewer({ ...ok, role: 'operator', scopes: ['items'] })).toBe(true)
  })

  it('필드가 빠지거나 역할이 낯설면 거부한다', () => {
    expect(isViewer({ ...ok, role: 'admin' })).toBe(false)
    expect(isViewer({ ...ok, scopes: undefined })).toBe(false)
    expect(isViewer({ ...ok, email: undefined })).toBe(false)
    expect(isViewer({ ...ok, scopes: [1, 2] })).toBe(false)
  })

  it('객체가 아니면 거부한다', () => {
    for (const v of [null, undefined, '문자열', 42, []]) expect(isViewer(v)).toBe(false)
  })

  /**
   * 스코프 문자열이 **아는 값인지는 보지 않는다.** 서버가 우리보다 먼저 새 스코프를
   * 추가할 수 있고, 모르는 스코프는 `canAccess` 에서 어차피 매칭되지 않아 해가 없다.
   * 여기서 막으면 배포 순서에 결합이 생긴다.
   */
  it('모르는 스코프가 있어도 통과시키고, 그 스코프는 아무것도 열지 못한다', () => {
    const v = { ...ok, role: 'operator' as const, scopes: ['미래스코프'] }
    expect(isViewer(v)).toBe(true)
    expect(canAccess(v as Viewer, 'items')).toBe(false)
  })
})

describe('isLoginResult', () => {
  const viewer = { role: 'top', name: '김하늘', email: 'sky@riruti.co', scopes: [] }

  it('두 갈래를 통과시킨다', () => {
    expect(isLoginResult({ status: 'totp_required', challenge: 'abc' })).toBe(true)
    expect(isLoginResult({ status: 'authenticated', viewer })).toBe(true)
  })

  /** 이게 통과하면 `finish(undefined)` 로 스토어에 쓰레기가 들어간다. */
  it('authenticated 인데 viewer 가 없으면 거부한다', () => {
    expect(isLoginResult({ status: 'authenticated' })).toBe(false)
    expect(isLoginResult({ status: 'authenticated', viewer: { role: 'top' } })).toBe(false)
  })

  /** 빈 challenge 는 2차에서 쓸 수 없다 — 화면이 헛돈다. */
  it('challenge 가 비어 있으면 거부한다', () => {
    expect(isLoginResult({ status: 'totp_required', challenge: '' })).toBe(false)
  })

  it('모르는 status 나 객체가 아니면 거부한다', () => {
    expect(isLoginResult({ status: 'ok' })).toBe(false)
    expect(isLoginResult({})).toBe(false)
    expect(isLoginResult(null)).toBe(false)
  })
})
