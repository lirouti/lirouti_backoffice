/**
 * 배경 · 둥지 파사드.
 *
 * 20건·3건뿐이라 **쪽을 자르지 않고 필터도 없다** — 원본에도 검색·페이지 바가 없다.
 * 둘을 한 파일에 두는 이유는 사이드바에서 **「배경 · 둥지」 한 그룹**이고, 둥지는 타입과
 * 목록 하나가 전부라 파일을 따로 두면 두 줄짜리 파사드가 생기기 때문이다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import type { Background, BackgroundInput } from '@/domain/background'
import type { Nest } from '@/domain/nest'

import { assetsOf } from '@/mocks/assets'
import { allBackgrounds, upsertBackground } from '@/mocks/backgrounds'
import { allNests } from '@/mocks/nests'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

/**
 * 올린 에셋의 URL 을 실어 준다.
 *
 * 배경은 `assetId` 만 들고 있는데 **올린 에셋은 빌드에 없어서 id 로 찾을 수 없다.**
 * 실서버라면 조인해서 내려줬을 값이라 여기서 같은 모양을 만든다 — 화면은 `assetSrc` 만 본다.
 */
function withAssetSrc(b: Background): Background {
  const found = assetsOf('bg').find((a) => a.assetId === b.assetId)
  return found?.src ? { ...b, assetSrc: found.src, assetExt: found.ext } : b
}

export async function getBackgrounds(): Promise<Background[]> {
  if (USE_MOCK) {
    await mockDelay()
    return allBackgrounds().map(withAssetSrc)
  }

  // TODO(백엔드 스펙 확정 후): http.get<BackgroundDto[]>('/admin/backgrounds')
  throw new Error('배경 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useBackgrounds() {
  return useQuery({ queryKey: qk.backgrounds.list(), queryFn: getBackgrounds })
}

export async function getBackground(bgId: string): Promise<Background> {
  if (USE_MOCK) {
    await mockDelay()
    const found = allBackgrounds().find((b) => String(b.key) === bgId)
    if (!found) throw apiError('http', `배경 #${bgId} 을(를) 찾을 수 없습니다.`, 404)
    return withAssetSrc(found)
  }

  // TODO(백엔드 스펙 확정 후): http.get<BackgroundDto>(`/admin/backgrounds/${bgId}`)
  throw new Error('배경 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useBackground(bgId: string) {
  return useQuery({
    queryKey: qk.backgrounds.detail(bgId),
    queryFn: () => getBackground(bgId),
    // ⚠️ **등록 화면은 빈 id 를 넘긴다.** 그냥 두면 없는 배경을 찾아 404 를 던지고,
    //    쓰이지도 않을 실패가 캐시에 남는다 (`useItem`·`useAchievement` 와 같은 이유).
    enabled: bgId !== '',
  })
}

export type SaveBackgroundVars = { bgId?: string; input: BackgroundInput }

export async function saveBackground({ bgId, input }: SaveBackgroundVars): Promise<Background> {
  if (USE_MOCK) {
    await mockDelay()
    return upsertBackground(input, bgId == null ? undefined : Number(bgId))
  }

  // TODO(백엔드 스펙 확정 후): bgId 유무로 POST / PATCH
  throw new Error('배경 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveBackground() {
  return useMutation({
    mutationFn: saveBackground,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.backgrounds.all }),
  })
}

/** 둥지는 **읽기 전용**이다 — 3단계가 기획으로 고정돼 있다 (docs/ARCHITECTURE.md §41.3) */
export async function getNests(): Promise<Nest[]> {
  if (USE_MOCK) {
    await mockDelay()
    return allNests()
  }

  // TODO(백엔드 스펙 확정 후): http.get<NestDto[]>('/admin/nests')
  throw new Error('둥지 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useNests() {
  return useQuery({ queryKey: qk.nests.list(), queryFn: getNests })
}
