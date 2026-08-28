import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'

import { css, cx } from 'styled-system/css'

/** 하나의 선택지. 문자열만 주면 값과 라벨이 같다. */
export type SelectOption = { value: string; label: string; disabled?: boolean }

type SelectProps = {
  value: string
  onChange: (v: string) => void
  options: readonly (SelectOption | string)[]
  /** 위에 붙는 이름. 주면 `<label>` 로 연결된다 */
  label?: string
  /**
   * **값이 아직 없을 때만** 보이는 첫 줄 ('전체', '선택하세요').
   * 고르고 나면 목록에서 사라진다 — 되돌리려면 그 뜻의 선택지를 `options` 에 넣을 것.
   */
  placeholder?: string
  /** 평상시 안내. `error` 가 있으면 가려진다 */
  hint?: string
  /** 검증 실패 메시지. 있으면 테두리가 붉어지고 스크린리더가 함께 읽는다 */
  error?: string
  required?: boolean
  /** `md` 는 목록 필터·표 안, `lg` 는 한 번에 하나만 보는 폼 (`Input` 과 같다) */
  size?: 'md' | 'lg'
  className?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'size' | 'className'>

/**
 * 하나 고르는 드롭다운. **네이티브 `<select>` 다.**
 *
 * 직접 그린 목록은 키보드 탐색·타이핑 점프·모바일 휠·스크린리더 읽기를 전부
 * 다시 만들어야 하고, 그 중 하나만 빠져도 조용히 못 쓰는 화면이 된다.
 * 다중 선택이나 검색이 필요해지면 그때 별도 컴포넌트를 만든다 — 이걸 키우지 말 것.
 *
 * 원본 레퍼런스에서 셋을 고쳤다 (`Input` 과 같은 이유, docs/ARCHITECTURE.md §4.4).
 * - 포커스를 `useState` 로 들고 있었다 → CSS `_focusVisible`
 * - `label` 이 `<div>` 였다 → `<label htmlFor>`
 * - `hint` 가 입력과 연결돼 있지 않았다 → `aria-describedby`
 *
 * ⚠️ **화살표를 배경 이미지로 넣지 않았다.** 원본은 data URI 안에 `stroke='%236B717C'`
 *    를 박아 뒀는데, 그러면 **다크 모드에서 화살표만 밝아지지 않는다.** CSS 변수는
 *    data URI 안에서 해석되지 않아 토큰을 넣을 수도 없다. 그래서 `<svg>` 를 겹쳐 놓고
 *    `currentColor` 로 칠한다.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  hint,
  error,
  required,
  size = 'md',
  className,
  // `...rest` 를 먼저 펼치므로 이 둘만 따로 꺼낸다 (`Input` 과 같은 이유)
  id: idProp,
  'aria-describedby': describedByProp,
  ...rest
}: SelectProps) {
  const autoId = useId()

  const id = idProp ?? autoId
  const lg = size === 'lg'
  const ownDescribedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const describedBy = [describedByProp, ownDescribedBy].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className={css({ display: 'block', textStyle: 'label', fontWeight: '700', color: 'sub', mb: '6px' })}
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

      <div className={css({ position: 'relative', display: 'flex', minWidth: '0' })}>
        <select
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
              cursor: 'pointer',
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
                ? { p: '11px 30px 11px 13px', fontSize: '13.5px', borderRadius: 'lg' }
                : { p: '9px 28px 9px 11px', fontSize: '13px', borderRadius: 'md' },
            ),
          )}
        >
          {/* 아직 안 골랐을 때만 보이고, 고르면 목록에서 빠진다 */}
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o
            return (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            )
          })}
        </select>

        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={css({
            position: 'absolute',
            top: '50%',
            right: '10px',
            transform: 'translateY(-50%)',
            color: 'faint',
            // 화살표를 눌러도 select 가 열려야 한다
            pointerEvents: 'none',
          })}
        >
          <path
            d="M2.6,4.5 L6,8 L9.4,4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <Message id={id} error={error} hint={hint} />
    </div>
  )
}

/** `Input` 과 같은 자리·같은 모양. 둘 다 쓰게 되면 `shared/ui` 안에서 합칠 것. */
function Message({ id, error, hint }: { id: string; error?: string; hint?: ReactNode }) {
  if (error) {
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
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className={css({ flex: 'none' })}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8,4.6 V8.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="11.1" r="0.9" fill="currentColor" />
        </svg>
        <span>{error}</span>
      </div>
    )
  }
  if (!hint) return null
  return (
    <div id={`${id}-hint`} className={css({ mt: '5px', textStyle: 'caption', color: 'faint' })}>
      {hint}
    </div>
  )
}
