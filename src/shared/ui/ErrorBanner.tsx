import { css } from 'styled-system/css'

/**
 * 실패 배너. 원본 디자인의 흔들림 연출을 그대로 쓴다.
 *
 * `features/auth` 에 있었는데 보안 화면이 두 번째 사용처가 되어 올렸다
 * (docs/ARCHITECTURE.md §4.4 — 두 번째 feature 가 쓸 때 승격).
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className={css({
        display: 'flex',
        gap: '9px',
        p: '11px 13px',
        mb: '16px',
        bg: 'rBg',
        border: '1px solid token(colors.rBd)',
        borderRadius: 'lg',
        animation: 'rvShake .34s ease',
      })}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" className={css({ flex: 'none', mt: '1px', color: 'rFg' })}>
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8,4.6 V8.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8" cy="11.1" r="0.9" fill="currentColor" />
      </svg>
      <div className={css({ textStyle: 'label', lineHeight: '18px', color: 'rFg' })}>{message}</div>
    </div>
  )
}
