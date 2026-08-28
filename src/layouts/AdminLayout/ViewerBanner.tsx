import { css } from 'styled-system/css'

import { useViewer, useViewerStore } from '@/stores/viewerStore'

/** 운영자 시점으로 보고 있을 때 뜨는 경고 배너 */
export function ViewerBanner() {
  const viewer = useViewer()
  const exit = useViewerStore((s) => s.exit)
  if (viewer.role === 'top') return null

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        p: '9px clamp(14px, 2vw, 28px)',
        bg: 'aBg',
        borderBottom: '1px solid token(colors.warnBd)',
      })}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className={css({ flex: 'none', color: 'aFg' })}>
        <path
          d="M1.6,8 C3.4,4.8 5.6,3.3 8,3.3 C10.4,3.3 12.6,4.8 14.4,8 C12.6,11.2 10.4,12.7 8,12.7 C5.6,12.7 3.4,11.2 1.6,8 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className={css({ flex: '1 1 240px', minWidth: '0', textStyle: 'label', color: 'warnFg' })}>
        {viewer.name} 계정으로 보고 있습니다 · 담당 모듈만 표시됩니다
      </span>
      <button
        type="button"
        onClick={exit}
        className={css({
          appearance: 'none',
          border: '1px solid token(colors.warnBd)',
          bg: 'surf',
          color: 'warnFg',
          font: 'inherit',
          textStyle: 'label',
          fontWeight: '700',
          p: '6px 12px',
          borderRadius: 'sm',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flex: 'none',
          _hover: { bg: 'hov' },
        })}
      >
        최고 관리자로 돌아가기
      </button>
    </div>
  )
}
