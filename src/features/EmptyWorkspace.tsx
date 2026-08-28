import { css } from 'styled-system/css'

import { EmptyState } from '@/shared/ui/EmptyState'
import { Icon } from '@/shared/ui/Icon'

/**
 * 열린 탭이 하나도 없을 때.
 *
 * **탭을 다 닫은 상태를 URL(`/`)로 표현하기 위해 있는 화면이다.** 경로를 그대로 두고
 * 본문만 비우면 사이드바와 브레드크럼이 **닫아 버린 화면을 계속 가리킨다** — 아무것도
 * 안 열렸는데 메뉴 하나가 켜져 있는 꼴이 된다. `/` 는 어느 화면에도 매칭되지 않으므로
 * (`matchScreen` → null) 그 둘이 저절로 꺼진다.
 *
 * `SCREENS` 에 넣지 않는다. 내비도 탭도 스코프도 없는 자리라 화면이 아니다
 * (로그인이 `SCREENS` 에 없는 것과 같은 이유, docs/ARCHITECTURE.md §5.2).
 */
export function EmptyWorkspace() {
  return (
    <EmptyState
      className={css({ mt: '40px' })}
      icon={<Icon name="ic_bird" size={22} />}
      title="열린 화면이 없습니다"
      body="왼쪽 메뉴에서 시작할 화면을 골라 주세요."
    />
  )
}
