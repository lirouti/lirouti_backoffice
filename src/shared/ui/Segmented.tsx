import { css, cx } from 'styled-system/css'

/**
 * 옵션 하나. 문자열만 주면 값과 라벨이 같다 (슬롯 필터처럼 코드값이 곧 표시일 때).
 */
export type SegmentedOption<V extends string> = V | { value: V; label: string }

type SegmentedProps<V extends string> = {
  value: V
  onChange: (v: V) => void
  options: SegmentedOption<V>[]
  /** 스크린리더용 이름 — "무엇을 고르는 것인가" */
  'aria-label': string
  className?: string
}

const valueOf = <V extends string>(o: SegmentedOption<V>): V => (typeof o === 'string' ? o : o.value)
const labelOf = <V extends string>(o: SegmentedOption<V>): string => (typeof o === 'string' ? o : o.label)

/**
 * 몇 개 안 되는 선택지를 나란히 놓는 필터. 원본 `tabOf()`/`seg()`.
 *
 * `role="radiogroup"` 을 쓴다. 버튼 여러 개로 두면 스크린리더가 **서로 무관한
 * 버튼 N개**로 읽어서 "지금 무엇이 선택돼 있는지"가 전달되지 않는다.
 * `aria-checked` 로 선택 상태를 함께 알린다.
 */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
}: SegmentedProps<V>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cx(
        css({
          display: 'inline-flex',
          p: '3px',
          borderRadius: 'lg',
          bg: 'surf2',
          border: '1px solid token(colors.ln)',
        }),
        className,
      )}
    >
      {options.map((o) => {
        const v = valueOf(o)
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={css({
              appearance: 'none',
              border: '0',
              font: 'inherit',
              textStyle: 'label',
              fontWeight: '700',
              p: '7px 15px',
              borderRadius: 'sm',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background .15s, color .15s',
              bg: on ? 'surf' : 'transparent',
              color: on ? 'ink' : 'sub',
              boxShadow: on ? '0 1px 2px rgba(16,24,40,.08)' : 'none',
              _hover: { color: 'ink' },
              _focusVisible: { outline: 'none', boxShadow: '0 0 0 3px token(colors.ring)' },
            })}
          >
            {labelOf(o)}
          </button>
        )
      })}
    </div>
  )
}
