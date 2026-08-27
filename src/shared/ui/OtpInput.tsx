import { css } from 'styled-system/css'

/**
 * 자릿수만큼 칸이 나뉜 코드 입력.
 *
 * **투명한 input 하나가 칸 전체를 덮는다.** 칸은 보여주기만 한다.
 * 칸마다 input 을 두는 구현이 흔하지만 붙여넣기·백스페이스·IME 처리가 까다롭고,
 * 하나로 두면 `autocomplete="one-time-code"`(문자 수신 시 자동 입력)가 그대로 동작한다.
 *
 * `length` 에 기본값을 두지 않는다 — 자릿수는 도메인 규칙(`TOTP_CODE_LENGTH`)인데
 * `shared` 는 도메인을 모른다. 부르는 쪽이 넘기게 해서 숫자가 두 군데 생기는 걸 막는다.
 */
type OtpInputProps = {
  value: string
  onChange: (v: string) => void
  length: number
  /** 검증 실패 — 칸을 붉게 물들이고 활성 표시를 끈다 */
  invalid?: boolean
  autoFocus?: boolean
  'aria-label': string
}

/**
 * 칸 하나.
 *
 * 활성 표시를 **CSS 로만** 한다. `focused` 상태를 따로 두면 실제 DOM 포커스와 어긋날 수
 * 있는데, 덮고 있는 input 이 투명이라 어긋나도 눈에 띄지 않는다. `:focus-within` 은
 * 브라우저가 관리하므로 어긋날 수가 없다.
 *
 * 조상의 포커스를 보려면 Panda 의 `_groupFocusWithin` 을 쓴다 —
 * `'.foo:focus-within &'` 같은 생 선택자는 `SystemStyleObject` 타입이 받지 않는다.
 *
 * `data-active` 는 `invalid` 가 아닐 때만 붙는다. 두 선택자가 겹치지 않으니
 * 어느 쪽이 이기는지 따질 일이 없다.
 */
const cell = css({
  flex: '1',
  height: '52px',
  // 단축 `border` 대신 길게 쓴다 — 아래 borderColor 재정의와 단축/개별 속성이
  // 섞이지 않아 우선순위를 따질 일이 없다.
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'bd',
  borderRadius: 'lg',
  bg: 'surf',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '19px',
  fontWeight: '700',
  letterSpacing: '-0.4px',
  color: 'ink',
  transition: 'border-color .12s, box-shadow .12s',
  '&[data-error]': { borderColor: 'rBd' },
  _groupFocusWithin: {
    '&[data-active]': {
      borderColor: 'ringBd',
      boxShadow: '0 0 0 3px token(colors.ring)',
    },
  },
})

export function OtpInput({
  value,
  onChange,
  length,
  invalid = false,
  autoFocus,
  'aria-label': ariaLabel,
}: OtpInputProps) {
  const cells = Array.from({ length }, (_, i) => value[i] ?? '')

  return (
    <div className={`group ${css({ position: 'relative' })}`}>
      <div className={css({ display: 'flex', gap: '8px' })} aria-hidden="true">
        {cells.map((v, i) => (
          <div
            key={i}
            data-error={invalid ? '' : undefined}
            data-active={!invalid && value.length === i ? '' : undefined}
            className={cell}
          >
            {v}
          </div>
        ))}
      </div>

      <input
        value={value}
        // 숫자만, 자릿수까지. 붙여넣기도 이 한 곳을 지난다.
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        // 칸 위에 겹쳐 두고 보이지 않게 한다. 캐럿은 칸의 포커스 테두리가 대신한다.
        className={css({
          position: 'absolute',
          inset: '0',
          width: 'full',
          height: 'full',
          opacity: 0,
          border: '0',
          bg: 'transparent',
          font: 'inherit',
          cursor: 'text',
          _focusVisible: { outline: 'none' },
        })}
      />
    </div>
  )
}
