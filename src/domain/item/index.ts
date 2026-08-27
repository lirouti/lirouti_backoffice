/**
 * 아이템 엔티티 배럴.
 *
 * ⚠️ **엔티티 내부에서는 이 배럴을 쓰지 말 것.** `./types` 처럼 파일을 직접 참조한다.
 * 배럴을 거치면 같은 폴더 안에서 순환 참조가 생긴다.
 * 바깥(`features/`, `api/`, `mocks/` …)에서만 `@/domain/item` 으로 쓴다.
 */
export * from './types'
export * from './rules'
export * from './labels'
