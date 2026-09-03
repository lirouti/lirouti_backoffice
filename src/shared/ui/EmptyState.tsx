import type { ReactNode } from 'react'

import { css, cx } from 'styled-system/css'

type EmptyStateProps = {
  /** 아이콘 컴포넌트. 없으면 원만 남는다 */
  icon?: ReactNode
  title: string
  /** 왜 비었는지 · 무엇을 하면 되는지. 짧게 */
  body?: string
  /** 다음 행동 버튼 */
  action?: ReactNode
  className?: string
}

/**
 * 목록이 비었을 때.
 *
 * "결과 없음" 을 빈 표로 두면 **로딩이 끝난 건지 결과가 없는 건지** 알 수 없다.
 * 필터를 잘못 건 것과 진짜로 데이터가 없는 것도 구분되어야 해서 `body` 로 이유를 쓴다.
 */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        css({
          bg: 'surf',
          border: '1px solid token(colors.bd)',
          borderRadius: 'xl',
          p: '36px 24px',
          textAlign: 'center',
        }),
        className,
      )}
    >
      <div
        className={css({
          width: '52px',
          height: '52px',
          m: '0 auto 14px',
          borderRadius: 'xl',
          bg: 'surf2',
          color: 'faint',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {icon}
      </div>
      <div className={css({ textStyle: 'h3', color: 'ink' })}>{title}</div>
      {body && (
        <p
          className={css({
            m: '6px auto 16px',
            maxWidth: '260px',
            textStyle: 'label',
            lineHeight: '19px',
            color: 'sub',
          })}
        >
          {body}
        </p>
      )}
      {action}
    </div>
  )
}
