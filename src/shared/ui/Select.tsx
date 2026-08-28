import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

import { css, cx } from 'styled-system/css'

/** 하나의 선택지. 문자열만 주면 값과 라벨이 같다. */
export type SelectOption = { value: string; label: string; disabled?: boolean }

/** 목록이 화면에서 차지할 수 있는 최대 높이. 넘으면 목록 안에서 스크롤한다. */
const MAX_LIST_HEIGHT = 280

/** 트리거와 목록 사이 간격 */
const GAP = 4

/** 타이핑 점프에서 글자를 이어 붙이는 시간. 이보다 뜸하면 새 검색어로 친다. */
const TYPEAHEAD_MS = 500

const norm = (o: SelectOption | string): SelectOption =>
  typeof o === 'string' ? { value: o, label: o } : o

/** `from` 다음(또는 이전)의 **고를 수 있는** 항목. 없으면 제자리. */
function step(options: SelectOption[], from: number, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
    if (!options[i]!.disabled) return i
  }
  return from
}

/** 양끝에서 안쪽으로 첫 번째 고를 수 있는 항목 */
const edge = (options: SelectOption[], dir: 1 | -1): number =>
  dir === 1 ? step(options, -1, 1) : step(options, options.length, -1)

type SelectProps = {
  value: string
  onChange: (v: string) => void
  options: readonly (SelectOption | string)[]
  /** 위에 붙는 이름. 주면 트리거의 접근 이름이 된다 */
  label?: string
  /**
   * **값이 아직 없을 때만** 보이는 안내 ('전체', '선택하세요').
   * 고르고 나면 사라진다 — 되돌리려면 그 뜻의 선택지를 `options` 에 넣을 것.
   */
  placeholder?: string
  /** 평상시 안내. `error` 가 있으면 가려진다 */
  hint?: string
  /** 검증 실패 메시지. 있으면 테두리가 붉어지고 스크린리더가 함께 읽는다 */
  error?: string
  required?: boolean
  disabled?: boolean
  /** `md` 는 목록 필터·표 안, `lg` 는 한 번에 하나만 보는 폼 (`Input` 과 같다) */
  size?: 'md' | 'lg'
  /** 주면 `<form>` 제출에 실릴 숨은 입력을 함께 그린다 */
  name?: string
  className?: string
}

