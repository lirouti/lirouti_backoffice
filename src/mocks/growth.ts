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
    assetId: 'as_growth_0',
    name: '알',
    fromDay: 0,
    unlock: '기본 배경 · 잔가지 둥지',
  },
  { kind: 'event', assetId: 'as_growth_1', name: '금', note: '부화 직전', unlock: '부화 연출' },
  { kind: 'days', assetId: 'as_growth_2', name: '유체', fromDay: 3, unlock: '표정 · 이모티콘' },
  {
    kind: 'days',
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

/** 그림을 바꾼다. 없는 `assetId` 면 `undefined` */
export function setStageAsset(assetId: string, nextAssetId: string): GrowthStage | undefined {
  const found = stages.find((s) => s.assetId === assetId)
  if (!found) return undefined
  stages = stages.map((s) => (s === found ? { ...s, assetId: nextAssetId } : s))
  return stages.find((s) => s.assetId === nextAssetId)
}
