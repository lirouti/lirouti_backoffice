import type { ButtonHTMLAttributes } from 'react'

import { css, cva, cx } from 'styled-system/css'

/**
 * 원본은 모든 버튼에 style-hover / style-active / style-focus 세 상태를 반복해서 붙였다.
 * 그 반복을 레시피로 흡수한다.
 */
const button = cva({
  base: {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    font: 'inherit',
    fontWeight: '600',
    letterSpacing: '-0.3px',
    borderRadius: 'md',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    _active: { transform: 'translateY(1px)' },
    _focusVisible: { boxShadow: '0 0 0 3px token(colors.ring)', outline: 'none' },
    _disabled: { opacity: 0.5, cursor: 'not-allowed', _active: { transform: 'none' } },
  },
  variants: {
    variant: {
      primary: {
        border: '0',
        bg: 'pri',
        color: 'onPri',
        fontWeight: '700',
        _hover: { bg: 'priD' },
      },
      secondary: {
        border: '1px solid token(colors.bd)',
        bg: 'surf',
        color: 'ink',
        _hover: { bg: 'hov', borderColor: 'faint2' },
      },
      /**
       * 되돌릴 수 없는 것에만 (삭제·차단·2FA 해제). 취소 버튼 옆에 놓여
       * **어느 쪽이 파괴적인지**를 색으로 말한다.
       */
      danger: {
        border: '0',
        bg: 'rFg',
        color: 'onDanger',
        fontWeight: '700',
        _hover: { filter: 'brightness(.93)' },
      },
      ghost: {
        border: '1px solid transparent',
        bg: 'transparent',
        color: 'sub',
        _hover: { bg: 'hov', color: 'ink' },
      },
    },
    size: {
      sm: { fontSize: '12px', px: '12px', py: '6px' },
      md: { fontSize: '13px', px: '14px', py: '8px' },
      icon: { width: '34px', height: '34px', p: '0', flex: 'none' },
    },
  },
  defaultVariants: { variant: 'secondary', size: 'md' },
})

type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'icon'
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({ variant, size, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cx(css(button.raw({ variant, size })), className)} {...rest} />
}