/**
 * 하나 고르는 드롭다운. **펼친 목록까지 직접 그린다.**
 *
 * 네이티브 `<select>` 는 닫힌 상태만 CSS 가 닿는다 — 펼쳐지는 팝업의 배경·행 높이·
 * hover 색·모서리는 브라우저(그리고 OS)가 그리고, 우리 토큰이 전혀 먹지 않는다.
 * 다크 모드에서 목록만 밝게 뜨는 것도 그래서다.
 *
 * ⚠️ **네이티브를 버리면 브라우저가 주던 것을 전부 우리가 만들어야 한다.** 하나라도
 *    빠지면 마우스로는 멀쩡한데 키보드·스크린리더에서만 고장난다. 여기서 만든 것:
 *
 * | | |
 * |---|---|
 * | 역할 | `role="combobox"` + `role="listbox"`/`option` (WAI-ARIA select-only combobox) |
 * | 포커스 | **버튼에 그대로 둔다.** 활성 항목은 `aria-activedescendant` 로 가리킨다 — 포커스를 목록으로 옮기면 닫을 때 되돌리는 일이 늘고 그 자리에서 자주 샌다 |
 * | 키보드 | ↑↓ 이동 · Home/End 양끝 · Enter/Space 고르고 닫기 · Esc 취소 · Alt+↓ 열기만 |
 * | 타이핑 점프 | 500ms 안에 이어 친 글자로 앞부분 일치 |
 * | 스크롤 | 활성 항목이 목록 밖이면 끌어온다. `scrollIntoView` 는 안 쓴다 — 조상까지 스크롤해서 본문이 같이 튄다 |
 *
 * ⚠️ **목록은 Popover API 로 top layer 에 올린다.** 그냥 `position: absolute` 로 두면
 *    조상의 `overflow: hidden`(표·카드)에 잘리고 `z-index` 싸움이 시작된다.
 *    `popover="auto"` 라서 **바깥 클릭과 Esc 는 브라우저가 처리**하고 포커스도
 *    스스로 트리거로 돌려준다 — 우리가 다시 만들면 어긋날 자리다.
 *
 * ⚠️ **keep-alive 와 맞물린다.** 비활성 탭은 DOM 에서 분리되는데(docs/ARCHITECTURE.md §6.3)
 *    분리된 노드에 `showPopover()` 를 부르면 throw 한다. `isConnected` 로 막는다.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  placeholder,
  hint,
  error,
  required,
  disabled,
  size = 'md',
  name,
  className,
}: SelectProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  /** 타이핑 점프 버퍼. 리렌더와 무관해야 해서 ref 다 */
  const typed = useRef({ text: '', at: 0 })

  const items = options.map(norm)
  const selected = items.findIndex((o) => o.value === value)
  const current = selected >= 0 ? items[selected]! : undefined
  const lg = size === 'lg'
  const listId = `${id}-list`
  const optionId = (i: number) => `${id}-opt-${i}`
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  // 목록을 트리거 아래(자리가 없으면 위)에 붙인다. top layer 라 좌표를 직접 준다.
  useLayoutEffect(() => {
    if (!open) return

    const place = () => {
      const t = triggerRef.current
      const p = listRef.current
      if (!t || !p) return

      const r = t.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - GAP
      const above = r.top - GAP
      const wanted = Math.min(MAX_LIST_HEIGHT, p.scrollHeight)
      const up = below < wanted && above > below

      p.style.width = `${r.width}px`
      p.style.left = `${r.left}px`
      p.style.maxHeight = `${Math.max(120, Math.min(MAX_LIST_HEIGHT, up ? above : below))}px`
      p.style.top = up ? 'auto' : `${r.bottom + GAP}px`
      p.style.bottom = up ? `${window.innerHeight - r.top + GAP}px` : 'auto'
    }

    place()
    // 스크롤은 캡처 단계로 받는다 — 어느 조상이 스크롤됐든 트리거가 함께 움직인다.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  // 활성 항목이 목록 밖이면 끌어온다. `scrollIntoView` 는 조상까지 스크롤한다.
  useEffect(() => {
    const list = listRef.current
    if (!open || !list || active < 0) return

    const el = list.children[active] as HTMLElement | undefined
    if (!el) return
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight
    }
  }, [open, active])

  const show = (start: number) => {
    const p = listRef.current
    if (!p || p.matches(':popover-open') || !p.isConnected) return
    setActive(start)
    p.showPopover()
  }

  const hide = () => listRef.current?.hidePopover()

  const pick = (i: number) => {
    const o = items[i]
    if (!o || o.disabled) return
    onChange(o.value)
    hide()
  }

  /**
   * 타이핑 점프. 500ms 안에 이어 친 글자를 붙여 앞부분이 일치하는 항목으로 간다.
   *
   * ⚠️ **IME 조합 중에는 안 걸릴 수 있다.** 조합 중 `keydown` 의 `key` 는 규격상
   *    `'Process'` 라 한 글자 판정을 통과하지 못한다. 다만 버튼은 편집 가능한
   *    요소가 아니라 IME 가 아예 붙지 않는 경우도 있어, 한글 라벨에서 실제로
   *    어느 쪽인지는 **확인하지 못했다** (자동화로 IME 입력을 만들 수 없었다).
   *    네이티브 `<select>` 는 브라우저가 안에서 처리해 주던 부분이다.
   *    TODO(한글 라벨 목록에서 안 되는 게 확인되면): 조합 문자를 받을 방법을 찾는다
   */
  const jump = (char: string) => {
    const now = Date.now()
    const text = (now - typed.current.at < TYPEAHEAD_MS ? typed.current.text : '') + char.toLowerCase()
    typed.current = { text, at: now }

    const hit = items.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(text))
    if (hit < 0) return
    if (open) setActive(hit)
    else pick(hit)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = e

    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        e.preventDefault()
        // 이미 고른 게 있으면 거기서 연다. 없을 때만 누른 방향의 끝에서 시작한다.
        show(selected >= 0 ? selected : edge(items, key === 'ArrowUp' ? -1 : 1))
        return
      }
      if (key.length === 1 && !e.metaKey && !e.ctrlKey) jump(key)
      return
    }

    switch (key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => step(items, i, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => step(items, i, -1))
        break
      case 'Home':
        e.preventDefault()
        setActive(edge(items, 1))
        break
      case 'End':
        e.preventDefault()
        setActive(edge(items, -1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        pick(active)
        break
      case 'Tab':
        // Tab 은 막지 않는다 — 고르고 다음 필드로 넘어가는 게 폼에서 자연스럽다.
        pick(active)
        break
      default:
        if (key.length === 1 && !e.metaKey && !e.ctrlKey) jump(key)
    }
  }

  return (
    <div className={className}>
      {label && (
        <span
          id={`${id}-label`}
          className={css({ display: 'block', textStyle: 'label', fontWeight: '700', color: 'sub', mb: '6px' })}
        >
          {label}
          {required && (
            <span className={css({ color: 'rFg' })} aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </span>
      )}

      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        popoverTarget={listId}
        onKeyDown={onKeyDown}
        // 트리거를 눌러 여는 것은 브라우저가 `popoverTarget` 으로 처리한다.
        // 우리는 "열릴 때 어디를 활성으로 둘지"만 맞춰 준다.
        onClick={() => !open && setActive(selected >= 0 ? selected : edge(items, 1))}
        className={cx(
          css({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            appearance: 'none',
            font: 'inherit',
            letterSpacing: '-0.3px',
            textAlign: 'left',
            color: 'ink',
            bg: 'surf',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'bd',
            cursor: 'pointer',
            _disabled: { bg: 'surf2', color: 'faint', cursor: 'not-allowed' },
            _focusVisible: {
              outline: 'none',
              borderColor: 'ringBd',
              boxShadow: '0 0 0 3px token(colors.ring)',
            },
            '&[aria-expanded="true"]': { borderColor: 'ringBd' },
            '&[aria-invalid]': { borderColor: 'rBd' },
          }),
          css(
            lg
              ? { p: '11px 13px', fontSize: '13.5px', borderRadius: 'lg' }
              : { p: '9px 11px', fontSize: '13px', borderRadius: 'md' },
          ),
        )}
      >
        <span
          className={cx(
            css({ flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
            !current && css({ color: 'faint' }),
          )}
        >
          {current?.label ?? placeholder ?? ''}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={css({ flex: 'none', color: 'faint' })}
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        >
          <path
            d="M2.6,4.5 L6,8 L9.4,4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/*
        폼 제출용. 리스트박스는 폼 컨트롤이 아니라서 값이 실리지 않는다.
        `disabled` 를 그대로 넘긴다 — 네이티브 `<select disabled>` 는 값을 제출하지
        않으므로, 안 넘기면 잠긴 필드가 조용히 값을 실어 보낸다. 숨은 입력에도
        `disabled` 는 적용된다 (`FormData` 로 확인).
      */}
      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        popover="auto"
        onToggle={(e) => setOpen(e.newState === 'open')}
        className={css({
          position: 'fixed',
          m: '0',
          p: '4px',
          inset: 'auto',
          listStyle: 'none',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          bg: 'surf',
          border: '1px solid token(colors.bd)',
          borderRadius: 'lg',
          boxShadow: '0 10px 30px rgba(16,24,40,.16)',
        })}
      >
        {items.map((o, i) => (
          <Option
            key={o.value}
            id={optionId(i)}
            option={o}
            active={i === active}
            selected={i === selected}
            onPick={() => pick(i)}
            onHover={() => !o.disabled && setActive(i)}
          />
        ))}
      </ul>

      {error ? (
        <div
          id={`${id}-error`}
          className={css({
            mt: '5px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            textStyle: 'caption',
            color: 'rFg',
          })}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" className={css({ flex: 'none' })}>
            <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8,4.6 V8.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="8" cy="11.1" r="0.9" fill="currentColor" />
          </svg>
          <span>{error}</span>
        </div>
      ) : (
        hint && (
          <div id={`${id}-hint`} className={css({ mt: '5px', textStyle: 'caption', color: 'faint' })}>
            {hint}
          </div>
        )
      )}
    </div>
  )
}

/**
 * 한 줄.
 *
 * **고른 것과 활성인 것은 다르다.** 고른 것은 값(파란 글자 + 체크), 활성인 것은
 * 키보드 커서(배경). 둘을 같은 색으로 칠하면 화살표를 눌렀을 때 값이 이미 바뀐 것처럼
 * 보인다 — 실제로는 Enter 를 눌러야 바뀐다.
 */
function Option({
  id,
  option,
  active,
  selected,
  onPick,
  onHover,
}: {
  id: string
  option: SelectOption
  active: boolean
  selected: boolean
  onPick: () => void
  onHover: () => void
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      // 마우스는 mousedown 에서 처리한다. click 을 기다리면 popover 의 light dismiss 가
      // 먼저 닫아 버려 첫 클릭이 삼켜진다.
      onMouseDown={(e) => {
        e.preventDefault()
        onPick()
      }}
      onMouseMove={onHover}
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minHeight: '32px',
        px: '9px',
        borderRadius: 'sm',
        textStyle: 'body',
        cursor: 'pointer',
        color: selected ? 'priD' : 'ink',
        fontWeight: selected ? '700' : '500',
        bg: active ? 'hov' : 'transparent',
        '&[aria-disabled]': { color: 'faint2', cursor: 'not-allowed', bg: 'transparent' },
      })}
    >
      <span className={css({ flex: '1', minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
        {option.label}
      </span>
      {selected && (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={css({ flex: 'none' })}>
          <path
            d="M2.6,6.2 L4.9,8.5 L9.4,3.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </li>
  )
}
