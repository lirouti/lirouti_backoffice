/**
 * 에셋 카탈로그 — 빌드에 들어온 것 + 이번 세션에 올린 것.
 *
 * `assetTable.ts` 는 디자인 원본의 표를 **읽기만** 하는 상수다. 올린 에셋을 얹으려면
 * 고칠 수 있는 그릇이 하나 필요해서 여기서 감싼다 (`mocks/items.ts` 의 모듈 캐시와 같은 방식).
 *
 * ⚠️ **올린 에셋은 새로고침하면 사라진다.** `blob:` URL 이라 문서 수명을 못 넘고,
 *    그걸 쓰던 아이템도 함께 사라지므로(목이 메모리에만 산다) 앞뒤가 맞는다.
 *    `sessionStorage` 에 남기지 않는 이유는 **일관성**이다 — 아이템 자체가 새로고침하면
 *    사라지는데 그림만 남으면 **주인 없는 그림**이 카탈로그에 쌓인다.
 */
import type { Asset, AssetExt, AssetKind } from '@/domain/asset'

import { ACH_ASSETS, ASSETS, BG_ASSETS, NEST_ASSETS } from './assetTable'

/**
 * ⚠️ `growth`·`emoji` 는 **아직 비어 있다** — 어드민 화면 자체가 없다.
 *
 * ⚠️ **비어 있으면 고르기 창이 빈 채로 뜬다** — 「있는 것에서 고르거나」 라고 써 있는데
 *    고를 것이 없다. 에셋을 뽑았으면 `assetTable.ts` 에 표를 같이 넣어야 한다
 *    (docs/ARCHITECTURE.md §8.6).
 */
const catalog: Record<AssetKind, Asset[]> = {
  head: [...ASSETS.HEAD],
  body: [...ASSETS.BODY],
  hand: [...ASSETS.HAND],
  face: [...ASSETS.FACE],
  bg: [...BG_ASSETS],
  nest: [...NEST_ASSETS],
  growth: [],
  ach: [...ACH_ASSETS],
  emoji: [],
}

let uploaded = 0

/** 그 종류의 에셋 전부. 올린 것이 **맨 앞**에 온다 — 방금 올린 게 안 보이면 실패로 읽힌다. */
export const assetsOf = (kind: AssetKind): Asset[] => catalog[kind]

/**
 * 올린 파일을 카탈로그에 더한다.
 *
 * @param src 이 그림을 그릴 URL. 부르는 쪽이 만든다 — 목은 `URL.createObjectURL`,
 *   서버가 붙으면 응답에 실려 온다.
 */
export function addAsset(kind: AssetKind, v: { name: string; sub: string; src: string; ext: AssetExt }): Asset {
  uploaded += 1
  const asset: Asset = {
    // 빌드 에셋(`as_head_0`)과 겹치지 않게 접두사를 다르게 둔다.
    assetId: `up_${kind}_${uploaded}`,
    name: v.name,
    sub: v.sub,
    paid: false,
    src: v.src,
    ext: v.ext,
  }
  catalog[kind] = [asset, ...catalog[kind]]
  return asset
}
