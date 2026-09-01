/**
 * 초안을 되살렸다는 알림과, 「임시 저장됨」 표시.
 *
 * 폼 화면 일곱 곳이 같은 마크업을 갖게 되어 올렸다 (docs/ARCHITECTURE.md §4.4).
 */
import { css } from 'styled-system/css'

import { Button } from './Button'

/**
 * 저장해 둔 초안으로 폼을 채웠음을 알린다.
 *
 * `role="status"` 다 — 사용자가 한 일이 아니라 **화면이 알아서 한 일**이라
 * 스크린리더도 알아야 하지만, `alert` 로 끊을 만큼 급하지는 않다.
 */
export function DraftNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div
      role="status"
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        p: '10px 14px',
        mb: '14px',
        // ⚠️ `warnBg` 라는 토큰은 없다. 예전에는 그렇게 적혀 있어서 **배경이 아예 안
        //    칠해졌다** — 잘못된 CSS 는 브라우저가 조용히 버린다 (docs/ARCHITECTURE.md §39).
        //    경고 톤의 배경은 `aBg` 다 (`ViewerBanner` 와 같은 짝).
        bg: 'aBg',
        border: '1px solid token(colors.warnBd)',
        borderRadius: 'lg',
        textStyle: 'label',
        color: 'warnFg',
      })}
    >
      <span className={css({ flex: '1' })}>임시 저장된 내용을 불러왔습니다.</span>
      <Button size="sm" onClick={onDiscard}>
        새로 시작
      </Button>
    </div>
  )
}

/**
 * 방금 임시 저장됐음을 조용히 알린다.
 *
 * `aria-live="polite"` — 저장은 사용자가 누른 것이라 끊고 읽을 만큼 급하지 않다.
 */
export function DraftSavedAt({ at }: { at: Date | null }) {
  if (!at) return null

  return (
    <p
      aria-live="polite"
      className={css({ m: '8px 0 0', textAlign: 'right', textStyle: 'caption', color: 'faint' })}
    >
      임시 저장됨
    </p>
  )
}
