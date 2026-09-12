/**
 * 레벨 테이블 파사드.
 *
 * **행 단위 편집이 있다.** 한동안 없었고 그 판단이 docs/ARCHITECTURE.md §24.1.1 에 적혀 있었는데(「CSV 로
 * 통째로 갈아 끼우는 것이 실제 편집 방식이라 행 단위 저장을 먼저 만들면 쓰이지 않는다」),
 * 운영자가 한 줄씩 손보는 쪽을 쓰기로 하면서 열었다. **CSV 는 여전히 남는다** — 시즌
 * 개편처럼 통째로 바꾸는 일은 한 줄씩 할 것이 아니다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  summarizeLevels,
  validateLevel,
  type Level,
  type LevelInput,
  type LevelSummary,
} from '@/domain/level'

import { allLevels, setLevel } from '@/mocks/levels'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export type LevelsResult = {
  levels: Level[]
  summary: LevelSummary
}

export async function getLevels(): Promise<LevelsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const levels = allLevels()
    return { levels, summary: summarizeLevels(levels) }
  }

  // TODO(백엔드 스펙 확정 후): http.get<LevelDto[]>('/admin/levels')
  throw new Error('레벨 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useLevels() {
  return useQuery({ queryKey: qk.levels.list(), queryFn: getLevels })
}

export type SaveLevelVars = { lv: number; input: LevelInput }

/**
 * 한 레벨을 저장한다.
 *
 * ⚠️ **파사드가 다시 검증한다.** 폼이 막는 것은 보이는 것뿐이고, 잠긴 버튼은 검증이
 *    아니다 (§22.2.3). 여기 숫자는 **이미 그 레벨에 있는 회원에게 적용된다.**
 */
export async function saveLevel({ lv, input }: SaveLevelVars): Promise<Level> {
  if (USE_MOCK) {
    await mockDelay()

    const errors = validateLevel(input)
    const first = Object.values(errors)[0]
    if (first) throw apiError('http', first, 400)

    const saved = setLevel(lv, input)
    if (!saved) throw apiError('http', `Lv ${lv} 을(를) 찾을 수 없습니다.`, 404)
    return saved
  }

  // TODO(백엔드 스펙 확정 후): http.patch(`/admin/levels/${lv}`, input)
  throw new Error('레벨 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveLevel() {
  return useMutation({
    mutationFn: saveLevel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.levels.all }),
  })
}
