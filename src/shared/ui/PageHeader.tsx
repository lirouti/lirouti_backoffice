import type { ReactNode } from 'react'

import { css } from 'styled-system/css'

type PageHeaderProps = {
  title: string
  /** 한 줄 설명. 이 화면이 무엇을 다루는지 */
  sub?: string
  /** 오른쪽 끝에 붙는 버튼들 */
  actions?: ReactNode
}

/**
 * 화면 맨 위의 제목 줄.
 *
 * 지표·보안·UI 세 화면에 같은 마크업이 복붙돼 있던 것을 올렸다 — 규약은 두 번째
 * 소비자에서 승격인데(docs/ARCHITECTURE.md §4.4) 이미 네 번째였다.
 *
 * **아래 여백(18px)을 이 컴포넌트가 갖는다.** 화면마다 적으면 값이 갈라진다.
 *
 * ⚠️ **`className` 을 받지 않는다.** 여백을 밖에서 덮으려고 넣었다가 안 먹는 걸 확인했다 —
 *    Panda 의 `cx` 는 클래스 이름을 **이어 붙이기만** 하고, 충돌하는 원자 클래스는
 *    `cx` 의 인자 순서가 아니라 **CSS 파일 안의 순서**가 이긴다. 조용히 안 되는
 *    override 를 열어 두면 다음 사람이 같은 데서 시간을 버린다. 여백을 다르게 하려면
 *    바깥 구조를 바꿀 것 (`UiKitPage` 가 카드들만 따로 묶은 것이 그 예다).
 */
export function PageHeader({ title, sub, actions }: PageHeaderProps) {
  return (
    <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '16px', mb: '18px' })}>
      <div className={css({ flex: '1', minWidth: '0' })}>
        <h2 className={css({ m: '0', textStyle: 'h2', color: 'ink' })}>{title}</h2>
        {sub && <p className={css({ m: '5px 0 0', textStyle: 'body', color: 'sub' })}>{sub}</p>}
      </div>
      {actions && <div className={css({ display: 'flex', gap: '8px' })}>{actions}</div>}
    </div>
  )
}
