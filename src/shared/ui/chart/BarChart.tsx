import {
  Bar,
  BarChart as RcBarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { css } from 'styled-system/css'
import { token } from 'styled-system/tokens'

/** 그룹 바 한 칸. 도메인의 SeriesPoint 와 구조적으로 호환된다. */
export type BarDatum = {
  label: string
  /** 1계열 */
  a: number
  /** 2계열. 한 계열만 그릴 때는 없다 */
  b?: number
}

type BarChartProps = {
  groups: BarDatum[]
  /** y축 상한 */
  max: number
  /** 계열 이름. **하나만 주면 한 계열만 그린다** */
  legend: [string] | [string, string]
  height?: number
}

/**
 * 그룹 바 차트 (대시보드 젬 유입·소비 · 푸시 시간대별 열림).
 *
 * ⚠️ **왼쪽 여백을 음수로 두면 첫 막대가 잘린다.** `YAxis hide` 는 자리를 아예 안
 *    잡으므로 뺄 것이 없는데, `left: -30` 이 그림 영역을 통째로 왼쪽으로 밀어
 *    **첫 칸이 화면 밖으로 나갔다** — 대시보드에서 14개 중 1개가 그렇게 사라져
 *    있었다 (docs/ARCHITECTURE.md §26.4).
 */
export function BarChart({ groups, max, legend, height = 170 }: BarChartProps) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <RcBarChart data={groups} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke={token('colors.ln')} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={{ stroke: token('colors.bd') }}
            tickLine={false}
            tick={{ fill: token('colors.faint'), fontSize: 10 }}
          />
          <YAxis domain={[0, max]} hide />
          <Bar
            dataKey="a"
            name={legend[0]}
            fill={token('colors.pri')}
            radius={3}
            maxBarSize={14}
            isAnimationActive={false}
          />
          {legend[1] !== undefined && (
            <Bar
              dataKey="b"
              name={legend[1]}
              fill={token('colors.chart')}
              radius={3}
              maxBarSize={14}
              isAnimationActive={false}
            />
          )}
        </RcBarChart>
      </ResponsiveContainer>

      {/* 범례는 디자인에 맞춰 직접 그린다 — Recharts 기본 범례는 여백·타이포가 다르다 */}
      <div className={css({ display: 'flex', gap: '14px', pt: '2px', pb: '4px' })}>
        {(
          [
            ['pri', legend[0]],
            ...(legend[1] === undefined ? [] : [['chart', legend[1]] as const]),
          ] as const
        ).map(([tone, text]) => (
          <div
            key={text}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textStyle: 'caption',
              color: 'sub',
            })}
          >
            <span className={css({ width: '9px', height: '9px', borderRadius: '2px', bg: tone })} />
            {text}
          </div>
        ))}
      </div>
    </>
  )
}
