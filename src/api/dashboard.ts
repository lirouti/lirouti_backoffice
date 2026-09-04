/**
 * 대시보드 데이터 파사드.
 *
 * 화면은 이 파일만 본다. 지금은 목을 감싸고 있고, 백엔드 스펙이 나오면
 * `USE_MOCK` 분기 안쪽만 `http.get(...)` 으로 바꾼다 — 화면 코드는 손대지 않는다.
 *
 * 조회 규칙(상위 N, 진행 중)은 `domain/` 에서 가져다 **조합**한다.
 * 목 생성기에 규칙을 두면 서버로 갈아탈 때 규칙까지 같이 사라진다.
 */
import { useQuery } from '@tanstack/react-query'

import { activeChallenges, type Challenge } from '@/domain/challenge'
import type { Kpi, SeriesPoint } from '@/domain/dashboard'
import { topSelling, type Item } from '@/domain/item'

import { allChallenges } from '@/mocks/challenges'
import {
  DAU_DOMAIN,
  DAU_SERIES,
  DAU_TICKS,
  GEM_FLOW,
  GEM_FLOW_MAX,
  KPIS,
} from '@/mocks/dashboard'
import { allItems } from '@/mocks/items'

import { mockDelay, qk, USE_MOCK } from './core'

export type DashboardData = {
  kpis: Kpi[]
  dau: { values: number[]; domain: [number, number]; ticks: number[] }
  gemFlow: { groups: SeriesPoint[]; max: number }
  topItems: Item[]
  liveChallenges: Challenge[]
}

export async function getDashboard(): Promise<DashboardData> {
  if (USE_MOCK) {
    await mockDelay()
    return {
      kpis: KPIS,
      dau: { values: DAU_SERIES, domain: DAU_DOMAIN, ticks: DAU_TICKS },
      gemFlow: { groups: GEM_FLOW, max: GEM_FLOW_MAX },
      topItems: topSelling(allItems(), 5),
      liveChallenges: activeChallenges(allChallenges(), 6),
    }
  }

  // TODO(백엔드 스펙 확정 후): http.get<DashboardDto>('/admin/dashboard') → 도메인 타입으로 매핑
  throw new Error('대시보드 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard.all, queryFn: getDashboard })
}
