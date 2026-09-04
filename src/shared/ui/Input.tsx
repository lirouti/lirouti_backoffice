import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

import { css, cx } from 'styled-system/css'

type InputProps = {
  value: string
  onChange: (v: string) => void
  /** 위에 붙는 이름. 주면 `<label>` 로 입력과 연결된다 */
  label?: string
  /** 평상시 안내. `error` 가 있으면 가려진다 */
  hint?: string
  /** 검증 실패 메시지. 있으면 테두리가 붉어지고 스크린리더가 함께 읽는다 */
  error?: string
  required?: boolean
  /** 왼쪽 안쪽 아이콘 (검색 돋보기 등) */
  prefixIcon?: ReactNode
  /** 오른쪽에 붙는 단위 ('젬', '%') */
  suffix?: ReactNode
  /**
   * `md` 는 목록 필터·표 안, `lg` 는 로그인처럼 한 번에 하나만 보는 폼.
   */
  size?: 'md' | 'lg'
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'className'>

/**
 * 한 줄 입력.
 *
 * 원본 레퍼런스에서 세 가지를 고쳤다.
 * - 포커스를 `useState` 로 들고 있었다 → CSS `_focusVisible`. 상태와 실제 포커스가
 *   어긋날 수 없고 리렌더도 없다
 * - **`label` 이 `<div>` 였다.** 눌러도 입력이 포커스되지 않고 스크린리더가 이름을
 *   못 읽는다 → `<label htmlFor>`
 * - **`error`·`hint` 가 입력과 연결돼 있지 않았다.** 화면에는 보이는데 스크린리더는
 *   "왜 틀렸는지"를 못 듣는다 → `aria-describedby` + `aria-invalid`
 */
export function Input({
  value,
  onChange,
  label,
  hint,
  error,
  required,
  prefixIcon,
  suffix,
  size = 'md',
  className,
  // `...rest` 는 아래에서 **먼저** 펼친다. 그런데 이 둘만은 우리가 label·메시지와
  // 이어 붙여야 해서 따로 꺼낸다 — 그냥 덮어쓰게 두면 호출자가 `id` 를 줬을 때
  // `<label htmlFor>` 이 다른 것을 가리키고, `aria-describedby` 를 줬을 때
  // error·hint 연결이 통째로 사라진다.
  id: idProp,
  'aria-describedby': describedByProp,
  ...rest
}: InputProps) {
  const autoId = useId()

  const id = idProp ?? autoId
  const lg = size === 'lg'
  const ownDescribedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  // 바깥 설명과 우리 메시지를 **둘 다** 남긴다. aria-describedby 는 공백으로 여러 개를 받는다.
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

      <div
        className={css({
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
          minWidth: '0',
        })}
      >
        {prefixIcon && (
          <span
            aria-hidden="true"
            className={css({
              position: 'absolute',
              top: '50%',
              left: '10px',
              transform: 'translateY(-50%)',
              display: 'flex',
              color: 'faint',
              pointerEvents: 'none',
            })}
          >
            {prefixIcon}
          </span>
        )}
        <input
          {...rest}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            css({
              flex: '1',
              minWidth: '0',
              appearance: 'none',
              font: 'inherit',
              letterSpacing: '-0.3px',
              color: 'ink',
              bg: 'surf',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'bd',
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
            css(
              lg
                ? { p: '11px 13px', fontSize: '13.5px', borderRadius: 'lg' }
                : { p: '9px 11px', fontSize: '13px', borderRadius: 'md' },
            ),
          )}
          style={{
            paddingLeft: prefixIcon ? 31 : undefined,
            // suffix 가 붙으면 오른쪽 모서리를 펴서 하나의 덩어리로 보이게 한다.
            borderTopRightRadius: suffix ? 0 : undefined,
            borderBottomRightRadius: suffix ? 0 : undefined,
          }}
        />
        {suffix && (
          <span
            className={css({
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              px: '12px',
              border: '1px solid token(colors.bd)',
              borderLeft: '0',
              borderRightRadius: 'md',
              bg: 'surf2',
              textStyle: 'label',
              fontWeight: '700',
              color: 'sub',
            })}
          >
            {suffix}
          </span>
        )}
      </div>

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
