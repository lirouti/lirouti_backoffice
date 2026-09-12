/**
 * 성장 4단계. 디자인 원본(`riruti-admin-char.dc.html`)의 `STAGES` 를 옮겼다.
 *
 * **줄은 고정이지만 그림과 경계는 바뀐다** (docs/ARCHITECTURE.md §42.3 · §19.3).
 *
 * ⚠️ **아직 그림이 없다.** `as_growth_0..3` 에 해당하는 파일이 저장소에 없어 `AssetThumb` 이
 *    `?` 로 그린다. 예전에는 디자이너가 `design/` 에 넣고 `bun run assets` 를 돌려야 했지만,
 *    이제는 **화면에서 올리면 붙는다** (§8.5).
 *
 * ⚠️ **모듈 캐시라 새로고침하면 고친 값이 사라진다** — 목이라서다.
 */
import { applyBoundaries, type GrowthBoundaries, type GrowthStage } from '@/domain/growth'

/**
 * ⚠️ **「금」 은 일수가 없다.** 알과 유체 사이의 짧은 연출이고 **사건(부화)으로 끝난다** —
 *    날짜를 넣으려 하면 타입이 막는다 (§42.2).
 */
const STAGES: GrowthStage[] = [
  {
    kind: 'days',
    key: 0,
    assetId: 'as_growth_0',
    name: '알',
    fromDay: 0,
    unlock: '기본 배경 · 잔가지 둥지',
  },
  {
    kind: 'event',
    key: 1,
    assetId: 'as_growth_1',
    name: '금',
    note: '부화 직전',
    unlock: '부화 연출',
  },
  {
    kind: 'days',
    key: 2,
    assetId: 'as_growth_2',
    name: '유체',
    fromDay: 3,
    unlock: '표정 · 이모티콘',
  },
  {
    kind: 'days',
    key: 3,
    assetId: 'as_growth_3',
    name: '성체',
    fromDay: 14,
    unlock: '전 슬롯 · 챌린지',
  },
]

/** ⚠️ **배열을 통째로 바꾼다** — 제자리에서 고치면 실패한 저장이 화면에 남는다 */
let stages: GrowthStage[] = STAGES

export const allStages = (): GrowthStage[] => stages

/** 경계를 고친다. 검증은 파사드가 먼저 한다 */
export function setBoundaries(b: GrowthBoundaries): GrowthStage[] {
  stages = applyBoundaries(stages, b)
  return stages
}

/**
 * 그림을 바꾼다. 없는 `key` 면 `undefined`.
 *
 * ⚠️ **`assetId` 로 찾지 말 것** — 겹치면 엉뚱한 줄을 고친다 (§19.3.2).
 */
export function setStageAsset(key: number, nextAssetId: string): GrowthStage | undefined {
  if (!stages.some((s) => s.key === key)) return undefined
  stages = stages.map((s) => (s.key === key ? { ...s, assetId: nextAssetId } : s))
  return stages.find((s) => s.key === key)
}

/** 테스트가 모듈 캐시를 되돌린다 — 목 저장소는 파일 하나를 공유한다 */
export function resetStages(): void {
  stages = STAGES
}
