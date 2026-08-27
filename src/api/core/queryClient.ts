import { QueryClient } from '@tanstack/react-query'

import { isApiError, isRetryable } from '../error'

/**
 * react-query 싱글턴. `axiosInstance` 와 형제다 —
 * 하나는 **전송 설정**(timeout·baseURL·인터셉터), 하나는 **캐시 정책**(staleTime·retry).
 * 둘 다 부팅 시 한 번 만들어지는 데이터 계층 인프라라 같은 폴더에 둔다.
 *
 * 어드민에 맞춘 기본값.
 *
 * ⚠️ **keep-alive 와 맞물리는 지점이 있다.** 열린 탭의 화면은 언마운트되지 않으므로
 *    `refetchOnMount` 가 탭 전환 때 돌지 않는다. 대신 `refetchInterval` 을 쓰면
 *    숨은 탭에서도 계속 폴링하니, 폴링이 필요한 화면은 `useEffectOnActive` 로 감쌀 것.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 어드민은 창을 계속 띄워두고 다른 일을 하다 돌아온다.
      // 그때마다 전 화면이 다시 요청하면 시끄럽기만 하다.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, error) => count < 2 && isApiError(error) && isRetryable(error),
    },
    mutations: {
      // 쓰기는 자동으로 재시도하지 않는다 — 중복 생성이 더 위험하다.
      retry: false,
    },
  },
})
