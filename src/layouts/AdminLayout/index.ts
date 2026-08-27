/**
 * 어드민 셸의 공개 표면.
 *
 * 바깥이 쓸 것은 `<AdminLayout/>` 하나뿐이다 — Sidebar·TabBar·Topbar 는 셸의 부품이지
 * 재사용 대상이 아니다. 배럴에 넣지 않아서 밖에서 집어 쓰면 바로 눈에 띈다.
 *
 * `domain/item/index.ts` 와 같은 규약이다: **바깥에서는 배럴, 폴더 안에서는 파일 직접.**
 */
export { AdminLayout } from './AdminLayout'
