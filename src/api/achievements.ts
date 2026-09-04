/**
 * 업적 파사드.
 *
 * 12건뿐이라 **쪽을 자르지 않고 필터도 없다** — 원본에도 검색·페이지 바가 없다.
 * 아이템 목록과 다른 점이다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import type { Achievement, AchievementInput } from '@/domain/achievement'

import { allAchievements, upsertAchievement } from '@/mocks/achievements'
import { assetsOf } from '@/mocks/assets'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

/**
 * 올린 에셋의 URL 을 실어 준다.
 *
 * 업적은 `assetId` 만 들고 있는데 **올린 에셋은 빌드에 없어서 id 로 찾을 수 없다.**
 * 실서버라면 조인해서 내려줬을 값이라 여기서 같은 모양을 만든다 — 화면은 `assetSrc` 만 본다.
 */
function withAssetSrc(a: Achievement): Achievement {
  const found = assetsOf('ach').find((x) => x.assetId === a.assetId)
  return found?.src ? { ...a, assetSrc: found.src, assetExt: found.ext } : a
}

export async function getAchievements(): Promise<Achievement[]> {
  if (USE_MOCK) {
    await mockDelay()
    return allAchievements().map(withAssetSrc)
  }

  // TODO(백엔드 스펙 확정 후): http.get<AchievementDto[]>('/admin/achievements')
  throw new Error('업적 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useAchievements() {
  return useQuery({ queryKey: qk.achievements.list(), queryFn: getAchievements })
}

export async function getAchievement(achId: string): Promise<Achievement> {
  if (USE_MOCK) {
    await mockDelay()
    const found = allAchievements().find((a) => String(a.key) === achId)
    if (!found) throw apiError('http', `업적 #${achId} 을(를) 찾을 수 없습니다.`, 404)
    return withAssetSrc(found)
  }

  // TODO(백엔드 스펙 확정 후): http.get<AchievementDto>(`/admin/achievements/${achId}`)
  throw new Error('업적 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useAchievement(achId: string) {
  return useQuery({
    queryKey: qk.achievements.detail(achId),
    queryFn: () => getAchievement(achId),
    // ⚠️ **등록 화면은 빈 id 를 넘긴다.** 그냥 두면 없는 업적을 찾아 404 를 던지고,
    //    쓰이지도 않을 실패가 캐시에 남는다 (`useItem` 과 같은 이유).
    enabled: achId !== '',
  })
}

export type SaveAchievementVars = { achId?: string; input: AchievementInput }

export async function saveAchievement({
  achId,
  input,
}: SaveAchievementVars): Promise<Achievement> {
  if (USE_MOCK) {
    await mockDelay()
    return upsertAchievement(input, achId == null ? undefined : Number(achId))
  }

  // TODO(백엔드 스펙 확정 후): achId 유무로 POST / PATCH
  throw new Error('업적 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveAchievement() {
  return useMutation({
    mutationFn: saveAchievement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.achievements.all }),
  })
}
