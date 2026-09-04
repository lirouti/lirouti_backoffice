/**
 * 셸 상단 — 브레드크럼 · 테마 토글 · 시즌 표시.
 *
 * 동작하지 않던 것 둘(가짜 검색창, 정적 `● 라이브` 배지)을 지웠다. 검색은 ⌘K 팔레트로
 * **진짜로 붙였다** (docs/ARCHITECTURE.md §36).
 * **나쁜 상태를 표시할 수 없는 상태등은 없느니만 못하다** — 점검 중에도 초록 점이
 * 켜져 있으면 운영자가 그걸 믿는다.
 */
import { css } from 'styled-system/css'

import { today } from '@/shared/lib/today'
import { Button } from '@/shared/ui/Button'

import type { ScreenId } from '@/domain/screens'
import { CURRENT_SEASON, seasonChip } from '@/domain/season'

import { useThemeStore } from '@/stores/themeStore'

import { Breadcrumbs } from './Breadcrumbs'

/**
 * 눌러야 하는 키를 **실제로** 보여 준다.
 *
 * ⚠️ 단축키는 ⌘ 와 Ctrl 을 둘 다 받는데(`usePaletteHotkey`) 표시가 ⌘K 하나면
 *    **윈도 운영자에게는 없는 기능**이 된다 — 안내가 반만 맞으면 안 맞는 것과 같다.
 *    감사 로그에 `Chrome · Windows` 가 찍히는 팀이다.
 */
const SHORTCUT = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl K'

export function Topbar({
  current,
  onSearch,
}: {
  current: ScreenId | null
  onSearch: () => void
}) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const dark = theme === 'dark'

  return (
    <header
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '12px 14px',
        p: '9px 26px',
        minHeight: '56px',
        flexWrap: 'wrap',
        borderBottom: '1px solid token(colors.bd)',
      })}
    >
      <Breadcrumbs current={current} />
      <div className={css({ flex: '1' })} />

      {/*
        원본의 가짜 검색창 자리다. 이제 눌리고, 무엇이 열리는지 단축키까지 적어 둔다 —
        **단축키를 안 적으면 아무도 두 번째부터는 안 쓴다.**
      */}
      <button
        type="button"
        onClick={onSearch}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: '1 1 260px',
          maxWidth: '320px',
          minWidth: '0',
          p: '6px 11px',
          border: '1px solid token(colors.bd)',
          borderRadius: 'md',
          bg: 'surf2',
          color: 'faint',
          font: 'inherit',
          textStyle: 'label',
          textAlign: 'left',
          cursor: 'pointer',
          _hover: { bg: 'hov', borderColor: 'faint2' },
        })}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={css({ flex: 'none' })}
        >
          <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M10.4,10.4 L13.5,13.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        <span
          className={css({
            flex: '1',
            minWidth: '0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          화면 검색
        </span>
        <kbd
          className={css({
            flex: 'none',
            p: '1px 6px',
            borderRadius: 'sm',
            bg: 'nBg',
            color: 'sub',
            font: 'inherit',
            textStyle: 'micro',
            fontWeight: '700',
          })}
        >
          {SHORTCUT}
        </kbd>
      </button>

      <Button
        size="icon"
        onClick={toggle}
        title={dark ? '밝은 화면으로' : '어두운 화면으로'}
        aria-label={dark ? '밝은 화면으로' : '어두운 화면으로'}
        className={css({ color: 'sub' })}
      >
        {dark ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8,1.4 V3 M8,13 V14.6 M1.4,8 H3 M13,8 H14.6 M3.4,3.4 L4.5,4.5 M11.5,11.5 L12.6,12.6 M12.6,3.4 L11.5,4.5 M4.5,11.5 L3.4,12.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M13.2,10.2 A5.6,5.6 0 0,1 5.8,2.8 A5.9,5.9 0 1,0 13.2,10.2 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </Button>

      {/*
        원본 디자인에서는 `<button>` 이었는데 눌러서 갈 곳이 없어 정보 칩으로 낮췄다 —
        테두리·배경·hover 를 가진 버튼 모양은 없는 동작을 약속한다.
        사이드바의 개수 배지(`nBg`)와 같은 처리라 "누르는 것이 아니라 읽는 것"으로 읽힌다.

        문구는 `domain/season.ts` 가 만든다 — 마감이 지나면 스스로 「종료」 가 된다
        (docs/ARCHITECTURE.md §34).
      */}
      <div
        className={css({
          flex: 'none',
          p: '5px 10px',
          bg: 'nBg',
          borderRadius: 'md',
          textStyle: 'label',
          fontWeight: '700',
          color: 'sub',
          whiteSpace: 'nowrap',
        })}
      >
        {seasonChip(CURRENT_SEASON, today())}
      </div>
    </header>
  )
}
