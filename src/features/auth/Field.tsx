import { useId, useState, type InputHTMLAttributes } from 'react'

import { css } from 'styled-system/css'

/**
 * 로그인 전용 입력 필드.
 *
 * `shared/ui` 로 올리지 않는다 — 지금 쓰는 화면이 하나뿐이다.
 * **두 번째 폼 화면(아이템 등록 등)이 생기면 그때 올린다.** (docs/ARCHITECTURE.md §4.4)
 * 미리 올리면 로그인의 사정이 공용 컴포넌트에 스며든다.
 */
type FieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>

const inputStyle = css({
  width: 'full',
  appearance: 'none',
  border: '1px solid token(colors.bd)',
  borderRadius: 'lg',
  p: '11px 13px',
  font: 'inherit',
  fontSize: '13.5px',
  letterSpacing: '-0.3px',
  color: 'ink',
  bg: 'surf',
  _focusVisible: { outline: 'none', borderColor: 'ringBd', boxShadow: '0 0 0 3px token(colors.ring)' },
  _placeholder: { color: 'faint' },
})

const labelStyle = css({
  display: 'block',
  textStyle: 'label',
  fontWeight: '700',
  color: 'sub',
  mb: '6px',
})

export function TextField({ label, value, onChange, ...rest }: FieldProps) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className={labelStyle}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputStyle}
        {...rest}
      />
    </div>
  )
}

export function PasswordField({ label, value, onChange, ...rest }: FieldProps) {
  const id = useId()
  const [shown, setShown] = useState(false)

  return (
    <div>
      <label htmlFor={id} className={labelStyle}>
        {label}
      </label>
      <div className={css({ position: 'relative' })}>
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          className={`${inputStyle} ${css({ pr: '42px' })}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? '비밀번호 가리기' : '비밀번호 보기'}
          className={css({
            position: 'absolute',
            top: '50%',
            right: '6px',
            transform: 'translateY(-50%)',
            appearance: 'none',
            border: '0',
            bg: 'transparent',
            color: 'faint',
            width: '30px',
            height: '30px',
            borderRadius: 'sm',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: '0',
            _hover: { color: 'sub' },
          })}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M1.6,8 C3.4,4.8 5.6,3.3 8,3.3 C10.4,3.3 12.6,4.8 14.4,8 C12.6,11.2 10.4,12.7 8,12.7 C5.6,12.7 3.4,11.2 1.6,8 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
            {shown && <path d="M2.6,2.6 L13.4,13.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />}
          </svg>
        </button>
      </div>
    </div>
  )
}
