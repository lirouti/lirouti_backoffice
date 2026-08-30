/**
 * 레벨 테이블 파사드.
 *
 * 읽기만 있다. 편집은 CSV 가져오기로 통째로 갈아 끼우는 것이 이 표의 편집 방식이라,
 * 행 단위 저장 API 를 먼저 만들면 쓰이지 않는다 (docs/ARCHITECTURE.md §24.1.1).
 */
import { useQuery } from '@tanstack/react-query'

import { summarizeLevels, type Level, type LevelSummary } from '@/domain/level'

import { allLevels } from '@/mocks/levels'

import { mockDelay, qk, USE_MOCK } from './core'

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
