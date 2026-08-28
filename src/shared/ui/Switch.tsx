import { useId } from 'react'

import { css } from 'styled-system/css'

type SwitchProps = {
  checked: boolean
  onChange: (v: boolean) => void
  /** 오른쪽에 붙는 이름. 이게 스크린리더가 읽는 이름이 된다 */
  label: string
  /** 라벨 아래 한 줄 설명 */
  hint?: string
  disabled?: boolean
  className?: string
}

/**
 * 켜고 끄는 스위치. **즉시 반영되는 설정**에 쓴다.
 *
 * 저장 버튼을 눌러야 반영되는 폼 필드에는 `Checkbox` 를 쓸 것 — 스위치는
 * "지금 켜졌다"로 읽히므로, 눌렀는데 아직 서버에 안 갔으면 거짓말이 된다.
 *
 * ⚠️ **원본은 `<div onClick>` 이었다.** 마우스로만 눌리고, Tab 으로 닿지 않고,
 *    스크린리더는 이게 스위치인지도 켜졌는지도 읽지 못한다. `<button role="switch">`
 *    + `aria-checked` 로 바꿨다 — 버튼이라 Space·Enter 가 그냥 동작한다.
 *
 * ⚠️ **꺼진 상태를 회색 트랙으로 칠하지 않았다.** 원본의 `track`(#D3D9E2)은 흰 카드
 *    위에서 1.42:1 이라 **스위치가 있는지도 안 보인다** (WCAG 1.4.11 은 UI 요소에
 *    3:1 을 요구한다). 꺼짐은 `faint2` 테두리 + `faint2` 노브로 그린다 (3.34:1).
 *    `faint2` 는 원래 이 용도의 토큰이다 — 아이콘·테두리 전용, 텍스트 금지.
 */
export function Switch({ checked, onChange, label, hint, disabled, className }: SwitchProps) {
  const hintId = useId()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      // 라벨과 힌트가 **둘 다 버튼 안**에 있어서, 그냥 두면 접근 이름이
      // "재고 0 이면 자동 숨김다음 정산 주기부터 적용됩니다" 가 된다.
      // 이름은 라벨로 못박고 힌트는 설명으로만 붙인다.
      aria-label={label}
      aria-describedby={hint ? hintId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group ${css({
        display: 'flex',
        alignItems: hint ? 'flex-start' : 'center',
        gap: '10px',
        appearance: 'none',
        border: '0',
        bg: 'transparent',
        font: 'inherit',
        textAlign: 'left',
        p: '0',
        cursor: 'pointer',
        _disabled: { opacity: 0.5, cursor: 'not-allowed' },
        // 링은 트랙이 받는다 (아래 `_groupFocusVisible`) — 버튼 전체를 두르면
        // 라벨까지 감싸서 어디가 눌리는 곳인지 흐려진다.
        _focusVisible: { outline: 'none' },
      })} ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className={css({
          position: 'relative',
          width: '38px',
          height: '22px',
          flex: 'none',
          mt: hint ? '1px' : '0',
          borderRadius: '999px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: checked ? 'pri' : 'faint2',
          bg: checked ? 'pri' : 'surf',
          transition: 'background .15s, border-color .15s',
          _groupFocusVisible: { boxShadow: '0 0 0 3px token(colors.ring)', borderColor: 'ringBd' },
        })}
      >
        <span
          className={css({
            position: 'absolute',
            top: '3px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            bg: checked ? 'onPri' : 'faint2',
            transition: 'left .15s, background .15s',
          })}
          style={{ left: checked ? 20 : 3 }}
        />
      </span>

      <span className={css({ minWidth: '0' })}>
        <span className={css({ display: 'block', textStyle: 'body', fontWeight: '600', color: 'ink' })}>
          {label}
        </span>
        {hint && (
          <span id={hintId} className={css({ display: 'block', textStyle: 'caption', color: 'faint' })}>
            {hint}
          </span>
        )}
      </span>
    </button>
  )
}
