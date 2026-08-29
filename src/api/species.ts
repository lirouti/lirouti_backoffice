/**
 * 캐릭터 종 파사드.
 *
 * 목록·상세를 한 파일에 둔다. 종은 13개뿐이라 **쪽을 자르지 않는다** — 아이템 목록과
 * 다른 점이고, 원본에도 페이지 바가 없다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { normalizeSpeciesInput, type Species, type SpeciesInput, type SpeciesLog } from '@/domain/species'

import { allSpecies, logsOf, setHidden, upsertSpecies } from '@/mocks/species'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export async function getSpeciesList(): Promise<Species[]> {
  if (USE_MOCK) {
    await mockDelay()
    return allSpecies()
  }

  // TODO(백엔드 스펙 확정 후): http.get<SpeciesDto[]>('/admin/species')
  throw new Error('종 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSpeciesList() {
  return useQuery({ queryKey: qk.species.list(), queryFn: getSpeciesList })
}

export type SpeciesDetail = {
  species: Species
  logs: SpeciesLog[]
  /** 같은 희귀도 안에서의 비율 계산에 쓴다 — 상세 혼자서는 알 수 없다 */
  all: Species[]
}

export async function getSpecies(speciesId: string): Promise<SpeciesDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allSpecies()
    const species = all.find((s) => String(s.key) === speciesId)
    // 없는 id 로 들어올 수 있다 — 북마크·잘못 친 주소.
    if (!species) throw apiError('http', `종 #${speciesId} 을(를) 찾을 수 없습니다.`, 404)
    return { species, logs: logsOf(species), all }
  }

  throw new Error('종 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSpecies(speciesId: string) {
  return useQuery({ queryKey: qk.species.detail(speciesId), queryFn: () => getSpecies(speciesId) })
}

/** 등록이면 `speciesId` 가 없다. 수정이면 있다. */
export type SaveSpeciesVars = { speciesId?: string; input: SpeciesInput }

export async function saveSpecies({ speciesId, input }: SaveSpeciesVars): Promise<Species> {
  if (USE_MOCK) {
    await mockDelay()
    // 검증이 본 값과 **같은 값**을 저장한다 (`domain/species/rules.ts` 의 ⚠️).
    return upsertSpecies(normalizeSpeciesInput(input), speciesId == null ? undefined : Number(speciesId))
  }

  // TODO(백엔드 스펙 확정 후): speciesId 유무로 POST / PATCH
  throw new Error('종 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveSpecies() {
  return useMutation({
    mutationFn: saveSpecies,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.species.all }),
  })
}

export async function setSpeciesHidden(v: { speciesId: string; hidden: boolean }): Promise<Species> {
  if (USE_MOCK) {
    await mockDelay()
    return setHidden(Number(v.speciesId), v.hidden)
  }

  throw new Error('종 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSetSpeciesHidden() {
  return useMutation({
    mutationFn: setSpeciesHidden,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.species.all }),
  })
}
