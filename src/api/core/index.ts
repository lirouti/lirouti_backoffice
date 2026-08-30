/**
 * API 인프라 배럴.
 *
 * ⚠️ **화면(`features/`)은 이걸 import 할 수 없다** (ESLint). 파사드만 본다.
 *    에러 타입이 필요하면 `@/api/error` 를 쓴다 — 그건 공개 표면이다.
 */
export { axiosInstance, http, mockDelay, setUnauthorizedHandler, USE_MOCK } from './client'
export type { RequestConfig } from './client'
export { qk } from './keys'
export { queryClient } from './queryClient'
export { today } from './today'
