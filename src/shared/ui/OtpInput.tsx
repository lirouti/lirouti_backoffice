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
  /**
   * 칸이 **다 찬 순간** 한 번 부른다. 「확인」 을 누르지 않아도 검증이 돌게 하는 자리다.
   *
   * ⚠️ **인자로 온 값을 쓸 것.** 같은 이벤트에서 `onChange` 도 불리지만 그 `setState` 는
   *    아직 반영되지 않았다 — 부모의 `value` 를 읽으면 **한 글자 전** 코드로 검증한다.
   *
   * ⚠️ **되돌릴 수 없는 동작에는 달지 말 것.** 자리를 채우는 것은 「하겠다」는 표시가
   *    아니다 — 2단계 인증 **해제**처럼 마지막 한 번의 누름이 안전장치인 곳에는 없어야 한다.
   */
  onComplete?: (value: string) => void
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
  onComplete,
  invalid = false,
  autoFocus,
  'aria-label': ariaLabel,
}: OtpInputProps) {
  const cells = Array.from({ length }, (_, i) => value[i] ?? '')

  const change = (raw: string) => {
    // 숫자만, 자릿수까지. 붙여넣기도 이 한 곳을 지난다.
    // ⚠️ **여기서는 이어 붙이는 것이 맞다** — 「123 456」 을 붙여 넣으면 `123456` 이어야
    //    한다. 개수·금액 칸은 반대라 `parseCount` 를 쓴다 (docs/ARCHITECTURE.md §59.6).
    const next = raw.replace(/\D/g, '').slice(0, length)
    // ⚠️ **값이 그대로면 부모를 아예 부르지 않는다.** 다 찬 뒤의 7번째 숫자나 문자는
    //    잘려서 같은 값이 되는데, 그래도 `onChange` 를 부르면 호출부의 `reset()` 이 돌고
    //    **react-query 의 `reset()` 은 진행 중인 mutation 에서 observer 를 떼어낸다**
    //    (`mutationObserver.reset()` → `removeObserver(this)`). 그러면 검증이 성공해도
    //    `onSuccess` 가 오지 않아 **로그인이 조용히 안 된다** — 실제로 재현했다.
    //    DOM 에 남은 잘린 글자는 React 가 되돌린다(controlled input 의 상태 복원).
    if (next === value) return
    onChange(next)
    if (next.length === length) onComplete?.(next)
  }

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
        onChange={(e) => change(e.target.value)}
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
