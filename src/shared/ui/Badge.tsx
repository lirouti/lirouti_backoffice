/**
 * 상태 배지.
 *
 * 색(tone)은 `shared/ui/tone` 의 어휘를 쓴다. **도메인 상태값을 받지 않는다** —
 * 코드값 → tone 매핑은 `domain/<entity>/labels.ts` 의 일이다 (docs/ARCHITECTURE.md §4.4).
 */
import type { ReactNode } from 'react'

import { css, cva } from 'styled-system/css'

import type { BadgeTone } from './tone'

export type { BadgeTone }

const badge = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    flex: 'none',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  variants: {
    tone: {
      success: { color: 'gFg', bg: 'gBg' },
      warn: { color: 'aFg', bg: 'aBg' },
      danger: { color: 'rFg', bg: 'rBg' },
      purple: { color: 'pFg', bg: 'pBg' },
      teal: { color: 'tFg', bg: 'tBg' },
      neutral: { color: 'nFg', bg: 'nBg' },
      gold: { color: 'goldFg', bg: 'goldBg' },
      brand: { color: 'priD', bg: 'soft' },
    },
    size: {
      sm: { textStyle: 'micro', px: '6px', py: '1px', borderRadius: '5px' },
      md: { textStyle: 'caption', px: '8px', py: '2px', borderRadius: 'xs' },
    },
  },
  defaultVariants: { tone: 'neutral', size: 'sm' },
})

type BadgeProps = {
  tone?: BadgeTone
  size?: 'sm' | 'md'
  children: ReactNode
}

export function Badge({ tone, size, children }: BadgeProps) {
  return <span className={css(badge.raw({ tone, size }))}>{children}</span>
}
