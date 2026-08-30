import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { css } from 'styled-system/css'
import { token } from 'styled-system/tokens'

/** 쌓아 올리는 2계열 + 그 위를 지나는 비율선 한 칸 */
export type StackedDatum = {
  label: string
  /** 아래 계열 */
  a: number
  /** 위에 쌓이는 계열 */
  b: number
  /** 오른쪽 축의 비율 (%) */
  rate: number
}

type StackedBarLineChartProps = {
  groups: StackedDatum[]
  /** 왼쪽 축(건수) 상한 */
  max: number
  legend: [string, string, string]
  /** 오른쪽 축(비율) 하한 · 상한. 0–100 을 다 쓰면 변화가 안 보인다 */
  rateDomain?: [number, number]
  height?: number
}

/**
 * 쌓은 막대 + 비율선 (AI 심사 통과율 추이).
 *
 * ⚠️ **막대를 쌓는 것과 나란히 놓는 것은 다른 말이다.** 나란히 놓으면 두 계열을 서로
 *    비교하라는 뜻이고, 쌓으면 **둘의 합이 전체**라는 뜻이다. 여기서는 승인 + 반려가
 *    그날 심사한 전부라서 쌓는 쪽이 맞다 — `BarChart` 를 쓰면 총 심사량을 읽을 수 없다.
 *
 * ⚠️ **비율선은 축이 따로다.** 건수(천 단위)와 비율(%)을 한 축에 두면 선이 바닥에
 *    붙어 눕는다. 오른쪽 축은 기본으로 60–100% 만 보여 준다 — 0 부터 그리면
 *    통과율이 몇 %P 움직였는지가 안 보인다.
 */
export function StackedBarLineChart({
  groups,
  max,
  legend,
  rateDomain = [60, 100],
  height = 190,
}: StackedBarLineChartProps) {
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={groups} margin={{ top: 8, right: -14, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={token('colors.ln')} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={{ stroke: token('colors.bd') }}
            tickLine={false}
            tick={{ fill: token('colors.faint'), fontSize: 10 }}
          />
          <YAxis yAxisId="count" domain={[0, max]} hide />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={rateDomain}
            axisLine={false}
            tickLine={false}
            tick={{ fill: token('colors.faint'), fontSize: 10 }}
            tickFormatter={(v: number) => `${v}%`}
            width={38}
          />
          <Bar
            yAxisId="count"
            dataKey="a"
            stackId="judged"
            name={legend[0]}
            fill={token('colors.chart')}
            maxBarSize={22}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="count"
            dataKey="b"
            stackId="judged"
            name={legend[1]}
            fill={token('colors.aFg')}
            radius={[3, 3, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="rate"
            name={legend[2]}
            stroke={token('colors.pri')}
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 범례는 디자인에 맞춰 직접 그린다 — Recharts 기본 범례는 여백·타이포가 다르다 */}
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', pt: '2px', pb: '4px' })}>
        {(
          [
            ['chart', 'square', legend[0]],
            ['aFg', 'square', legend[1]],
            ['pri', 'line', legend[2]],
          ] as const
        ).map(([tone, shape, text]) => (
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
            <span
              className={css({
                width: '9px',
                borderRadius: '2px',
                bg: tone,
                height: shape === 'line' ? '3px' : '9px',
              })}
            />
            {text}
          </div>
        ))}
      </div>
    </>
  )
}
