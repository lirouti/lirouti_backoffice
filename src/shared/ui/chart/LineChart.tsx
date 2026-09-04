import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { token } from 'styled-system/tokens'

type LineChartProps = {
  values: number[]
  /** y축 하한 · 상한 */
  domain: [number, number]
  /** y축 눈금 값 */
  ticks: number[]
  height?: number
}

/**
 * 추이 영역 차트 (대시보드 DAU).
 *
 * 색은 전부 `token()` 이 돌려주는 `var(--colors-*)` 문자열을 넘긴다.
 * Recharts 는 SVG 로 그리므로 CSS 변수가 그대로 해석되고, 테마를 토글해도
 * 리렌더 없이 색이 따라온다 — canvas 기반 라이브러리로는 안 되는 부분이다.
 */
export function LineChart({ values, domain, ticks, height = 170 }: LineChartProps) {
  const data = values.map((v, i) => ({ i, v }))
  const last = data.length - 1

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: -18 }}>
        <CartesianGrid stroke={token('colors.ln')} vertical={false} />
        <XAxis dataKey="i" hide />
        <YAxis
          domain={domain}
          ticks={ticks}
          axisLine={false}
          tickLine={false}
          tick={{ fill: token('colors.faint'), fontSize: 10 }}
          width={40}
        />
        <Area
          type="linear"
          dataKey="v"
          stroke={token('colors.pri')}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill={token('colors.soft')}
          fillOpacity={1}
          isAnimationActive={false}
          dot={false}
          activeDot={false}
        />
        {/* 원본 디자인과 동일하게 마지막 점에만 마커를 찍는다 */}
        <ReferenceDot
          x={last}
          y={values[last]}
          r={4.2}
          fill={token('colors.surf')}
          stroke={token('colors.pri')}
          strokeWidth={2.4}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
