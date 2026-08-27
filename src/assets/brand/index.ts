/**
 * 브랜드 자산.
 *
 * `icons/` · `images/` 와 달리 **손으로 두는 파일**이다 (`bun run assets` 가 건드리지 않고,
 * `.gitignore` 에도 없다). 디자인에서 새 로고를 받으면 이 폴더의 파일을 교체한다.
 */
import logoUrl from './logo.png'

/** 리루티 심볼. 파란 그라디언트라 어두운 배경에서는 흰 카드 위에 올린다. */
export const LOGO = logoUrl
