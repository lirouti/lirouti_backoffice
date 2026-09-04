/**
 * 담당 모듈 고르기. 초대 화면과 상세가 함께 쓴다.
 *
 * ⚠️ **`<button>` 이 아니라 `<input type="checkbox">` 다.** 켜짐/꺼짐이 있는 것을 버튼으로
 *    만들면 스크린리더가 상태를 읽지 못한다 — 원본은 `<div onClick>` 이라 키보드로
 *    아예 닿지 않았다.
 */
import { css, cx } from 'styled-system/css'

import { ASSIGNABLE_SCOPES, SCOPE_LABEL, SCOPE_NOTE } from '@/domain/admin'
import type { ScopeId } from '@/domain/screens'

const grid = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '8px',
})

type ScopeGridProps = {
  selected: ScopeId[]
  onToggle: (scope: ScopeId) => void
  /**
   * 전체 접근이라 고를 것이 없는 상태. 체크는 전부 켜지고 잠긴다.
   *
   * `disabled` 와 나눈 이유 — 최고 관리자는 **켜진 채** 잠기고, 저장 중에는
   * **지금 값 그대로** 잠긴다. 같은 prop 으로 묶으면 둘 중 하나가 거짓말을 한다.
   */
  allOn?: boolean
  disabled?: boolean
}

export function ScopeGrid({ selected, onToggle, allOn, disabled }: ScopeGridProps) {
  const locked = allOn || disabled

  return (
    <div className={grid}>
      {ASSIGNABLE_SCOPES.map((scope) => {
        const on = allOn || selected.includes(scope)
        return (
          <label
            key={scope}
            className={cx(
              css({
                display: 'flex',
                alignItems: 'flex-start',
                gap: '9px',
                p: '10px 11px',
                border: '1px solid',
                borderRadius: 'md',
                cursor: 'pointer',
              }),
              on
                ? css({ borderColor: 'liveBd', bg: 'soft' })
                : css({ borderColor: 'ln', bg: 'transparent' }),
              locked && css({ opacity: '0.6', cursor: 'default' }),
            )}
          >
            <input
              type="checkbox"
              checked={on}
              disabled={locked}
              onChange={() => onToggle(scope)}
              className={`peer ${css({ position: 'absolute', opacity: 0, w: '0', h: '0' })}`}
            />
            {/* input 을 숨겼으므로 포커스 링을 이 네모가 대신 받아야 키보드 위치를 알 수 있다. */}
            <span
              aria-hidden="true"
              className={cx(
                css({
                  w: '17px',
                  h: '17px',
                  flex: 'none',
                  mt: '1px',
                  borderRadius: '5px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  _peerFocusVisible: {
                    boxShadow: '0 0 0 3px token(colors.ring)',
                    borderColor: 'ringBd',
                  },
                }),
                on
                  ? css({ borderColor: 'pri', bg: 'pri', color: 'onPri' })
                  : css({ borderColor: 'bd', bg: 'surf', color: 'transparent' }),
              )}
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
            <span className={css({ minWidth: '0' })}>
              <span
                className={css({
                  display: 'block',
                  textStyle: 'label',
                  fontWeight: '600',
                  color: 'ink',
                })}
              >
                {SCOPE_LABEL[scope]}
              </span>
              <span className={css({ display: 'block', textStyle: 'micro', color: 'sub' })}>
                {SCOPE_NOTE[scope]}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}
