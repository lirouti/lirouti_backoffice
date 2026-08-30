/**
 * 운영 기준일 — 구현은 `shared/lib/today.ts` 에 있다.
 *
 * `mocks/` 도 같은 기준일을 써야 하는데 `mocks` 는 `api` 를 볼 수 없어(docs/ARCHITECTURE.md §4.3) 아래로
 * 내렸다. 파사드가 `./core` 에서 계속 가져올 수 있게 여기서 다시 내보낸다.
 */
export { today } from '@/shared/lib/today'
