/**
 * ⌘K 커맨드 팔레트 — 화면으로 바로 가기.
 *
 * 사이드바가 15그룹이고 화면이 36개라, **「어디 있더라」 를 없애는 것**이 이 물건의 일이다.
 * 「아이템 등록」·「쿠폰 발급」 처럼 **사이드바에 없어 목록을 거쳐야만 닿는 화면**이 특히 그렇다.
 *
 * ⚠️ **데이터는 찾지 않는다.** 그러려면 엔티티를 가로지르는 검색 엔드포인트가 필요한데
 *    없다 — 목으로 흉내 내면 지워 버린 가짜 검색창을 되풀이하는 것이다
 *    (docs/ARCHITECTURE.md §36.1).
 */
import { useEffect, useId, useRef, useState, type SyntheticEvent } from 'react'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { searchScreens, type PaletteItem } from '@/domain/palette'

import { useViewer } from '@/stores/viewerStore'

const MAX = 8

/**
 * ⚠️ **`Dialog` 와 달리 `open` prop 이 없다.** 부모가 열릴 때만 렌더한다 —
 *    「열 때마다 처음부터」 를 **마운트로 표현**하면 검색어·커서를 effect 에서 되돌릴
 *    일이 없다. effect 안의 `setState` 는 렌더를 한 번 더 돌리고, `Dialog` 처럼
 *    화면 안에 오래 서 있는 물건이 아니라서 그 비용을 낼 이유도 없다.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const viewer = useViewer()
  const navigate = useNavigate()
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const listId = useId()
  /**
   * 마지막으로 본 포인터 자리.
   *
   * ⚠️ **글자를 치면 목록이 줄고, 멈춰 있는 커서 밑으로 다른 항목이 미끄러져 들어온다.**
   *    브라우저는 그때도 `mousemove` 를 쏘기 때문에, 그대로 두면 **키보드로 고른 자리를
   *    마우스가 훔친다** — 실제로 「ㄱㅅ」 을 치고 Enter 를 눌렀더니 강조된 「감사 로그」 가
   *    아니라 커서 밑의 「FAQ 편집」 이 열렸다 (docs/ARCHITECTURE.md §36.5).
   *    **자리가 실제로 바뀐 움직임만** 선택을 옮긴다.
   */
  const pointer = useRef({ x: -1, y: -1 })

  const found = searchScreens(viewer, q).slice(0, MAX)
  // ⚠️ **고른 자리가 목록 밖으로 나가지 않게 한다.** 글자를 지우면 목록이 늘고 치면 줄어드는데,
  //    자리를 그대로 두면 Enter 가 **아무것도 아닌 것**을 연다 (docs/ARCHITECTURE.md §36.4).
  const cursor = Math.min(at, Math.max(0, found.length - 1))

  // 마운트가 곧 「열림」 이다. 닫기는 부모가 언마운트해서 하고, DOM 에서 빠지면
  // 브라우저가 top layer 도 같이 거둔다.
  useEffect(() => {
    ref.current?.showModal()
    inputRef.current?.focus()
  }, [])

  // Esc 는 브라우저가 `cancel` 로 알려준다. 기본 동작(즉시 close)을 막고 우리 `open` 으로
  // 닫아야 React 상태와 DOM 이 갈라지지 않는다 (`Dialog` 와 같은 이유).
  const cancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault()
    onClose()
  }

  const go = (item: PaletteItem) => {
    onClose()
    navigate(item.path)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (found.length === 0) return
      const next = e.key === 'ArrowDown' ? cursor + 1 : cursor - 1
      // 위아래로 감싼다 — 여덟 개짜리 목록에서 끝에 부딪히는 건 손해다.
      setAt((next + found.length) % found.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = found[cursor]
      if (item) go(item)
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={cancel}
      onClick={(e) => {
        // 배경을 누르면 닫는다. `<dialog>` 자신이 배경이라 자기 위 클릭만 본다.
        if (e.target === ref.current) onClose()
      }}
      className={css({
        p: '0',
        border: '1px solid token(colors.bd)',
        borderRadius: 'lg',
        bg: 'surf',
        color: 'ink',
        width: 'min(560px, calc(100vw - 32px))',
        mt: '12vh',
        mx: 'auto',
        boxShadow: '0 16px 48px rgba(16, 24, 40, 0.18)',
        _backdrop: { bg: 'rgba(16, 24, 40, 0.32)' },
      })}
    >
      <div className={css({ p: '12px 14px', borderBottom: '1px solid token(colors.ln)' })}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setAt(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="화면 이름으로 이동 — 초성도 됩니다"
          aria-label="화면 검색"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={found[cursor] ? `${listId}-${found[cursor].screen}` : undefined}
          autoComplete="off"
          className={css({
            w: '100%',
            border: '0',
            bg: 'transparent',
            color: 'ink',
            font: 'inherit',
            textStyle: 'h3',
            fontWeight: '400',
            outline: 'none',
            _placeholder: { color: 'faint' },
          })}
        />
      </div>

      {found.length === 0 ? (
        <p className={css({ m: '0', p: '22px 16px', textAlign: 'center', textStyle: 'label', color: 'sub' })}>
          찾는 화면이 없습니다.
        </p>
      ) : (
        <ul
          id={listId}
          role="listbox"
          aria-label="화면"
          className={css({ listStyle: 'none', m: '0', p: '6px', maxHeight: '52vh', overflowY: 'auto' })}
        >
          {found.map((item, i) => (
            <li key={item.screen}>
              <button
                type="button"
                id={`${listId}-${item.screen}`}
                role="option"
                aria-selected={i === cursor}
                onMouseMove={(e) => {
                  const { x, y } = pointer.current
                  if (e.clientX === x && e.clientY === y) return
                  pointer.current = { x: e.clientX, y: e.clientY }
                  setAt(i)
                }}
                onClick={() => go(item)}
                className={css({
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '9px',
                  w: '100%',
                  p: '9px 11px',
                  border: '0',
                  borderRadius: 'md',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  bg: i === cursor ? 'soft' : 'transparent',
                  color: i === cursor ? 'priD' : 'ink',
                })}
              >
                <span className={css({ textStyle: 'label', fontWeight: '600' })}>{item.label}</span>
                {item.group !== '' && (
                  <span className={css({ textStyle: 'micro', color: 'faint' })}>{item.group}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        className={css({
          m: '0',
          p: '8px 14px',
          borderTop: '1px solid token(colors.ln)',
          textStyle: 'micro',
          color: 'faint',
        })}
      >
        ↑↓ 이동 · Enter 열기 · Esc 닫기
      </p>
    </dialog>
  )
}
