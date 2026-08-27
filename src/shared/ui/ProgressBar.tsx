import { css } from 'styled-system/css'
import { token } from 'styled-system/tokens'

/** 원본 규칙: 60% 이상 초록, 35% 이상 브랜드, 그 아래 주황 */
function barColor(rate: number): string {
  if (rate >= 60) return token('colors.gFg')
  if (rate >= 35) return token('colors.pri')
  return '#E8A33D'
}

type ProgressBarProps = {
  rate: number
  /**
   * 무엇의 진행률인지. **필수다.**
   *
   * `role="progressbar"` 는 접근 가능한 이름이 없으면 스크린리더에서 그냥 "34%" 로만
   * 읽힌다 — 무엇의 34% 인지 알 수 없다. 옵션으로 두면 빠뜨리게 되므로 required 로 둔다.
   */
  label: string
}

export function ProgressBar({ rate, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, rate))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      // 숫자만 읽으면 단위를 알 수 없다.
      aria-valuetext={`${clamped}%`}
      className={css({ height: '6px', borderRadius: '4px', bg: 'grid', overflow: 'hidden' })}
    >
      <div
        className={css({ height: '6px', borderRadius: '4px' })}
        style={{ width: `${clamped}%`, background: barColor(clamped) }}
      />
    </div>
  )
}
