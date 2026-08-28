import { css, cva, cx } from 'styled-system/css'

import { count, num } from '@/shared/lib/format'
import { clampPage, pageCount, pageRange } from '@/shared/lib/pagination'

/** 화살표 넷이 크기·색·포커스 링을 공유한다. */
const arrow = cva({
  base: {
    width: '30px',
    height: '30px',
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    appearance: 'none',
    border: '0',
    bg: 'transparent',
    color: 'faint',
    borderRadius: 'md',
    cursor: 'pointer',
    _hover: { bg: 'hov', color: 'ink' },
    // 흐리게(opacity) 하지 않는다. 비활성 요소는 명암비 규정(1.4.11)의 예외지만,
    // 자리를 지키라고 두는 화살표가 1.7:1 이면 "잠겼다"가 아니라 "없다"로 읽힌다.
    // `faint2`(3.34:1) 로 한 단계만 죽이고, 나머지는 커서와 hover 없음이 말한다.
    _disabled: { color: 'faint2', cursor: 'not-allowed', _hover: { bg: 'transparent' } },
    _focusVisible: {
      outline: 'none',
      boxShadow: '0 0 0 2px token(colors.ringBd), 0 0 0 5px token(colors.ring)',
    },
  },
})

/** 화살표 넷의 아이콘. 끝으로 가는 것은 벽(세로선)을 붙여 "여기서 끝"을 말한다. */
const PATHS = {
  first: 'M8.6,2.2 L4.6,6 L8.6,9.8 M2.6,2.2 V9.8',
  prev: 'M7.6,2.2 L3.6,6 L7.6,9.8',
  next: 'M4.4,2.2 L8.4,6 L4.4,9.8',
  last: 'M3.4,2.2 L7.4,6 L3.4,9.8 M9.4,2.2 V9.8',
} as const

type Dir = keyof typeof PATHS

const LABEL: Record<Dir, string> = {
  first: '첫 페이지',
  prev: '이전 페이지',
  next: '다음 페이지',
  last: '마지막 페이지',
}

type PaginationProps = {
  /** 지금 페이지. **1부터 센다** */
  page: number
  /** 한 쪽에 몇 개를 보여주는가 */
  perPage: number
  /** 걸러진 결과의 **전체** 건수. 지금 쪽의 행 수가 아니다 */
  totalItems: number
  onChange: (page: number) => void
  className?: string
}

/**
 * 목록 아래 페이지 바.
 *
 * **번호를 늘어놓지 않는다.** 어드민에서 "13페이지로 점프"는 거의 일어나지 않는다 —
 * 실제 흐름은 정렬·필터를 바꾸고 앞에서부터 훑는 쪽이다. 번호 목록은 그 드문 조작을
 * 위해 자리를 크게 먹고, 페이지를 옮길 때마다 어느 번호가 보일지가 바뀌어 **누르려던
 * 자리에 다른 숫자가 와 있다.**
 *
 * 대신 번호가 하던 일을 둘로 나눈다.
 *
 * | 번호 목록이 주던 것 | 대신 |
 * |---|---|
 * | 지금 몇 번째 쪽인가 | `9 / 20` |
 * | 얼마나 남았는가 | `384건 중 161–180` — 쪽 수보다 건수가 더 와닿는다 |
 * | 끝으로 한 번에 | `⟨⟨` `⟩⟩` |
 *
 * ⚠️ **오른쪽 조작부의 좌표가 변하면 안 된다.** 폭이 1px만 변해도 방금 누른 자리에
 *    다른 것이 와 있고, 연달아 누르면 화면이 깜빡이는 것처럼 보인다. 요약은 왼쪽에서
 *    오른쪽으로 자라고(`space-between`), `9 / 20` 은 자릿수만큼 폭을 미리 잡고
 *    `tabular-nums` 로 글자 폭까지 고정한다.
 *
 * 계산은 `shared/lib/pagination` — 1부터 세는 페이지와 마지막 쪽의 나머지가
 * 겹치는 자리라 따로 테스트한다 (docs/ARCHITECTURE.md §17.6).
 */
export function Pagination({ page, perPage, totalItems, onChange, className }: PaginationProps) {
  const range = pageRange(page, perPage, totalItems)
  if (!range) return null

  const totalPages = pageCount(totalItems, perPage)
  // 표시(`4 / 20`)·화살표 잠금·`onChange` 가 모두 이 값을 쓴다. 여기서 따로 자르면
  // `pageRange` 가 낸 구간(`61–80`)과 갈라진다.
  const current = clampPage(page, totalPages)
  // `20 / 20` 처럼 가장 긴 조합에 맞춰 미리 자리를 잡는다.
  const positionWidth = 30 + String(totalPages).length * 2 * 8

  return (
    <nav
      aria-label="페이지"
      className={cx(
        css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }),
        className,
      )}
    >
      {/* 쪽을 옮기면 표의 내용이 통째로 바뀐다. 무엇으로 바뀌었는지 알려 준다. */}
      <p aria-live="polite" className={css({ m: '0', textStyle: 'caption', color: 'faint' })}>
        {count(totalItems)} 중 {num(range.from)}–{num(range.to)}
      </p>

      {totalPages > 1 && (
        <div className={css({ display: 'flex', alignItems: 'center', gap: '2px' })}>
          <Arrow dir="first" disabled={current <= 1} onClick={() => onChange(1)} />
          <Arrow dir="prev" disabled={current <= 1} onClick={() => onChange(current - 1)} />

          <span
            className={css({
              px: '4px',
              textAlign: 'center',
              textStyle: 'label',
              fontWeight: '600',
              color: 'sub',
              // 자릿수가 달라도 글자 폭이 같다. 비례 숫자는 1 과 8 의 폭이 달라 흔들린다.
              fontVariantNumeric: 'tabular-nums',
            })}
            style={{ minWidth: positionWidth }}
          >
            <span aria-hidden="true">
              <b className={css({ color: 'ink', fontWeight: '700' })}>{current}</b> / {totalPages}
            </span>
            <span className={css({ srOnly: true })}>
              {totalPages} 페이지 중 {current} 페이지
            </span>
          </span>

          <Arrow dir="next" disabled={current >= totalPages} onClick={() => onChange(current + 1)} />
          <Arrow dir="last" disabled={current >= totalPages} onClick={() => onChange(totalPages)} />
        </div>
      )}
    </nav>
  )
}

function Arrow({ dir, disabled, onClick }: { dir: Dir; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={LABEL[dir]}
      onClick={onClick}
      className={css(arrow.raw())}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d={PATHS[dir]}
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
