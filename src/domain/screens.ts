/**
 * 화면 메타 — **단일 소스**.
 *
 * 원본은 같은 정보를 NAV · FILEOF · SCRL · CRUMB 네 군데에 나눠 들고 있었다.
 * 라벨·경로·권한이 흩어지면 반드시 어긋나므로 여기 하나로 합친다.
 * 내비게이션 트리, 브레드크럼, 탭바, 권한 게이트, 라우터가 전부 이 맵에서 파생된다.
 */

/**
 * 권한 단위. 대부분 사이드바 그룹과 1:1 대응한다.
 *
 * `me` 만 예외다 — 사이드바 그룹이 아니라 **자기 계정 설정**이고, 권한과 무관하게
 * 누구나 열 수 있다 (`canAccess`). 내비에 넣지 않고 사이드바 하단 프로필에서 들어간다.
 */
export type ScopeId =
  | 'dash'
  | 'user'
  | 'mod'
  | 'char'
  | 'items'
  | 'bg'
  | 'levels'
  | 'chal'
  | 'ach'
  | 'pay'
  | 'shop'
  | 'ops'
  | 'cs'
  | 'code'
  | 'admin'
  | 'me'

export type ScreenMeta = {
  /** react-router 경로 패턴 */
  path: string
  /** 브레드크럼 · 탭 라벨 */
  label: string
  scope: ScopeId
  /**
   * 탭바가 접어 넣을 부모 섹션(화면 id).
   * 상세 화면을 별도 탭으로 열지 않기 위한 것 — `/items/3` 을 열어도 탭은 "아이템 목록" 하나다.
   * 비워두면 자기 자신이 섹션.
   */
  section?: string
}

export const SCREENS = {
  dash: { path: '/dashboard', label: '지표', scope: 'dash' },

  users: { path: '/users', label: '회원 목록', scope: 'user' },
  user: { path: '/users/:userId', label: '회원 상세', scope: 'user', section: 'users' },

  mod: { path: '/moderation/reports', label: '신고 처리', scope: 'mod' },
  ai: { path: '/moderation/ai', label: 'AI 심사', scope: 'mod' },

  rig: { path: '/characters/rig', label: '리그 · 슬롯', scope: 'char' },
  growth: { path: '/characters/growth', label: '성장 단계', scope: 'char' },
  species: { path: '/characters/species', label: '캐릭터 종류', scope: 'char' },
  speciesnew: {
    path: '/characters/species/new',
    label: '종 등록',
    scope: 'char',
    section: 'species',
  },
  speciesdet: {
    path: '/characters/species/:speciesId',
    label: '종 상세',
    scope: 'char',
    section: 'species',
  },

  items: { path: '/items', label: '아이템 목록', scope: 'items' },
  itemnew: { path: '/items/new', label: '아이템 등록', scope: 'items', section: 'items' },
  item: { path: '/items/:itemId', label: '아이템 상세', scope: 'items', section: 'items' },
  itemedit: { path: '/items/:itemId/edit', label: '아이템 수정', scope: 'items', section: 'items' },

  bg: { path: '/backgrounds', label: '배경', scope: 'bg' },
  nest: { path: '/nests', label: '둥지', scope: 'bg' },

  levels: { path: '/levels', label: '레벨 테이블', scope: 'levels' },

  chal: { path: '/challenges', label: '챌린지 목록', scope: 'chal' },
  chalnew: { path: '/challenges/new', label: '챌린지 등록', scope: 'chal', section: 'chal' },
  chaldet: {
    path: '/challenges/:chalId',
    label: '챌린지 상세',
    scope: 'chal',
    section: 'chal',
  },

  ach: { path: '/achievements', label: '업적 목록', scope: 'ach' },

  pay: { path: '/payments', label: '결제 내역', scope: 'pay' },
  paydet: { path: '/payments/:payId', label: '결제 상세', scope: 'pay', section: 'pay' },

  gems: { path: '/shop/gems', label: '젬 상품', scope: 'shop' },
  shop: { path: '/shop/display', label: '상점 진열', scope: 'shop' },

  notice: { path: '/ops/notices', label: '공지', scope: 'ops' },
  event: { path: '/ops/events', label: '이벤트', scope: 'ops' },
  push: { path: '/ops/push', label: '푸시 알림', scope: 'ops' },
  pushnew: { path: '/ops/push/new', label: '알림 작성', scope: 'ops', section: 'push' },
  pushdet: { path: '/ops/push/:pushId', label: '알림 상세', scope: 'ops', section: 'push' },
  grant: { path: '/ops/grants', label: '지급 · 회수', scope: 'ops' },

  qna: { path: '/support/inquiries', label: '1:1 문의', scope: 'cs' },
  qnadet: {
    path: '/support/inquiries/:qnaId',
    label: '문의 상세',
    scope: 'cs',
    section: 'qna',
  },
  faq: { path: '/support/faq', label: 'FAQ', scope: 'cs' },
  faqnew: { path: '/support/faq/edit', label: 'FAQ 편집', scope: 'cs', section: 'faq' },

  codes: { path: '/codes', label: '공통 코드', scope: 'code' },
  codenew: { path: '/codes/new', label: '코드 그룹 추가', scope: 'code', section: 'codes' },
  codedet: { path: '/codes/:codeId', label: '코드 그룹 상세', scope: 'code', section: 'codes' },
  coupons: { path: '/coupons', label: '쿠폰 코드', scope: 'code' },
  couponnew: { path: '/coupons/new', label: '쿠폰 발급', scope: 'code', section: 'coupons' },
  coupondet: {
    path: '/coupons/:couponId',
    label: '쿠폰 상세',
    scope: 'code',
    section: 'coupons',
  },

  admins: { path: '/admins', label: '관리자 계정', scope: 'admin' },
  adminnew: { path: '/admins/new', label: '관리자 초대', scope: 'admin', section: 'admins' },
  admindet: {
    path: '/admins/:adminId',
    label: '관리자 상세',
    scope: 'admin',
    section: 'admins',
  },
  audit: { path: '/audit', label: '감사 로그', scope: 'admin' },
  ui: { path: '/ui-kit', label: 'UI 컴포넌트', scope: 'admin' },

  security: { path: '/security', label: '내 계정 보안', scope: 'me' },
} as const satisfies Record<string, ScreenMeta>

