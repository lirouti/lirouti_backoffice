import { css } from 'styled-system/css'

/**
 * 체크박스. 진짜 `<input type=checkbox>` 를 숨기고 그 위에 네모를 그린다.
 *
 * `appearance: none` 으로 기본 상자를 지우는 방법도 있지만, 브라우저마다 남는 잔재가
 * 달라서 숨기고 새로 그리는 편이 예측 가능하다. `<label>` 로 감싸 두었으므로
 * 글자를 눌러도 토글되고 키보드 포커스도 그대로 간다.
 *
 * `features/auth/LoginPage` 에 있었는데 보안 화면이 두 번째 사용처가 되어 올렸다
 * (docs/ARCHITECTURE.md §4.4).
 */
type CheckboxProps = {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}

export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <label className={css({ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' })}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`peer ${css({ position: 'absolute', opacity: 0, width: '0', height: '0' })}`}
      />
      <span
        aria-hidden="true"
        className={css({
          width: '18px',
          height: '18px',
          flex: 'none',
          borderRadius: '5px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: checked ? 'pri' : 'bd',
          bg: checked ? 'pri' : 'surf',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: checked ? 'onPri' : 'transparent',
          // input 을 숨겼으므로 포커스 링을 이 네모가 대신 받아야 키보드 사용자가 위치를 안다.
          _peerFocusVisible: { boxShadow: '0 0 0 3px token(colors.ring)', borderColor: 'ringBd' },
        })}
      >
        <svg width="11" height="11" viewBox="0 0 12 12">
          <path
            d="M2.6,6.2 L4.9,8.5 L9.4,3.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={css({ textStyle: 'label', color: 'sub' })}>{label}</span>
    </label>
  )
}
