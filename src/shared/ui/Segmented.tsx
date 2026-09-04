import { useId } from 'react'

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

const valueOf = <V extends string>(o: SegmentedOption<V>): V =>
  typeof o === 'string' ? o : o.value
const labelOf = <V extends string>(o: SegmentedOption<V>): string =>
  typeof o === 'string' ? o : o.label

/**
 * 몇 개 안 되는 선택지를 나란히 놓는 필터. 원본 `tabOf()`/`seg()`.
 *
 * **네이티브 `<input type="radio">` 를 숨기고 그 위에 그린다.** 처음에는 `<button>`
 * 에 `role="radio"` 를 붙였는데, 그러면 역할만 선언하고 **그 역할의 키보드 계약을
 * 지키지 않는 상태**가 된다 — 스크린리더는 "라디오 그룹"이라 알리는데 화살표
 * 키가 동작하지 않고, 옵션 전부가 Tab 순서에 들어간다. 역할을 어설프게 흉내내면
 * 안 쓰느니만 못하다.
 *
 * 같은 `name` 을 공유하는 네이티브 라디오는 화살표 이동 · roving 포커스 ·
 * 폼 연결을 **브라우저가 공짜로** 준다. `shared/ui/Checkbox` 와 같은 방식이다.
 */
export function Segmented<V extends string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
}: SegmentedProps<V>) {
  // 한 화면에 여러 개가 있어도 서로 간섭하지 않도록 그룹 이름을 분리한다.
  const name = useId()

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
          <label key={v} className={css({ display: 'inline-flex', cursor: 'pointer' })}>
            <input
              type="radio"
              name={name}
              value={v}
              checked={on}
              onChange={() => onChange(v)}
              className={`peer ${css({ position: 'absolute', opacity: 0, width: '0', height: '0' })}`}
            />
            <span
              className={css({
                textStyle: 'label',
                fontWeight: '700',
                p: '7px 15px',
                borderRadius: 'sm',
                whiteSpace: 'nowrap',
                transition: 'background .15s, color .15s',
                bg: on ? 'surf' : 'transparent',
                color: on ? 'ink' : 'sub',
                boxShadow: on ? '0 1px 2px rgba(16,24,40,.08)' : 'none',
                _hover: { color: 'ink' },
                // input 을 숨겼으므로 포커스 링을 이 칸이 대신 받아야 위치를 알 수 있다.
                _peerFocusVisible: { boxShadow: '0 0 0 3px token(colors.ring)' },
              })}
            >
              {labelOf(o)}
            </span>
          </label>
        )
      })}
    </div>
  )
}