/**
 * 로그인 경로.
 *
 * `SCREENS` 에 넣지 않는다 — SCREENS 는 **어드민 셸 안의 화면들**이고, 각 항목이
 * 내비·탭·브레드크럼·권한 스코프를 갖는다. 로그인은 셸 밖이라 그 중 하나도 해당되지 않는다.
 */
export const LOGIN_PATH = '/login'

export type ScreenId = keyof typeof SCREENS

export const SCREEN_IDS = Object.keys(SCREENS) as ScreenId[]

/**
 * 이 문자열이 등록된 화면 id 인가.
 *
 * ⚠️ **`v in SCREENS` 를 쓰면 안 된다.** 프로토타입 체인까지 보기 때문에
 *    `'toString'` 도 `true` 가 되어 `ScreenId` 로 좁혀지고, 이후 `SCREENS[id]`
 *    조회가 화면이 아닌 함수를 집는다. 타입 서술어는 TS 가 검증해 주지 않아서
 *    몸통이 거짓말을 하면 컴파일은 통과하고 런타임에 깨진다.
 */
export const isScreenId = (v: string): v is ScreenId => Object.hasOwn(SCREENS, v)

/**
 * 부모 섹션 id. 상세 화면(`item`)은 목록 화면(`items`)으로 환원된다.
 *
 * **사이드바 활성 표시 · 브레드크럼 · 탭바가 모두 이걸 쓴다.** 셋이 같은 기준을
 * 봐야 "탭 하나 = 서브 메뉴 하나" 가 성립한다 (docs/ARCHITECTURE.md §6.3).
 * `/items/3` 과 `/items/7` 은 같은 탭에서 화면만 바뀐다.
 */
export function sectionOf(id: ScreenId): ScreenId {
  const s = (SCREENS[id] as ScreenMeta).section
  return s && isScreenId(s) ? s : id
}

/**
 * 경로 패턴 하나가 실제 경로와 맞는지 본다.
 * `:param` 세그먼트는 비어 있지 않은 아무 값이나 받는다.
 */
function matches(pattern: string, pathname: string): boolean {
  const p = pattern.split('/')
  const a = pathname.split('/')
  if (p.length !== a.length) return false
  return p.every((seg, i) => (seg.startsWith(':') ? a[i]!.length > 0 : seg === a[i]))
}

/** 리터럴 세그먼트가 많을수록 구체적이다 — `/items/new` 가 `/items/:itemId` 보다 먼저 잡혀야 한다. */
const SPECIFICITY = [...SCREEN_IDS].sort((x, y) => {
  const params = (id: ScreenId) =>
    SCREENS[id].path.split('/').filter((s) => s.startsWith(':')).length
  return params(x) - params(y) || SCREENS[y].path.length - SCREENS[x].path.length
})

/**
 * 실제 경로 → 화면 id. 못 찾으면 null.
 *
 * react-router 의 `matchPath` 를 쓰지 않는 이유는 `domain` 이 라우터를 몰라야 하기 때문이다.
 * 우리 경로는 `:param` 한 겹뿐이라 직접 맞추는 게 더 간단하다.
 */
export function matchScreen(pathname: string): ScreenId | null {
  return SPECIFICITY.find((id) => matches(SCREENS[id].path, pathname)) ?? null
}

/** 경로에서 마지막 동적 세그먼트 값을 뽑는다. 탭 라벨의 식별자로 쓴다. */
export function paramOf(pathname: string): string | null {
  const id = matchScreen(pathname)
  if (!id) return null
  const p = SCREENS[id].path.split('/')
  const a = pathname.split('/')
  for (let i = p.length - 1; i >= 0; i--) if (p[i]!.startsWith(':')) return a[i]!
  return null
}
