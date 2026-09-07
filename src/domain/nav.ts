/**
 * 사이드바 내비게이션 트리. 화면 id 는 전부 `screens.ts` 에서 온다.
 *
 * `count` 는 원본 디자인의 배지 숫자를 그대로 옮긴 값(하드코딩)이다.
 * 실서버 연동 시 이 자리에 집계 API 결과가 들어간다.
 */
import type { IconId } from '@/assets/icons'

import { sectionOf, type ScopeId, type ScreenId } from './screens'

export type NavChild = {
  screen: ScreenId
  count?: number
}

/**
 * 화면별 **지금 사람을 기다리는 건수**. 셸이 밖에서 주입받는다.
 *
 * ⚠️ **`NavChild.count` 와 다른 것을 센다.** `count` 는 「그 화면에 항목이 몇 개 있는가」
 *    라 늘 같은 값이고, 이건 「그중 몇 개가 나를 기다리는가」 다. 그래서 색도 다르다 —
 *    앞은 회색, 이건 위험색이다.
 *
 * ⚠️ **0 은 넣지 않는다.** 「0건이 기다린다」 를 배지로 그리면 아무 일도 없다는 사실을
 *    눈에 띄게 알리는 꼴이라, 배지가 눈에 띄는 이유 자체가 사라진다.
 */
export type NavAlerts = Partial<Record<ScreenId, number>>

export type NavGroup = {
  label: string
  icon: IconId
  scope: ScopeId
  /** 자식이 없는 단일 화면 그룹 */
  screen?: ScreenId
  children?: NavChild[]
}

export const NAV: NavGroup[] = [
  { label: '지표', icon: 'ic_chart', scope: 'dash', screen: 'dash' },
  { label: '회원', icon: 'ic_user', scope: 'user', children: [{ screen: 'users', count: 12 }] },
  {
    label: '모더레이션',
    icon: 'ic_shield2',
    scope: 'mod',
    // ⚠️ **`count` 를 두지 않는다.** 여기는 밀린 신고 수가 실제로 들어오는 자리라
    //    (`NavAlerts`), 박아 둔 숫자를 같이 그리면 둘 중 어느 것이 사실인지 알 수 없다.
    children: [{ screen: 'mod' }, { screen: 'ai' }],
  },
  {
    label: '캐릭터',
    icon: 'ic_bird',
    scope: 'char',
    children: [{ screen: 'rig' }, { screen: 'growth' }, { screen: 'species', count: 13 }],
  },
  {
    label: '아이템',
    icon: 'ic_shirt',
    scope: 'items',
    children: [{ screen: 'items', count: 50 }],
  },
  {
    label: '배경 · 둥지',
    icon: 'ic_image',
    scope: 'bg',
    children: [
      { screen: 'bg', count: 20 },
      { screen: 'nest', count: 3 },
    ],
  },
  { label: '성장 · 레벨', icon: 'ic_up', scope: 'levels', children: [{ screen: 'levels' }] },
  {
    label: '챌린지',
    icon: 'ic_flag',
    scope: 'chal',
    children: [{ screen: 'chal', count: 18 }],
  },
  { label: '업적', icon: 'ic_medal', scope: 'ach', children: [{ screen: 'ach', count: 12 }] },
  { label: '결제', icon: 'ic_card', scope: 'pay', children: [{ screen: 'pay', count: 12 }] },
  {
    label: '재화 · 상점',
    icon: 'ic_gem',
    scope: 'shop',
    children: [{ screen: 'gems' }, { screen: 'shop' }],
  },
  {
    label: '운영',
    icon: 'ic_cog',
    scope: 'ops',
    children: [
      { screen: 'notice' },
      { screen: 'event' },
      { screen: 'push', count: 2 },
      { screen: 'grant' },
    ],
  },
  {
    label: '고객 소통',
    icon: 'ic_chat',
    scope: 'cs',
    children: [
      { screen: 'qna', count: 4 },
      { screen: 'faq', count: 17 },
    ],
  },
  {
    label: '코드',
    icon: 'ic_code',
    scope: 'code',
    children: [
      { screen: 'codes', count: 9 },
      { screen: 'coupons', count: 6 },
    ],
  },
  {
    label: '관리자',
    icon: 'ic_shield',
    scope: 'admin',
    children: [{ screen: 'admins', count: 7 }, { screen: 'audit' }, { screen: 'ui' }],
  },
]

/**
 * 화면이 속한 내비 그룹.
 *
 * 상세 화면(`item`, `chaldet` …)은 내비에 직접 등장하지 않으므로 부모 섹션으로 환원해 찾는다.
 * `nav` 를 인자로 받는 이유는 권한 필터링된 트리에서도 같은 조회를 써야 하기 때문이다.
 */
export function groupOf(id: ScreenId, nav: NavGroup[] = NAV): NavGroup | undefined {
  const sec = sectionOf(id)
  return nav.find((g) => g.screen === sec || g.children?.some((c) => c.screen === sec))
}
