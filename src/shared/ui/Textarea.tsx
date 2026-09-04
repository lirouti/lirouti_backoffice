import { useId, type TextareaHTMLAttributes } from 'react'

import { css, cx } from 'styled-system/css'

type TextareaProps = {
  value: string
  onChange: (v: string) => void
  /** 위에 붙는 이름. 주면 `<label>` 로 입력과 연결된다 */
  label?: string
  /** 평상시 안내. `error` 가 있으면 가려진다 */
  hint?: string
  /** 검증 실패 메시지. 있으면 테두리가 붉어지고 스크린리더가 함께 읽는다 */
  error?: string
  required?: boolean
  rows?: number
  className?: string
} & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'rows' | 'className'
>

/**
 * 여러 줄 입력.
 *
 * `Input` 과 **같은 계약**이다 — 라벨·힌트·오류를 붙이는 방식이 다르면 폼마다
 * 다르게 쓰게 되고, 그러다 `aria-describedby` 를 빠뜨린 화면이 하나 생긴다.
 * 달라지는 건 `rows` 하나뿐이다 (docs/ARCHITECTURE.md §9).
 *
 * **크기 조절은 세로만 허용한다.** 가로로 늘리면 폼 레이아웃이 밀린다.
 */
export function Textarea({
  value,
  onChange,
  label,
  hint,
  error,
  required,
  rows = 3,
  className,
  // `...rest` 를 먼저 펼치므로 이 둘만 따로 꺼낸다 (`Input` 과 같은 이유)
  id: idProp,
  'aria-describedby': describedByProp,
  ...rest
}: TextareaProps) {
  const autoId = useId()

  const id = idProp ?? autoId
  const ownDescribedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const describedBy = [describedByProp, ownDescribedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className={css({
            display: 'block',
            textStyle: 'label',
            fontWeight: '700',
            color: 'sub',
            mb: '6px',
          })}
        >
          {label}
          {required && (
            <span className={css({ color: 'rFg' })} aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}

      <textarea
        {...rest}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          css({
            width: 'full',
            appearance: 'none',
            font: 'inherit',
            fontSize: '13px',
            lineHeight: '1.55',
            letterSpacing: '-0.3px',
            color: 'ink',
            bg: 'surf',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'bd',
            borderRadius: 'md',
            p: '9px 11px',
            resize: 'vertical',
            _placeholder: { color: 'faint' },
            _disabled: { bg: 'surf2', color: 'faint', cursor: 'not-allowed' },
            _focusVisible: {
              outline: 'none',
              borderColor: 'ringBd',
              boxShadow: '0 0 0 3px token(colors.ring)',
            },
            '&[aria-invalid]': { borderColor: 'rBd' },
            transition: 'border-color .12s, box-shadow .12s',
          }),
        )}
      />

      {error ? (
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
            <path
              d="M8,4.6 V8.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="8" cy="11.1" r="0.9" fill="currentColor" />
          </svg>
          <span>{error}</span>
        </div>
      ) : (
        hint && (
          <div
            id={`${id}-hint`}
            className={css({ mt: '5px', textStyle: 'caption', color: 'faint' })}
          >
            {hint}
          </div>
        )
      )}
    </div>
  )
}
