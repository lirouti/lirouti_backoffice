/**
 * 제출이 막혔을 때 **첫 오류 칸으로 포커스를 옮긴다.**
 *
 * 네이티브 검증이 대신 해 주던 일 하나가 이것이다 — 껐으므로(docs/ARCHITECTURE.md §44)
 * 우리가 한다. 없으면 긴 폼에서 어디가 틀렸는지 직접 찾아 스크롤해야 하고, 오류 칸이 화면
 * 밖이면 **누른 것이 아무 일도 안 일어난 것처럼 보인다.**
 *
 * 자리를 고정하는 테스트가 옆에 있다(`focusFirstError.test.ts`) — **「첫 오류 칸」** 이지
 * 마지막도, 문서 전체의 첫 번째도 아니다. jsdom 이 필요해 파일 첫 줄에 환경을 적는다 (§60.1).
 */

/**
 * @param root 폼 요소. 없으면 아무것도 하지 않는다
 *
 * `Input` · `Textarea` · `Select` · `FilePicker` 가 오류일 때 `aria-invalid` 를 붙이므로
 * 그것만 찾으면 된다 — 네 컴포넌트 모두 **포커스를 받을 수 있는 요소**에 붙인다
 * (`Select` 는 `role="combobox"` 버튼, `FilePicker` 는 투명하지만 살아 있는 `<input type="file">`).
 *
 * ⚠️ **오류가 이미 DOM 에 그려진 뒤에 불러야 한다.** `aria-invalid` 는 「제출을 눌러 봤다」를
 *    켠 렌더에서야 붙는다. 부르는 쪽이 `flushSync` 로 그 렌더를 먼저 끝낸다.
 *
 * ⚠️ **`requestAnimationFrame` 으로 미루지 않는다.** 그렇게 만들었다가 **탭이 화면에 없으면
 *    콜백이 아예 안 돈다**는 걸 실측했다(`visibilityState: 'hidden'` 에서 rAF 미발화).
 *    「보이지 않을 때만 조용히 안 되는」 종류라 눈으로는 못 잡는다.
 *
 * ⚠️ **`scrollIntoView` 를 쓰지 않는다** — 조상까지 스크롤해서 본문이 같이 튄다(탭 스트립과
 *    같은 이유, §9.3). `focus()` 는 필요한 만큼만 움직인다.
 *
 * 오류가 **입력 칸이 아닌 것**에만 있으면(에셋 미선택 같은) 옮길 곳이 없어 아무 일도 하지
 * 않는다. 그 경우에도 메시지는 이미 그려져 있다.
 */
export function focusFirstError(root: HTMLElement | null): void {
  root?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
