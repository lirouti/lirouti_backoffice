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

/** 2계열 그룹 바 한 칸. 도메인의 SeriesPoint 와 구조적으로 호환된다. */
export type BarDatum = {
  label: string
  /** 1계열 */
  a: number
  /** 2계열 */
  b: number
}

type BarChartProps = {
  groups: BarDatum[]
  /** y축 상한 */
  max: number
  legend: [string, string]
  height?: number
}

/** 2계열 그룹 바 차트 (대시보드 젬 유입·소비) */
export function BarChart({ groups, max, legend, height = 170 }: BarChartProps) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <RcBarChart data={groups} margin={{ top: 8, right: 8, bottom: 0, left: -30 }} barGap={2}>
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
          <Bar
            dataKey="b"
            name={legend[1]}
            fill={token('colors.chart')}
            radius={3}
            maxBarSize={14}
            isAnimationActive={false}
          />
        </RcBarChart>
      </ResponsiveContainer>

      {/* 범례는 디자인에 맞춰 직접 그린다 — Recharts 기본 범례는 여백·타이포가 다르다 */}
      <div className={css({ display: 'flex', gap: '14px', pt: '2px', pb: '4px' })}>
        {(
          [
            ['pri', legend[0]],
            ['chart', legend[1]],
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
