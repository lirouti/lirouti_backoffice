import axios, { type AxiosRequestConfig } from 'axios'

import { toApiError } from '../error'

/**
 * axios 인스턴스.
 *
 * 인증은 **HttpOnly 쿠키 세션**이다. 토큰을 붙이거나 갱신하는 로직이 없다 —
 * 브라우저가 쿠키를 알아서 실어 보내므로 `withCredentials` 만 켜면 된다.
 * (JWT 였다면 401 재시도 큐가 필요했다.)
 *
 * 보통은 아래 `http` 를 쓴다. 이 인스턴스를 직접 쓰는 건 업로드 진행률처럼
 * 응답 껍데기(status·headers)가 필요한 경우뿐이다.
 */
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * 세션이 끊겼을 때 부를 함수. 앱 부팅 시 주입한다.
 *
 * 여기서 직접 `/login` 으로 보내지 않는 이유는 두 가지다 —
 * `api` 층은 라우터를 몰라야 하고, 하드 리다이렉트는 열린 탭을 전부 날린다.
 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn
}

axiosInstance.interceptors.response.use(
  (res) => res,
  (raw) => {
    const err = toApiError(raw)
    // 401 이 전부 "세션 만료"인 것은 아니다. **로그인·2차 인증 자체가 실패했을 때도
    // 401 이다** — 비밀번호나 코드가 틀린 것이지 세션이 끊긴 게 아니다. 여기서
    // 구분하지 않으면 코드를 한 번 잘못 넣었을 때 에러 배너를 띄우면서 동시에
    // 스토어를 비우고 로그인으로 튕긴다. 그 요청들은 `skipSessionExpiry` 로 뺀다.
    const skip = (raw as { config?: RequestConfig })?.config?.skipSessionExpiry
    if (!skip && err.kind === 'http' && err.status === 401) onUnauthorized?.()
    // 화면과 react-query 는 ApiError 만 본다.
    return Promise.reject(err)
  },
)

/**
 * 요청 옵션. `params` · `signal` · `headers` 를 주로 쓴다.
 *
 * `skipSessionExpiry` 는 **자격증명을 확인하는 요청**(로그인·2차 인증)에 붙인다.
 * 그 401 은 "틀렸다"는 답이지 "세션이 끊겼다"가 아니다.
 */
export type RequestConfig = AxiosRequestConfig & { skipSessionExpiry?: boolean }

/**
 * 실제로 쓰는 HTTP 함수들.
 *
 * axios 는 `AxiosResponse` 를 돌려주는데, 우리가 필요한 건 거의 항상 `data` 뿐이다.
 * 껍데기를 여기서 벗겨 **본문을 바로 반환**한다 — 파사드마다 `.then(r => r.data)` 를
 * 반복하지 않기 위해서다.
 *
 * ```ts
 * const dto = await http.get<ItemDto>('/admin/items/3')
 * const created = await http.post<ItemDto>('/admin/items', body)
 * await http.delete('/admin/items/3')
 * ```
 *
 * 에러는 인터셉터가 이미 `ApiError` 로 정규화했다.
 */
export const http = {
  get: <T>(url: string, config?: RequestConfig): Promise<T> =>
    axiosInstance.get<T>(url, config).then((r) => r.data),

  post: <T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    axiosInstance.post<T>(url, body, config).then((r) => r.data),

  put: <T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    axiosInstance.put<T>(url, body, config).then((r) => r.data),

  patch: <T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> =>
    axiosInstance.patch<T>(url, body, config).then((r) => r.data),

  // `delete` 는 예약어라 함수 이름으로는 못 쓰지만 객체 속성으로는 쓸 수 있다.
  delete: <T = void>(url: string, config?: RequestConfig): Promise<T> =>
    axiosInstance.delete<T>(url, config).then((r) => r.data),
} as const

/** 목 데이터를 쓰는가. 백엔드가 붙기 전까지 기본값이다. */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== '0'

/**
 * 목 응답에 지연을 준다.
 *
 * 즉시 resolve 되면 로딩 상태가 화면에 한 번도 안 나타나서, 스켈레톤·스피너가
 * 실제로 동작하는지 확인할 수 없다.
 */
export const mockDelay = (ms = 250): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))
