import { css, cva, cx } from 'styled-system/css'

import { pageWindow } from '@/shared/lib/pagination'

/** 번호 칸과 앞뒤 화살표가 같은 크기·같은 상태를 갖는다. 그 반복을 레시피로 흡수한다. */
const cell = cva({
  base: {
    minWidth: '30px',
    height: '30px',
    px: '7px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    appearance: 'none',
    font: 'inherit',
    textStyle: 'label',
    fontWeight: '600',
    borderRadius: 'sm',
    borderWidth: '1px',
    borderStyle: 'solid',
    cursor: 'pointer',
    _focusVisible: { outline: 'none', boxShadow: '0 0 0 3px token(colors.ring)', borderColor: 'ringBd' },
    _disabled: { opacity: 0.45, cursor: 'not-allowed', _hover: { bg: 'surf' } },
  },
  variants: {
    on: {
      true: { borderColor: 'pri', bg: 'pri', color: 'onPri', fontWeight: '700' },
      false: { borderColor: 'bd', bg: 'surf', color: 'sub', _hover: { bg: 'hov', color: 'ink' } },
    },
  },
  defaultVariants: { on: false },
})

type PaginationProps = {
  /** 지금 페이지. **1부터 센다** */
  page: number
  /** 전체 페이지 수. 1 이하면 아무것도 그리지 않는다 */
  totalPages: number
  onChange: (page: number) => void
  /** 현재 페이지 양옆으로 몇 장까지 펼칠지 */
  span?: number
  className?: string
}

/**
 * 목록 아래 페이지 바.
 *
 * **건수 표시("총 1,234건")는 넣지 않았다.** 그건 목록이 방금 무엇을 걸렀는지에
 * 딸린 정보라 필터와 같은 줄에 있어야 하고, 여기 넣으면 페이지를 옮길 때마다
 * 같이 깜빡인다. 화면이 표 위쪽 툴바에서 직접 그린다.
 *
 * 번호 계산은 `shared/lib/pagination` 의 `pageWindow` — 경계가 어긋나기 쉬워
 * 따로 테스트한다 (docs/ARCHITECTURE.md §17.6).
 */
export function Pagination({ page, totalPages, onChange, span = 1, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const current = Math.min(Math.max(page, 1), totalPages)

  return (
    <nav
      aria-label="페이지"
      className={cx(css({ display: 'flex', alignItems: 'center', gap: '4px' }), className)}
    >
      <Arrow dir="prev" disabled={current <= 1} onClick={() => onChange(current - 1)} />

      {pageWindow(current, totalPages, span).map((p, i) =>
        p === 'gap' ? (
          <span
            // 생략 자리는 위치 말고 구분할 것이 없다. 앞뒤 번호가 키를 갈라 준다.
            key={`gap-${i}`}
            aria-hidden="true"
            className={css({ px: '4px', color: 'faint2', userSelect: 'none' })}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            // 목록 전체가 아니라 **이 번호가** 현재 페이지다
            aria-current={p === current ? 'page' : undefined}
            aria-label={`${p} 페이지`}
            onClick={() => onChange(p)}
            className={css(cell.raw({ on: p === current }))}
          >
            {p}
          </button>
        ),
      )}

      <Arrow dir="next" disabled={current >= totalPages} onClick={() => onChange(current + 1)} />
    </nav>
  )
}

function Arrow({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  const prev = dir === 'prev'

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={prev ? '이전 페이지' : '다음 페이지'}
      onClick={onClick}
      className={css(cell.raw())}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d={prev ? 'M7.5,2 L3.5,6 L7.5,10' : 'M4.5,2 L8.5,6 L4.5,10'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
