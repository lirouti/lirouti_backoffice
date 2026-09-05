/**
 * 테스트 하나가 끝나면 그린 것을 걷는다.
 *
 * ⚠️ **Testing Library 의 자동 정리가 우리 설정에서는 안 걸린다.** 그쪽은 전역
 *    `afterEach` 가 있을 때만 스스로 등록하는데, 우리는 `globals` 를 켜지 않고
 *    `vitest` 에서 명시적으로 import 한다(도메인 테스트가 전부 그렇다).
 *    실측: `render` 를 두 번 하면 `document.body` 의 `<button>` 이 **2개**가 됐다.
 *
 *    걷지 않으면 앞 테스트의 DOM 이 남아, `document` 전체를 뒤지는 코드
 *    (`focusFirstError` 같은)가 **엉뚱한 요소를 잡고도 초록이 된다.**
 *
 * ⚠️ **`node` 환경 파일에서도 이 파일은 돈다.** `cleanup` 은 DOM 이 없으면 할 일이
 *    없으므로 그냥 지나가지만, `document` 를 건드리는 코드를 여기 추가하면 순수 층
 *    테스트가 통째로 깨진다 (docs/ARCHITECTURE.md §60.1).
 */
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
