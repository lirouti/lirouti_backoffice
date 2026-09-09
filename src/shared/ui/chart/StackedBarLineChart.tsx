import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { css } from 'styled-system/css'
import { token } from 'styled-system/tokens'

import { num } from '@/shared/lib/format'

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

/**
 * 세 계열의 색. **막대 · 선 · 범례 · 말풍선이 같은 값을 봐야 한다** —
 * 네 곳에 따로 적으면 하나만 바뀌어도 범례가 거짓말을 한다.
 */
const SERIES_FILL = {
  a: token('colors.chart'),
  b: token('colors.chart2'),
  rate: token('colors.pri'),
} as const

type StackedBarLineChartProps = {
  groups: StackedDatum[]
  /** 왼쪽 축(건수)에 들어올 **데이터 최댓값**. 축 상한은 여기서 한 단계 올려 잡는다 */
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
 *
 * ⚠️ **여백을 음수로 두지 말 것.** `margin.right: -14` 였을 때 그림 영역이 오른쪽으로
 *    밀려 **`%` 축 라벨이 SVG 밖으로 나갔고, `overflow: hidden` 이라 잘렸다** — 화면에
 *    「100%」 가 「100」 으로 나왔다. 왼쪽에서 첫 막대를 잘라 먹던 것과 같은 원인이다
 *    (docs/ARCHITECTURE.md §26.4 · §65).
 */
export function StackedBarLineChart({
  groups,
  max,
  legend,
  rateDomain = [60, 100],
  height = 210,
}: StackedBarLineChartProps) {
  const top = axisTop(max)

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={groups} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={token('colors.ln')} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={{ stroke: token('colors.bd') }}
            tickLine={false}
            tick={{ fill: token('colors.faint'), fontSize: 10 }}
          />
          {/*
            건수 축을 **보여 준다.** 숨겨 두면 막대 높이가 50건인지 500건인지 알 수 없고,
            그러면 가로 그리드선도 읽을 눈금이 없어 장식이 된다.
          */}
          <YAxis
            yAxisId="count"
            domain={[0, top]}
            ticks={countTicks(top)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: token('colors.faint'), fontSize: 10 }}
            // ⚠️ **말풍선과 같은 서식을 쓴다.** 축이 `1500`, 말풍선이 `1,352` 면 같은
            //    차트 안에서 천 단위 구분이 갈려 두 수가 다른 단위처럼 읽힌다.
            tickFormatter={num}
            width={48}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={rateDomain}
            axisLine={false}
            tickLine={false}
            tick={{ fill: token('colors.faint'), fontSize: 10 }}
            tickFormatter={(v: number) => `${v}%`}
            width={40}
          />
          <Tooltip
            content={<ChartTip legend={legend} />}
            cursor={{ fill: token('colors.hov') }}
            isAnimationActive={false}
          />
          {/*
            ⚠️ **모서리를 둥글리지 않는다.** 위 계열에만 `radius` 를 주면 그 계열이 0 인 날만
               꼭대기가 각져서 **하루씩 다른 모양**이 된다. 쌓은 막대는 평평한 편이 고르다.
          */}
          <Bar
            yAxisId="count"
            dataKey="a"
            stackId="judged"
            name={legend[0]}
            fill={SERIES_FILL.a}
            maxBarSize={34}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="count"
            dataKey="b"
            stackId="judged"
            name={legend[1]}
            fill={SERIES_FILL.b}
            maxBarSize={34}
            isAnimationActive={false}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="rate"
            name={legend[2]}
            stroke={SERIES_FILL.rate}
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 범례는 디자인에 맞춰 직접 그린다 — Recharts 기본 범례는 여백·타이포가 다르다 */}
      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          pt: '2px',
          pb: '4px',
        })}
      >
        {(
          [
            [SERIES_FILL.a, 'square', legend[0]],
            [SERIES_FILL.b, 'square', legend[1]],
            [SERIES_FILL.rate, 'line', legend[2]],
          ] as const
        ).map(([fill, shape, text]) => (
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
            {/*
              ⚠️ **색은 `style` 로 넣는다.** `css({ bg: tone })` 에 **변수**를 주면 Panda 가
                 정적으로 못 읽어 `bg_chart` 라는 **클래스 이름만 나가고 규칙은 안 생긴다** —
                 그래서 범례 조각이 투명했다. 이름이 없는 토큰(§39)과 달리 **이름은 맞는데
                 규칙이 없는** 경우라 `check-tokens` 도 못 잡는다 (§65).

              조각에 테두리도 준다. 9px 은 막대와 달리 면적이 작아 옅은 `chart`(흰 표면 위
              1.53:1)가 배경에 묻힌다.
            */}
            <span
              style={{ background: fill }}
              className={css({
                width: '9px',
                borderRadius: '2px',
                border: '1px solid token(colors.bd)',
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

/**
 * 축 상한 — 데이터 최댓값 **바로 위의 어림수**.
 *
 * ⚠️ **최댓값을 그대로 상한으로 쓰지 말 것.** 제일 높은 막대가 그림 영역 천장에 정확히
 *    닿아 잘린 것처럼 보인다 — 실제로 그렇게 그려지고 있었다(§65).
 *
 * ⚠️ **반대로 너무 띄우면 그림이 비어 보인다.** 여유를 12%로 두고 어림수 단계가 성글면
 *    **한 단계를 통째로 건너뛴다** — 1352가 1500을 지나쳐 2000이 되어 제일 높은 막대가
 *    높이의 68%까지만 찼다. 여유는 천장에 안 닿을 만큼(5%)만 두고, 단계를 촘촘히 해서
 *    가까운 어림수를 잡는다. 3~2800 범위를 훑어 **채움률 72–95%**를 확인했다.
 */
function axisTop(max: number): number {
  if (max <= 0) return 1
  const room = max * 1.05
  const pow = 10 ** Math.floor(Math.log10(room))
  return ([1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8].find((s) => room <= s * pow) ?? 10) * pow
}

/** 0 · 중간 · 상한 셋만 찍는다. 눈금이 촘촘하면 막대보다 눈에 띈다 */
function countTicks(top: number): number[] {
  return [0, Math.round(top / 2), top]
}

type ChartTipProps = {
  legend: [string, string, string]
  /** Recharts 가 넣어 준다 */
  active?: boolean
  payload?: { payload: StackedDatum }[]
}

/**
 * 값 말풍선.
 *
 * **왜 직접 그리나** — 기본 말풍선은 계열 이름을 `a`·`b` 로 뱉고 **합계와 통과율을
 * 나란히 놓지 못한다.** 이 차트에서 알고 싶은 것은 「그날 몇 건을 심사해서 몇 %가
 * 통과했나」 라 셋이 한자리에 있어야 한다.
 */
function ChartTip({ active, payload, legend }: ChartTipProps) {
  const d = payload?.[0]?.payload
  if (!active || !d) return null

  return (
    <div
      className={css({
        bg: 'surf',
        border: '1px solid token(colors.bd)',
        borderRadius: 'lg',
        boxShadow: '0 8px 24px rgba(16,24,40,.14)',
        p: '8px 11px',
        minWidth: '132px',
      })}
    >
      <div
        className={css({ textStyle: 'caption', fontWeight: '700', color: 'ink', mb: '5px' })}
      >
        {d.label}
      </div>
      {(
        [
          [legend[0], num(d.a), SERIES_FILL.a],
          [legend[1], num(d.b), SERIES_FILL.b],
          ['합계', num(d.a + d.b), null],
          [legend[2], `${d.rate}%`, SERIES_FILL.rate],
        ] as const
      ).map(([name, value, fill]) => (
        <div
          key={name}
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textStyle: 'micro',
            color: 'sub',
            lineHeight: '1.7',
          })}
        >
          <span
            style={{ background: fill ?? 'transparent' }}
            className={css({
              width: '7px',
              height: '7px',
              borderRadius: '2px',
              flexShrink: 0,
              border: '1px solid transparent',
            })}
          />
          <span className={css({ flex: '1' })}>{name}</span>
          <span className={css({ color: 'ink', fontWeight: '600' })}>{value}</span>
        </div>
      ))}
    </div>
  )
}
