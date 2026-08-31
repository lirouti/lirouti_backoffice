/**
 * 커맨드 팔레트가 찾는 것 — **화면뿐이다.**
 *
 * ⚠️ **데이터(아이템·회원)는 찾지 않는다.** 그러려면 엔티티를 가로지르는 검색 엔드포인트가
 *    있어야 하는데 없고, 목으로 흉내 내면 **지워 버린 가짜 검색창을 되풀이하는 것**이다
 *    (docs/ARCHITECTURE.md §36.1). 서버가 생기면 이 파일에 두 번째 종류를 더한다.
 */
import { chosung, isChosungQuery, squash } from '@/shared/lib/hangul'

import { canOpen, type Viewer } from './access'
import { NAV } from './nav'
import { SCREENS, sectionOf, type ScreenId } from './screens'

export type PaletteItem = {
  screen: ScreenId
  /** 화면 이름 (`감사 로그`) */
  label: string
  /**
   * 사이드바 그룹 이름 (`관리자`). 같은 이름의 화면을 가르고, 그룹 이름으로도 찾게 한다.
   *
   * **사이드바 밖의 화면은 빈 문자열이다** — 내 계정 보안처럼 어느 그룹에도 안 속하는 것.
   */
  group: string
  path: string
}

/** 이 화면이 속한 사이드바 그룹 이름. 없으면 `''` */
function groupOf(id: ScreenId): string {
  const section = sectionOf(id)
  const found = NAV.find(
    (g) => g.screen === section || (g.children ?? []).some((c) => c.screen === section),
  )
  return found?.label ?? ''
}

/**
 * 열 수 있는 화면 전부 — **정의 순서 그대로**(`SCREENS` 가 사이드바 차례로 적혀 있다).
 *
 * ⚠️ **경로에 파라미터가 있는 화면만 뺀다.** `/items/:itemId` 는 **id 없이는 열 수 없어서**,
 *    목록에 두면 눌렀을 때 `/items/:itemId` 라는 글자 그대로의 주소로 간다.
 *
 * ⚠️ **사이드바에 없는 화면도 넣는다.** 「아이템 등록」·「쿠폰 발급」·「관리자 초대」 처럼
 *    **팔레트로 제일 가고 싶은 곳들이 사이드바에는 없다** — 목록을 거쳐야만 닿는다.
 *    그룹 이름은 `section` 을 따라가 찾고, 그래도 없으면 비워 둔다.
 */
export function openableScreens(): PaletteItem[] {
  return (Object.keys(SCREENS) as ScreenId[])
    .filter((id) => !SCREENS[id].path.includes('/:'))
    .map((id) => ({ screen: id, label: SCREENS[id].label, group: groupOf(id), path: SCREENS[id].path }))
}

/**
 * 얼마나 잘 맞는가. 낮을수록 앞. 안 맞으면 `null`.
 *
 * 앞에서부터 맞는 것을 위에 둔다 — 「코드」 를 치면 「코드 그룹 …」 이 「공통 코드」 보다
 * 먼저 나와야 손이 멈추지 않는다.
 */
function score(item: PaletteItem, q: string): number | null {
  if (isChosungQuery(q)) {
    const cho = squash(chosung(`${item.label} ${item.group}`))
    const at = squash(chosung(item.label)).indexOf(q)
    if (at === 0) return 0
    if (at > 0) return 1
    return cho.includes(q) ? 2 : null
  }

  const label = squash(item.label)
  const at = label.indexOf(q)
  if (at === 0) return 0
  if (at > 0) return 1
  // 그룹 이름으로도 찾는다 — 「코드」 를 치면 그 그룹의 화면이 다 나와야 한다.
  return squash(item.group).includes(q) ? 2 : null
}

/**
 * 팔레트 목록.
 *
 * ⚠️ **권한 밖 화면은 아예 안 보인다.** 보여 주고 막으면 운영자가 **있는 줄도 몰랐던 화면의
 *    존재**를 알게 되고, 눌러도 튕겨서 고장으로 읽힌다.
 *
 * @param q 검색어. 비어 있으면 열 수 있는 화면 전부(사이드바 순서)
 */
export function searchScreens(viewer: Viewer, q: string): PaletteItem[] {
  const allowed = openableScreens().filter((it) => canOpen(viewer, it.screen))
  const needle = squash(q)
  if (!needle) return allowed

  return allowed
    .map((item) => ({ item, rank: score(item, needle) }))
    .filter((r): r is { item: PaletteItem; rank: number } => r.rank !== null)
    // ⚠️ **같은 점수면 사이드바 순서를 지킨다.** 정렬이 안정적이지 않으면 같은 검색어에
    //    매번 다른 차례가 나와서, 손가락이 기억한 자리를 못 믿게 된다.
    .sort((a, b) => a.rank - b.rank)
    .map((r) => r.item)
}
