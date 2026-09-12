/**
 * 성장 단계 파사드.
 *
 * **예전에는 파사드가 없었다** — 「측정값이 하나도 없이 정의뿐이라 서버가 내려줄 것이
 * 없다」 고 판단했고, 그때는 맞았다. 그림과 경계를 어드민에서 고치기로 하면서
 * 내려줄 것도 저장할 것도 생겼다 (docs/ARCHITECTURE.md §42.3).
 *
 * **줄은 여전히 고정이다** — `create` 도 `remove` 도 없는 것은 빠뜨린 게 아니다 (§19.3).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { validateBoundaries, type GrowthBoundaries, type GrowthStage } from '@/domain/growth'

import { assetsOf } from '@/mocks/assets'
import { allStages, setBoundaries, setStageAsset } from '@/mocks/growth'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

/**
 * 올린 그림의 URL 을 실어 준다.
 *
 * **올린 에셋은 빌드에 없어 `assetId` 로 찾을 수 없다** — 실서버라면 조인해서 내려줬을
 * 값이라 여기서 같은 모양을 만든다 (§8.5). 빠뜨리면 방금 올린 그림이 `?` 로 뜬다.
 */
function withAssetSrc(s: GrowthStage): GrowthStage {
  const found = assetsOf('growth').find((x) => x.assetId === s.assetId)
  return found?.src ? { ...s, assetSrc: found.src, assetExt: found.ext } : s
}

export async function getStages(): Promise<GrowthStage[]> {
  if (USE_MOCK) {
    await mockDelay()
    return allStages().map(withAssetSrc)
  }

  // TODO(백엔드 스펙 확정 후): http.get<GrowthStageDto[]>('/admin/growth')
  throw new Error('성장 단계 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useStages() {
  return useQuery({ queryKey: qk.growth.list(), queryFn: getStages })
}

/**
 * 경계를 저장한다.
 *
 * ⚠️ **파사드가 다시 검증한다.** 폼이 막는 것은 보이는 것뿐이고, 잠긴 버튼은 검증이
 *    아니다 (§22.2.3). 뒤집힌 경계가 들어오면 단계 하나가 하루도 없는 기간이 된다.
 */
export async function saveBoundaries(b: GrowthBoundaries): Promise<GrowthStage[]> {
  if (USE_MOCK) {
    await mockDelay()

    const errors = validateBoundaries(b)
    const first = Object.values(errors)[0]
    if (first) throw apiError('http', first, 400)

    return setBoundaries(b).map(withAssetSrc)
  }

  throw new Error('성장 단계 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveBoundaries() {
  return useMutation({
    mutationFn: saveBoundaries,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.growth.all }),
  })
}

/** ⚠️ **`key` 로 가리킨다** — `assetId` 는 교체되는 값이라 식별자가 못 된다 (§19.3.2) */
export type StageAssetVars = { key: number; nextAssetId: string }

/** 한 단계의 그림을 바꾼다. **줄을 더하는 것이 아니라 같은 줄의 교체다** */
export async function saveStageAsset({
  key,
  nextAssetId,
}: StageAssetVars): Promise<GrowthStage> {
  if (USE_MOCK) {
    await mockDelay()

    const saved = setStageAsset(key, nextAssetId)
    if (!saved) throw apiError('http', `성장 단계 #${key} 를 찾을 수 없습니다.`, 404)
    return withAssetSrc(saved)
  }

  throw new Error('성장 단계 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveStageAsset() {
  return useMutation({
    mutationFn: saveStageAsset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.growth.all }),
  })
}
