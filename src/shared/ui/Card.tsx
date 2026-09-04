import type { HTMLAttributes, ReactNode } from 'react'

import { css, cx } from 'styled-system/css'

type CardProps = {
  children: ReactNode
} & HTMLAttributes<HTMLDivElement>

/** 디자인 전 화면 공통: surf 표면 + 1px bd + radius 12 */
export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        css({
          bg: 'surf',
          border: '1px solid token(colors.bd)',
          borderRadius: 'xl',
          minWidth: '0',
        }),
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/** 카드 제목 줄. 부제는 baseline 정렬로 붙는다. */
export function CardTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        gap: '10px',
      })}
    >
      <div className={css({ textStyle: 'h3', color: 'ink' })}>{title}</div>
      {sub && <div className={css({ textStyle: 'label', color: 'sub' })}>{sub}</div>}
    </div>
  )
}
