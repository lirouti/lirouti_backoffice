import type { ReactNode } from 'react'

import { css, cx } from 'styled-system/css'

type EmptyStateProps = {
  /** 아이콘 컴포넌트. 없으면 원만 남는다 */
  icon?: ReactNode
  title: string
  /** 왜 비었는지 · 무엇을 하면 되는지. 짧게 */
  body?: string
  /** 다음 행동 버튼 */
  action?: ReactNode
  className?: string
}

/**
 * 목록이 비었을 때.
 *
 * "결과 없음" 을 빈 표로 두면 **로딩이 끝난 건지 결과가 없는 건지** 알 수 없다.
 * 필터를 잘못 건 것과 진짜로 데이터가 없는 것도 구분되어야 해서 `body` 로 이유를 쓴다.
 */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        css({
          bg: 'surf',
          border: '1px solid token(colors.bd)',
          borderRadius: 'xl',
          p: '36px 24px',
          textAlign: 'center',
        }),
        className,
      )}
    >
      <div
        className={css({
          width: '52px',
          height: '52px',
          m: '0 auto 14px',
          borderRadius: 'xl',
          bg: 'surf2',
          color: 'faint',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {icon}
      </div>
      <div className={css({ textStyle: 'h3', color: 'ink' })}>{title}</div>
      {body && (
        <p
          className={css({
            m: '6px auto 16px',
            maxWidth: '260px',
            textStyle: 'label',
            lineHeight: '19px',
            color: 'sub',
          })}
        >
          {body}
        </p>
      )}
      {action}
    </div>
  )
}

/** 로딩 자리를 지키는 회색 막대 한 줄의 너비 조합. 다 같으면 기계처럼 보인다. */
const WIDTHS = [
  ['70%', '44%'],
  ['52%', '62%'],
  ['64%', '38%'],
  ['46%', '54%'],
] as const

const bar = css({
  borderRadius: '5px',
  bg: 'surf2',
  animation: 'rvPulse 1.4s ease-in-out infinite',
})

/**
 * 목록 로딩 자리.
 *
 * "불러오는 중…" 텍스트보다 낫다 — 표가 들어올 자리와 크기를 미리 잡아두면
 * 데이터가 도착할 때 화면이 튀지 않는다.
 */
export function Skeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div
      // 스크린리더에게는 반복되는 회색 막대가 의미가 없다. 상태만 알린다.
      role="status"
      aria-label="불러오는 중"
      className={cx(css({ display: 'flex', flexDirection: 'column', gap: '12px' }), className)}
    >
      {Array.from({ length: rows }, (_, i) => {
        const [w1, w2] = WIDTHS[i % WIDTHS.length]!
        return (
          <div key={i} className={css({ display: 'flex', alignItems: 'center', gap: '12px' })} aria-hidden="true">
            <div className={cx(bar, css({ width: '34px', height: '34px', flex: 'none', borderRadius: 'lg' }))} />
            <div className={css({ flex: '1', minWidth: '0' })}>
              <div className={bar} style={{ height: 10, width: w1 }} />
              <div className={bar} style={{ height: 9, width: w2, marginTop: 6 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
