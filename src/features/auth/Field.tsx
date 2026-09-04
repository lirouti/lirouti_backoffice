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
  /**
   * 검증 실패 메시지. 칸을 붉게 물들이고 **스크린리더가 라벨과 함께 읽는다.**
   *
   * ⚠️ 이게 없어서 로그인만 「어느 칸이 틀렸는지」를 말하지 못했다 — 배너 한 줄이
   *    전부였다 (docs/ARCHITECTURE.md §52).
   */
  error?: string
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
  _focusVisible: {
    outline: 'none',
    borderColor: 'ringBd',
    boxShadow: '0 0 0 3px token(colors.ring)',
  },
  _placeholder: { color: 'faint' },
  // `Input` 과 같은 방식 — 상태를 따로 들지 않고 `aria-invalid` 하나로 색까지 정한다.
  '&[aria-invalid]': { borderColor: 'rBd' },
})

const labelStyle = css({
  display: 'block',
  textStyle: 'label',
  fontWeight: '700',
  color: 'sub',
  mb: '6px',
})

export function TextField({ label, value, onChange, error, required, ...rest }: FieldProps) {
  const id = useId()
  return (
    <div>
      <Label id={id} label={label} required={required} />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputStyle}
        {...rest}
      />
      <ErrorText id={id} error={error} />
    </div>
  )
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  required,
  ...rest
}: FieldProps) {
  const id = useId()
  const [shown, setShown] = useState(false)

  return (
    <div>
      <Label id={id} label={label} required={required} />
      <div className={css({ position: 'relative' })}>
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
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
            {shown && (
              <path
                d="M2.6,2.6 L13.4,13.4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>
      {/* 보기 토글을 감싼 relative 바깥이다 — 안에 두면 버튼 위에 겹친다 */}
      <ErrorText id={id} error={error} />
    </div>
  )
}

/** 라벨 + 필수 표시. 두 필드가 같은 모양을 쓴다 */
function Label({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={id} className={labelStyle}>
      {label}
      {required && (
        <span className={css({ color: 'rFg' })} aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </label>
  )
}

/**
 * 칸 아래 오류 한 줄.
 *
 * `id` 가 `aria-describedby` 와 짝이라 **입력이 가리키는 그 요소여야 한다** — 없으면
 * 화면에는 보이는데 스크린리더는 왜 틀렸는지 못 듣는다.
 */
function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <div
      id={`${id}-error`}
      className={css({
        mt: '5px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        textStyle: 'caption',
        color: 'rFg',
      })}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        aria-hidden="true"
        className={css({ flex: 'none' })}
      >
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8,4.6 V8.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8" cy="11.1" r="0.9" fill="currentColor" />
      </svg>
      <span>{error}</span>
    </div>
  )
}
