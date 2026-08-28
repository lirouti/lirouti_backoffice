import { css, cva, cx } from 'styled-system/css'

import { pageWindow } from '@/shared/lib/pagination'

/**
 * 번호 칸과 앞뒤 화살표가 크기·포커스 링을 공유한다. 그 반복을 레시피로 흡수한다.
 *
 * ⚠️ **포커스 링이 두 겹이다.** 다른 입력들은 테두리를 `ringBd` 로 바꾸고 옅은
 *    후광(`ring`, 알파 .18)만 더하는데, 여기는 평상시 테두리가 없어서 후광만으로는
 *    **포커스가 어디 있는지 안 보인다.** 안쪽에 `ringBd` 실선을 깔아 대신한다.
 */
const cell = cva({
  base: {
    minWidth: '30px',
    height: '30px',
    px: '9px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    appearance: 'none',
    border: '0',
    bg: 'transparent',
    font: 'inherit',
    textStyle: 'label',
    fontWeight: '600',
    borderRadius: '999px',
    cursor: 'pointer',
    transition: 'background .12s, color .12s',
    _focusVisible: {
      outline: 'none',
      boxShadow: '0 0 0 2px token(colors.ringBd), 0 0 0 5px token(colors.ring)',
    },
  },
  variants: {
    on: {
      true: { bg: 'pri', color: 'onPri', fontWeight: '700' },
      false: { color: 'sub', _hover: { bg: 'hov', color: 'ink' } },
    },
    arrow: {
      true: {
        color: 'faint',
        _hover: { bg: 'hov', color: 'ink' },
        // 흐리게(opacity) 하지 않는다. 비활성 요소는 명암비 규정(1.4.11)의 예외지만,
        // 자리를 지키라고 두는 화살표가 1.7:1 이면 "잠겼다"가 아니라 "없다"로 읽힌다.
        // `faint2`(3.34:1) 로 한 단계만 죽이고, 나머지는 커서와 hover 없음이 말한다.
        _disabled: { color: 'faint2', cursor: 'not-allowed', _hover: { bg: 'transparent' } },
      },
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
 * **칸마다 테두리를 두르지 않는다.** 상자 여덟 개가 늘어서면 계산기 버튼처럼 보이고,
 * 바로 위 표의 가로줄과도 싸운다. 채운 것은 **현재 페이지 하나뿐**이라 지금 어디인지가
 * 한눈에 들어온다.
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
      className={cx(css({ display: 'flex', alignItems: 'center', gap: '2px' }), className)}
    >
      <Arrow dir="prev" disabled={current <= 1} onClick={() => onChange(current - 1)} />

      {pageWindow(current, totalPages, span).map((p, i) =>
        p === 'gap' ? (
          <span
            // 생략 자리는 위치 말고 구분할 것이 없다. 앞뒤 번호가 키를 갈라 준다.
            key={`gap-${i}`}
            aria-hidden="true"
            className={css({
              minWidth: '22px',
              textAlign: 'center',
              color: 'faint2',
              userSelect: 'none',
            })}
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
      className={css(cell.raw({ arrow: true }))}
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
