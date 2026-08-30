import { css } from 'styled-system/css'

type StatTileProps = {
  label: string
  /** 이미 서식을 갖춘 문자열. 단위·천 단위 구분은 부르는 쪽이 붙인다 */
  value: string
  /**
   * 눈에 띄어야 하는 값인가. **0 이 아닌 「확인 필요」 처럼 사람이 손대야 하는 수**에만.
   *
   * ⚠️ 큰 수나 나쁜 수라고 켜지 말 것 — 넷 중 둘이 빨가면 어느 것도 안 보인다.
   */
  alert?: boolean
}

/**
 * 목록 위에 나란히 놓는 요약 숫자 하나.
 *
 * 회원 · 챌린지 · 결제 · 모더레이션 네 화면에 **같은 마크업이 복붙**돼 있던 것을 올렸다
 * (규약은 두 번째 소비자에서 승격인데 이미 네 번째였다 — docs/ARCHITECTURE.md §4.4).
 *
 * ⚠️ **`StatCard` 와 다르다.** 저쪽은 지표 화면의 KPI 라 **변화량(`delta`)이 필수**다.
 *    비교할 지난 값이 없는 수(밀린 건수·오늘 접수)를 저기 넣으면 `+0.0%` 같은
 *    의미 없는 화살표를 지어내게 된다. 숫자 하나뿐이면 이쪽을 쓴다.
 */
export function StatTile({ label, value, alert }: StatTileProps) {
  return (
    <div
      className={css({
        bg: 'surf',
        border: '1px solid token(colors.bd)',
        borderRadius: 'lg',
        p: '13px 15px',
      })}
    >
      <div className={css({ textStyle: 'caption', color: 'sub' })}>{label}</div>
      <div className={css({ mt: '4px', textStyle: 'h3', fontWeight: '700', color: alert ? 'rFg' : 'ink' })}>
        {value}
      </div>
    </div>
  )
}
