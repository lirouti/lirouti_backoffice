/**
 * **본문 바로가기.** 키보드로 들어온 사람이 사이드바를 건너뛴다.
 *
 * ⚠️ **없으면 본문 첫 요소까지 Tab 을 17번 눌러야 한다** — 사이드바 그룹 8 + 프로필 +
 *    로그아웃 + 브레드크럼 2 + 검색 + 테마 + 탭 2 + 배너 1 (실측, `/items`).
 *    화면을 옮길 때마다 그걸 반복한다. 어드민은 운영자가 하루 종일 키보드로 쓰는 도구다
 *    (docs/ARCHITECTURE.md §63.2).
 *
 * ⚠️ **Lighthouse 는 이걸 검사하지 않는다.** 자동 검사 100 은 출발선이지 결승선이 아니다.
 */
import { css } from 'styled-system/css'

/** 건너뛸 지점. `AdminLayout` 의 `<main>` 이 이 id 를 갖는다 */
export const MAIN_ID = 'main-content'

/**
 * ⚠️ **`display: none` 으로 숨기면 안 된다** — 포커스를 못 받아서 **있으나 마나**가 된다
 *    (`FilePicker` 의 `<input type="file">` 과 같은 함정, §9.5). 화면 밖으로 밀어 두고
 *    포커스를 받으면 제자리로 데려온다.
 */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      className={css({
        position: 'absolute',
        left: '8px',
        // 화면 위로 밀어 둔다. 포커스를 받으면 내려온다.
        top: '-100px',
        zIndex: '100',
        p: '9px 14px',
        bg: 'surf',
        color: 'priD',
        border: '1px solid token(colors.ringBd)',
        borderRadius: 'lg',
        textStyle: 'label',
        fontWeight: '700',
        boxShadow: '0 8px 24px token(colors.dim)',
        transition: 'top .12s',
        // ⚠️ **`_focus` 로 바꾸지 말 것.** Panda 에서 `_focus` 의 `top` 은 기본값
        //    (`top: '-100px'`)에 밀려 적용되지 않는다 — 클래스는 생기는데 화면 밖에 남는다.
        //    `_focusVisible` 은 이긴다(실측). 그리고 이 링크는 **Tab 으로만 오므로**
        //    `:focus-visible` 로 충분하다 — 마우스로 누를 수 있는 자리가 아니다.
        _focusVisible: { top: '8px' },
      })}
    >
      본문 바로가기
    </a>
  )
}
