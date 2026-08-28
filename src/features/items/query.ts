/**
 * 아이템 목록 화면의 상태 ⇄ URL 변환.
 *
 * **URL 이 원본이다.** keep-alive 가 화면을 살려 두지만 새로고침과 링크 공유는
 * URL 만 살린다 (docs/ARCHITECTURE.md §6.3). 그래서 필터·쪽·뷰를 전부 주소에 둔다.
 *
 * 훅(`useItemsQuery`)에서 이 파일을 갈라낸 이유는 **테스트**다 — 훅은 jsdom 이
 * 없어 못 돌리지만 `URLSearchParams` 는 node 표준이라 여기는 그냥 된다.
 */
import { SLOT_ORDER, type Slot, type Tier } from '@/domain/item'

/** 그리드는 그림을, 목록은 수치를 본다. 꾸미기 아이템이라 둘 다 필요하다. */
export type ItemsView = 'grid' | 'list'

export type ItemsScreenQuery = {
  /** 이름 부분 일치. 빈 문자열이면 조건 없음 */
  q: string
  slot?: Slot
  tier?: Tier
  view: ItemsView
  /** 1부터 센다 */
  page: number
}

/** 주소에 안 적는 값. 첫 진입부터 주소창이 지저분해지지 않게 한다. */
export const DEFAULT_QUERY: ItemsScreenQuery = { q: '', view: 'list', page: 1 }

const TIERS: Tier[] = ['FREE', 'PAID']
const VIEWS: ItemsView[] = ['grid', 'list']

/** 아는 값이면 그대로, 아니면 `undefined`. */
const oneOf = <T extends string>(allowed: readonly T[], v: string | null): T | undefined =>
  v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : undefined

/**
 * 주소에서 화면 상태를 읽는다.
 *
 * ⚠️ **모르는 값은 버린다.** URL 은 남이 고치고 북마크는 오래 산다 —
 *    `?slot=WING` 이나 `?view=hologram` 이 화면을 깨뜨리면 안 된다.
 *    쪽 번호는 여기서 자르지 않는다. 전체 쪽 수를 알아야 자를 수 있고,
 *    그건 `Pagination`·`pageRange` 가 `clampPage` 로 한다 (§9).
 */
export function parseItemsQuery(params: URLSearchParams): ItemsScreenQuery {
  const page = Number(params.get('page'))

  return {
    q: params.get('q')?.trim() ?? DEFAULT_QUERY.q,
    slot: oneOf(SLOT_ORDER, params.get('slot')),
    tier: oneOf(TIERS, params.get('tier')),
    view: oneOf(VIEWS, params.get('view')) ?? DEFAULT_QUERY.view,
    page: Number.isFinite(page) && page >= 1 ? Math.trunc(page) : DEFAULT_QUERY.page,
  }
}

/** 화면 상태를 주소로 쓴다. **기본값은 적지 않는다.** */
export function toSearchParams(query: ItemsScreenQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (query.q) params.set('q', query.q)
  if (query.slot) params.set('slot', query.slot)
  if (query.tier) params.set('tier', query.tier)
  if (query.view !== DEFAULT_QUERY.view) params.set('view', query.view)
  if (query.page !== DEFAULT_QUERY.page) params.set('page', String(query.page))

  return params
}

/**
 * 바꾼 것을 얹는다.
 *
 * ⚠️ **쪽 말고 다른 걸 바꾸면 1쪽으로 되돌린다.** 5쪽에서 슬롯을 걸었는데 결과가
 *    2쪽뿐이면 빈 화면이 뜬다 — 목록 화면에서 가장 흔한 버그다.
 */
export function patchQuery(
  current: ItemsScreenQuery,
  patch: Partial<ItemsScreenQuery>,
): ItemsScreenQuery {
  const onlyPage = Object.keys(patch).every((k) => k === 'page')
  return { ...current, ...patch, page: onlyPage ? (patch.page ?? current.page) : DEFAULT_QUERY.page }
}

/** 조건이 하나라도 걸려 있는가. 「필터 초기화」를 보일지 정한다. */
export const hasFilter = (q: ItemsScreenQuery): boolean => Boolean(q.q || q.slot || q.tier)
