import { css } from 'styled-system/css'
import { token } from 'styled-system/tokens'

/**
 * 색이 무엇을 말하는가.
 *
 * - `signal`(기본) — **높을수록 좋은 값.** 보유율·달성률처럼 낮으면 손봐야 하는 것
 * - `plain` — **좋고 나쁨이 없는 값.** 합이 100 인 분포의 한 조각처럼 서로 비교만 하는 것
 */
export type ProgressTone = 'signal' | 'plain'

/** 원본 규칙: 60% 이상 초록, 35% 이상 브랜드, 그 아래 주황 */
function barColor(rate: number, tone: ProgressTone): string {
  if (tone === 'plain') return token('colors.pri')
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
  /**
   * ⚠️ **분포의 한 조각에는 `plain` 을 쓸 것.** 신호등 색은 「높을수록 좋다」 는 뜻이라,
   *    합이 100 인 비중에 쓰면 **가장 많이 팔린 상품이 초록, 큰 팩이 주황**으로 칠해진다.
   *    큰 팩은 원래 건수가 적은 것이지 나쁜 것이 아니다 (docs/ARCHITECTURE.md §24.2.1).
   */
  tone?: ProgressTone
}

export function ProgressBar({ rate, label, tone = 'signal' }: ProgressBarProps) {
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
        style={{ width: `${clamped}%`, background: barColor(clamped, tone) }}
      />
    </div>
  )
}
