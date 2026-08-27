import { css } from 'styled-system/css'

import { Card } from './Card'

/**
 * shared/ui 는 도메인을 모른다. `Kpi` 를 직접 받지 않고 같은 모양의 계약만 선언한다
 * — 구조적 타이핑이라 `Kpi` 를 그대로 넘길 수 있으면서 의존은 생기지 않는다.
 */
type StatCardProps = {
  label: string
  value: string
  /** '+6.2%' 처럼 부호를 포함한 변화량 */
  delta: string
  direction: 'up' | 'down'
  note: string
}

export function StatCard({ label, value, delta, direction, note }: StatCardProps) {
  const up = direction === 'up'
  return (
    <Card className={css({ px: '17px', pt: '15px', pb: '16px' })}>
      <div className={css({ textStyle: 'label', color: 'sub' })}>{label}</div>
      <div className={css({ mt: '7px', textStyle: 'display', color: 'ink' })}>{value}</div>
      <div
        className={css({
          mt: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          textStyle: 'caption',
          fontWeight: '700',
          color: up ? 'gFg' : 'rFg',
        })}
      >
        <span aria-hidden="true">{up ? '▲' : '▼'}</span>
        <span>{delta}</span>
        <span className={css({ fontWeight: '500', color: 'faint' })}>{note}</span>
      </div>
    </Card>
  )
}
