/**
 * 공통 코드 파사드.
 *
 * ⚠️ **`uses` 는 화면이 못 고친다.** 집계 결과라 서버가 소유한다 — 화면이 보낸 값을
 *    믿으면 「쓰이는데 지울 수 있는」 값이 생긴다 (docs/ARCHITECTURE.md §29.1).
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { nowAt } from '@/shared/lib/today'

import {
  canDeleteValue,
  filterGroups,
  hasDuplicateCodes,
  normalizeCodeGroupInput,
  summarizeCodes,
  validateCodeGroup,
  type CodeFilter,
  type CodeGroup,
  type CodeGroupInput,
  type CodeLog,
  type CodeSummary,
  type CodeValue,
} from '@/domain/code'

import { addCodeGroup, allCodeGroups, codeLogs, saveCodeValues } from '@/mocks/codes'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export type CodesResult = {
  groups: CodeGroup[]
  summary: CodeSummary
  /** 이미 쓰고 있는 코드 키. 등록 화면의 중복 검사가 쓴다 */
  takenKeys: string[]
}

export async function getCodeGroups(filter: CodeFilter): Promise<CodesResult> {
  if (USE_MOCK) {
    await mockDelay()
    const all = allCodeGroups()
    // 지표는 **거르기 전 전체**로 낸다 — 탭마다 「코드 그룹」 수가 바뀌면 안 된다.
    return {
      groups: filterGroups(all, filter),
      summary: summarizeCodes(all),
      takenKeys: all.map((g) => g.codeKey),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<CodeGroupDto[]>('/admin/codes')
  throw new Error('코드 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useCodeGroups(filter: CodeFilter) {
  return useQuery({ queryKey: qk.codes.list(filter), queryFn: () => getCodeGroups(filter) })
}

export type CodeGroupDetail = {
  group: CodeGroup
  logs: CodeLog[]
}

export async function getCodeGroup(codeId: string): Promise<CodeGroupDetail> {
  if (USE_MOCK) {
    await mockDelay()
    const group = allCodeGroups().find((g) => String(g.key) === codeId)
    if (!group) throw apiError('http', `코드 그룹 #${codeId} 을(를) 찾을 수 없습니다.`, 404)
    return { group, logs: codeLogs(group) }
  }

  throw new Error('코드 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

/** ⚠️ 빈 id 면 부르지 않는다 (§20.6) */
export function useCodeGroup(codeId: string) {
  return useQuery({
    queryKey: qk.codes.detail(codeId),
    queryFn: () => getCodeGroup(codeId),
    enabled: codeId !== '',
  })
}

export type SaveValuesVars = { codeId: number; values: CodeValue[] }

/**
 * 값의 순서·노출을 저장한다.
 *
 * ⚠️ **쓰이는 값이 빠졌으면 거부한다.** 화면이 지우기를 막고 있어도, 여기서 또 본다 —
 *    잠근 버튼은 검증이 아니다 (§22.2.3).
 */
export async function saveCodeGroupValues({ codeId, values }: SaveValuesVars): Promise<CodeGroup> {
  if (USE_MOCK) {
    await mockDelay()
    const before = allCodeGroups().find((g) => g.key === codeId)
    if (!before) throw apiError('http', `코드 그룹 #${codeId} 을(를) 찾을 수 없습니다.`, 404)

    const kept = new Set(values.map((v) => v.code))
    const lost = before.values.filter((v) => !kept.has(v.code) && !canDeleteValue(v))
    if (lost.length > 0) {
      throw apiError(
        'http',
        `${lost.map((v) => v.label).join(', ')} 은(는) 쓰이고 있어 지울 수 없습니다. 감추기를 쓰세요.`,
        409,
      )
    }
    if (values.length === 0) throw apiError('http', '값을 하나 이상 남겨야 합니다.', 400)
    // ⚠️ **순서 저장으로도 중복이 새어 든다.** 폼만 막으면 이 경로가 열려 있다 (§29.1).
    if (hasDuplicateCodes(values.map((v) => v.code))) {
      throw apiError('http', '코드가 중복됐습니다.', 400)
    }

    const saved = saveCodeValues(codeId, values)
    if (!saved) throw apiError('http', `코드 그룹 #${codeId} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  throw new Error('코드 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveCodeValues() {
  return useMutation({
    mutationFn: saveCodeGroupValues,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.codes.all }),
  })
}

export type CreateGroupVars = {
  input: CodeGroupInput
  /** 만든 사람. **목에서만 쓴다** — 실서버는 세션에서 가져간다 (§25.3) */
  by: string
}

export async function createCodeGroup({ input, by }: CreateGroupVars): Promise<CodeGroup> {
  if (USE_MOCK) {
    await mockDelay()
    // ⚠️ **검증한 값과 저장할 값이 같아야 한다.** 다듬기를 먼저 하고 그것만 쓴다 (§29.3.1).
    const clean = normalizeCodeGroupInput(input)
    const takenKeys = allCodeGroups().map((g) => g.codeKey)
    const first = Object.values(validateCodeGroup(clean, takenKeys))[0]
    if (first) throw apiError('http', first, 400)
    return addCodeGroup(clean, by, nowAt())
  }

  throw new Error('코드 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useCreateCodeGroup() {
  return useMutation({
    mutationFn: createCodeGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.codes.all }),
  })
}
