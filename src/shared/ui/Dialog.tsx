import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'

import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'

type DialogProps = {
  open: boolean
  /** 닫기 요청 — 취소 버튼·Esc·바깥 클릭이 모두 이걸 부른다 */
  onCancel: () => void
  onConfirm: () => void
  title: string
  /** 제목 아래 설명. 무엇이 일어나는지 한 문장으로 */
  body?: ReactNode
  /** `danger` 면 경고 아이콘이 붙고 확인 버튼이 붉어진다 */
  tone?: 'default' | 'danger'
  confirmLabel?: string
  cancelLabel?: string
  /** 확인 전에 받아야 하는 입력 (체크박스, 현재 코드 등) */
  children?: ReactNode
}

/**
 * 확인 창.
 *
 * **네이티브 `<dialog>` 위에 그린다.** 포커스 가둠·Esc·바깥 비활성화(inert)·
 * top layer 가 전부 브라우저 몫이 된다. 직접 만들면 이 넷 중 하나는 반드시 빠지고,
 * 빠져도 마우스로는 멀쩡해 보여서 **키보드 사용자에게만 고장난다** — 배경 뒤로
 * Tab 이 새어 나가는 종류다.
 *
 * `window.confirm` 을 대체하는 자리이기도 하다 (`layouts/AdminLayout/TabBar`).
 *
 * ⚠️ **keep-alive 와 맞물린다.** 비활성 탭은 DOM 에서 분리되는데(docs/ARCHITECTURE.md §6.3) 분리된
 *    노드에 `showModal()` 을 부르면 `InvalidStateError` 가 난다. `isConnected` 로
 *    막아 두었다 — 열린 채로 탭을 옮기면 창이 사라지지만, 확인 창은 그 자리에서
 *    끝내는 물건이라 되살릴 상태가 없다.
 */
export function Dialog({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  tone = 'default',
  confirmLabel = '확인',
  cancelLabel = '취소',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  const danger = tone === 'danger'

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (open) {
      // 분리된 노드(비활성 탭)에서는 throw 한다
      if (!el.open && el.isConnected) el.showModal()
    } else if (el.open) {
      el.close()
    }
  }, [open])

  // Esc 는 브라우저가 `cancel` 로 알려준다. 기본 동작(즉시 close)을 막고
  // 우리 `open` 을 통해 닫아야 React 상태와 DOM 이 갈라지지 않는다.
  const cancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault()
    onCancel()
  }

  // 모달 `<dialog>` 는 배경까지 자기 사각형이라, 바깥 클릭은 target 이 자기 자신이다.
  const clickOutside = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onCancel()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={cancel}
      onClick={clickOutside}
      className={css({
        p: '0',
        border: '0',
        bg: 'transparent',
        maxWidth: 'none',
        maxHeight: 'none',
        // ⚠️ **`margin: auto` 를 직접 준다.** 모달 `<dialog>` 의 중앙 정렬은
        //    브라우저 기본 스타일의 `margin: auto` 가 하는데, Panda 의 리셋이
        //    모든 요소에 `margin: 0` 을 깔아 그걸 덮는다. 빼면 좌상단에 붙는다.
        m: 'auto',
        _backdrop: { bg: 'rgba(16,24,40,.42)' },
      })}
    >
      <div
        className={css({
          width: 'min(404px, calc(100vw - 32px))',
          bg: 'surf',
          border: '1px solid token(colors.bd)',
          borderRadius: 'xl',
          boxShadow: '0 18px 48px rgba(16,24,40,.22)',
          p: '22px 24px 20px',
        })}
      >
        <div className={css({ display: 'flex', gap: '12px' })}>
          {danger && (
            <span
              aria-hidden="true"
              className={css({
                width: '34px',
                height: '34px',
                flex: 'none',
                borderRadius: 'lg',
                bg: 'rBg',
                color: 'rFg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <svg width="17" height="17" viewBox="0 0 16 16">
                <path d="M8,2.5 L14.5,13.5 H1.5 Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M8,6.5 V9.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="8" cy="11.4" r="0.9" fill="currentColor" />
              </svg>
            </span>
          )}
          <div className={css({ flex: '1', minWidth: '0' })}>
            <h2 id={titleId} className={css({ m: '0', textStyle: 'h3', color: 'ink' })}>
              {title}
            </h2>
            {body && (
              <p className={css({ m: '5px 0 0', textStyle: 'label', color: 'sub' })}>{body}</p>
            )}
          </div>
        </div>

        {children && <div className={css({ mt: '16px' })}>{children}</div>}

        <div className={css({ display: 'flex', gap: '7px', justifyContent: 'flex-end', mt: '20px' })}>
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
