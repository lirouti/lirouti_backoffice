/**
 * 작성 중이던 폼을 `sessionStorage` 에 남기는 부분 중 **순수한 것**.
 *
 * keep-alive 는 탭을 옮겨도 화면을 살려 두지만 **새로고침은 못 견딘다**
 * (docs/ARCHITECTURE.md §6.3). 폼 화면에서 그건 "쓰던 걸 통째로 잃는다" 는 뜻이라,
 * 초안만은 브라우저에 남겨야 한다.
 *
 * 훅(`useItemDraft`)에서 갈라낸 이유는 테스트다 — `sessionStorage` 는 못 돌리지만
 * 직렬화와 **모양 검사**는 node 에서 그냥 된다. 그리고 모양 검사가 이 파일의 요점이다.
 */
import { SLOT_ORDER, type ItemInput } from '@/domain/item'

/** 어느 화면의 초안인가. 경로가 다르면 초안도 다르다 — `/items/new` 와 `/items/3/edit`. */
export const draftKey = (path: string): string => `riruti_admin_draft:${path}`

const isStr = (v: unknown): v is string => typeof v === 'string'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/**
 * 저장해 둔 초안을 읽는다. **모양이 안 맞으면 조용히 버린다.**
 *
 * ⚠️ `sessionStorage` 는 사용자가 직접 고칠 수 있고, 우리가 `ItemInput` 의 모양을
 *    바꾸면 예전 초안이 남아 있다. 믿고 그대로 폼에 넣으면 화면이 깨지거나 —
 *    더 나쁘게 — **`undefined` 인 채로 저장된다.** 목록 필터가 `?slot=WING` 을
 *    버리는 것과 같은 이유다 (§18.1).
 */
export function readDraft(raw: string | null): ItemInput | null {
  if (!raw) return null

  let v: unknown
  try {
    v = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof v !== 'object' || v === null) return null

  const d = v as Record<string, unknown>
  const f = d.flags as Record<string, unknown> | undefined

  const shapeOk =
    isStr(d.name) &&
    isStr(d.sub) &&
    isStr(d.season) &&
    isStr(d.assetId) &&
    isStr(d.visibleFrom) &&
    isStr(d.visibleTo) &&
    (SLOT_ORDER as string[]).includes(d.slot as string) &&
    (d.tier === 'FREE' || d.tier === 'PAID') &&
    typeof d.price === 'number' &&
    Number.isFinite(d.price) &&
    isStr(d.source) &&
    typeof f === 'object' &&
    f !== null &&
    isBool(f.shop) &&
    isBool(f.gacha) &&
    isBool(f.gift)

  return shapeOk ? (v as ItemInput) : null
}

export const writeDraft = (input: ItemInput): string => JSON.stringify(input)

/** 저장해 둔 초안을 꺼낸다. 없거나 모양이 안 맞으면 `null`. */
export const restoreDraft = (scope: string): ItemInput | null =>
  readDraft(sessionStorage.getItem(draftKey(scope)))
