import { isAxiosError } from 'axios'

/**
 * API 에러 — **화면이 보는 단 하나의 에러 타입**.
 *
 * `api/core` 는 전송 계층이라 화면이 못 보지만(ESLint 가 막는다) 에러는 봐야 한다 —
 * 403 이면 "권한 없음" 화면, 5xx 면 재시도 버튼을 띄우는 분기가 어드민에 흔하다.
 * 그래서 `core/` 가 아니라 여기 루트에 둔다.
 *
 * ```tsx
 * const { error } = useItems()
 * if (isApiError(error) && error.status === 403) return <NoPermission />
 * ```
 *
 * axios 는 상황마다 다른 모양을 던진다 — 응답이 온 경우, 네트워크가 끊긴 경우,
 * 타임아웃, 취소. `toApiError` 가 하나로 눌러 담는다.
 * 전송 라이브러리를 바꿔도 이 어휘는 그대로 남는다.
 *
 * `class` 대신 팩토리를 쓴다. `new Error` 는 스택 트레이스를 얻기 위해 필요하지만
 * (문자열을 던지면 스택이 사라진다) 클래스를 선언할 이유는 없다.
 */
export type ApiErrorKind =
  /** 서버가 4xx/5xx 로 응답 */
  | 'http'
  /** 응답 자체가 오지 않음 — 오프라인 · CORS · 서버 다운 */
  | 'network'
  | 'timeout'
  | 'canceled'
  /** 응답은 왔지만 우리가 아는 모양이 아님 — 서버 계약이 어긋났다 */
  | 'parse'
  | 'unknown'

export type ApiError = Error & {
  name: 'ApiError'
  kind: ApiErrorKind
  /** kind 가 'http' 일 때만 있다. */
  status?: number
  /** 서버가 준 원본 바디. 형태는 백엔드 스펙 확정 후 좁힌다. */
  body?: unknown
}

export function apiError(
  kind: ApiErrorKind,
  message: string,
  status?: number,
  body?: unknown,
): ApiError {
  return Object.assign(new Error(message), { name: 'ApiError' as const, kind, status, body })
}

export const isApiError = (e: unknown): e is ApiError =>
  e instanceof Error && (e as Partial<ApiError>).name === 'ApiError'

/** 다시 시도해볼 만한가 — react-query 의 retry 판단에 쓴다. */
export function isRetryable(e: ApiError): boolean {
  if (e.kind === 'network' || e.kind === 'timeout') return true
  if (e.kind === 'http') return e.status != null && e.status >= 500
  return false
}

const MESSAGE: Record<number, string> = {
  400: '요청 형식이 올바르지 않습니다.',
  401: '로그인이 필요합니다.',
  403: '권한이 없습니다.',
  404: '대상을 찾을 수 없습니다.',
  409: '이미 처리되었거나 그 사이 상태가 바뀌었습니다.',
  422: '입력값을 확인해 주세요.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  500: '서버에 문제가 발생했습니다.',
  503: '서버가 일시적으로 응답하지 않습니다.',
}

/** axios 가 던진 것을 ApiError 로 정규화한다. */
export function toApiError(e: unknown): ApiError {
  if (isApiError(e)) return e

  if (isAxiosError(e)) {
    if (e.code === 'ERR_CANCELED') return apiError('canceled', '요청이 취소되었습니다.')
    if (e.code === 'ECONNABORTED') return apiError('timeout', '응답 시간이 초과되었습니다.')

    const status = e.response?.status
    if (status == null) return apiError('network', '서버에 연결할 수 없습니다.')

    return apiError(
      'http',
      MESSAGE[status] ?? `요청에 실패했습니다. (${status})`,
      status,
      e.response?.data,
    )
  }

  return apiError('unknown', e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
}
