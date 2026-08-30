/**
 * react-query 캐시 키를 한 곳에서 만든다.
 *
 * 키를 화면마다 문자열로 적으면 무효화할 때 어긋난다.
 * `queryClient.invalidateQueries({ queryKey: qk.items.all })` 처럼 접두사로 묶어 지울 수 있게
 * 계층 구조로 만든다.
 */
export const qk = {
  dashboard: {
    all: ['dashboard'] as const,
  },
  items: {
    all: ['items'] as const,
    list: (filter: Record<string, unknown> = {}) => ['items', 'list', filter] as const,
    detail: (id: number | string) => ['items', 'detail', String(id)] as const,
  },
  assets: {
    all: ['assets'] as const,
    /** 종류별 카탈로그 (`AssetKind`) */
    list: (kind: string) => ['assets', 'list', kind] as const,
  },
  species: {
    all: ['species'] as const,
    list: () => ['species', 'list'] as const,
    detail: (id: number | string) => ['species', 'detail', String(id)] as const,
  },
  security: {
    all: ['security'] as const,
    /** 내 계정의 2단계 인증 상태 */
    totp: () => ['security', 'totp'] as const,
  },
  challenges: {
    all: ['challenges'] as const,
    list: (filter: Record<string, unknown> = {}) => ['challenges', 'list', filter] as const,
    detail: (id: number | string) => ['challenges', 'detail', String(id)] as const,
  },
} as const
