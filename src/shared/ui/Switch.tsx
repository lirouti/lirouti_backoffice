import { useId } from 'react'

import { css, cx } from 'styled-system/css'

type SwitchProps = {
  checked: boolean
  onChange: (v: boolean) => void
  /** 오른쪽에 붙는 이름. 이게 스크린리더가 읽는 이름이 된다 */
  label: string
  /** 라벨 아래 한 줄 설명 */
  hint?: string
  disabled?: boolean
  /**
   * 라벨을 **화면에서만** 숨긴다. 접근 이름(`aria-label`)은 그대로 남는다.
   *
   * ⚠️ **줄마다 스위치가 있는 표에 쓴다.** 「노출」 처럼 짧게 줄이면 화면은 깔끔하지만
   *    스크린리더가 **어느 줄의 스위치인지 말하지 못한다** — 같은 이름이 스무 개가 된다.
   *    라벨에는 무엇의 스위치인지 다 적고 이 옵션으로 감춘다
   *    (docs/ARCHITECTURE.md §27.2).
   */
  labelHidden?: boolean
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
 *
 * ⚠️ **힌트는 버튼 밖에 둔다.** 안에 두면 **보이는 글자(라벨+힌트)가 접근 이름(라벨)보다
 *    길어져서**, 화면을 보고 말하는 사람(음성 제어)이 읽은 대로 불러도 안 잡힌다
 *    (`label-content-name-mismatch`). 밖으로 빼면 버튼의 글자가 곧 이름이라
 *    `aria-label` 자체가 필요 없다 (docs/ARCHITECTURE.md §37).
 */
export function Switch({ checked, onChange, label, hint, disabled, labelHidden, className }: SwitchProps) {
  const hintId = useId()

  return (
    <span className={cx(css({ display: 'block' }), className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        // ⚠️ **라벨이 보이면 `aria-label` 을 주지 않는다.** 버튼 안의 글자가 곧 이름이라,
        //    따로 붙이면 둘이 갈라질 자리를 만든다. 라벨을 감출 때만 이름이 필요하다.
        aria-label={labelHidden ? label : undefined}
        // ⚠️ **숨긴 힌트를 가리키면 안 된다.** `labelHidden` 이면 힌트 요소가 아예 없어서
        //    `aria-describedby` 가 **존재하지 않는 id** 를 가리킨다 — 보조기술이 조용히
        //    아무것도 못 읽는다 (docs/ARCHITECTURE.md §27.2).
        aria-describedby={hint && !labelHidden ? hintId : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`group ${css({
          display: 'flex',
          alignItems: 'center',
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
        })}`}
      >
        <span
          aria-hidden="true"
          className={css({
            position: 'relative',
            width: '38px',
            height: '22px',
            flex: 'none',
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

        {!labelHidden && (
          <span className={css({ minWidth: '0', textStyle: 'body', fontWeight: '600', color: 'ink' })}>
            {label}
          </span>
        )}
      </button>

      {/*
        버튼 밖이지만 **라벨 아래로 들여쓴다** — 트랙(38) + 간격(10) 만큼. 안 그러면
        힌트가 트랙 왼쪽까지 나와서 무엇에 붙은 설명인지 안 보인다.
      */}
      {hint && !labelHidden && (
        <span
          id={hintId}
          className={css({ display: 'block', pl: '48px', textStyle: 'caption', color: 'faint' })}
        >
          {hint}
        </span>
      )}
    </span>
  )
}
