/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

/**
 * 환경변수 타입.
 *
 * 여기가 `interface` 를 쓰는 **유일한 자리**다 — 선언 병합은 `type` 으로 표현할 수 없다.
 * (docs/ARCHITECTURE.md §13.3)
 */
interface ImportMetaEnv {
  /** API 서버 주소. 비우면 같은 오리진으로 보낸다 (dev 프록시 사용 시). */
  readonly VITE_API_BASE_URL?: string
  /** '0' 이면 실서버를 본다. 기본은 목 데이터. */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
