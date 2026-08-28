import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'

import type { ScreenId } from '@/domain/screens'

import { useThemeStore } from '@/stores/themeStore'

import { Breadcrumbs } from './Breadcrumbs'

export function Topbar({ current }: { current: ScreenId | null }) {
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
        시즌 정보는 **아직 하드코딩이다.** D-12 는 줄어들지 않는다.

        원본 디자인에서는 `<button>` 이었는데 눌러서 갈 곳이 없어 정보 칩으로 낮췄다 —
        테두리·배경·hover 를 가진 버튼 모양은 없는 동작을 약속한다.
        사이드바의 개수 배지(`nBg`)와 같은 처리라 "누르는 것이 아니라 읽는 것"으로 읽힌다.

        TODO: 시즌 스펙이 정해지면 `domain/season.ts`(`endsAt` → `daysLeft`) + api 로 바꾼다.
              `DashboardPage` 의 "시즌 3 · 최근 14일 기준…" 문구도 같은 출처를 봐야 한다
              — 지금은 두 군데가 서로를 모르는 채로 같은 숫자를 적고 있다.
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
        시즌 3 · D-12
      </div>
    </header>
  )
}
