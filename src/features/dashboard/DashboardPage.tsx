import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { BarChart } from '@/shared/ui/chart/BarChart'
import { LineChart } from '@/shared/ui/chart/LineChart'
import { StatCard } from '@/shared/ui/StatCard'

import { useDashboard } from '@/api/dashboard'

import { LiveChallengesCard } from './LiveChallengesCard'
import { TopItemsCard } from './TopItemsCard'

export default function DashboardPage() {
  const { data, isPending, error } = useDashboard()

  if (isPending) return <ScreenState>지표를 불러오는 중…</ScreenState>
  if (error) return <ScreenState tone="danger">{error.message}</ScreenState>

  return (
    <>
      <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '16px', mb: '18px' })}>
        <div className={css({ flex: '1' })}>
          <h2 className={css({ m: '0', textStyle: 'h2', color: 'ink' })}>지표</h2>
          <p className={css({ m: '5px 0 0', textStyle: 'body', color: 'sub' })}>
            시즌 3 · 최근 14일 기준 참여와 경제 지표입니다.
          </p>
        </div>
        <div className={css({ display: 'flex', gap: '8px' })}>
          <Button>기간 설정</Button>
          <Button variant="primary">리포트 내보내기</Button>
        </div>
      </div>

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        })}
      >
        {data.kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
        <Card className={css({ flex: '1 1 520px', p: '17px 19px 12px' })}>
          <CardTitle title="일간 활성 유저" sub="최근 14일 · 천 명" />
          <LineChart values={data.dau.values} domain={data.dau.domain} ticks={data.dau.ticks} />
        </Card>
        <Card className={css({ flex: '1 1 340px', p: '17px 19px 12px' })}>
          <CardTitle title="젬 유입 · 소비" sub="주간 · 백만" />
          <BarChart groups={data.gemFlow.groups} max={data.gemFlow.max} legend={['유입', '소비']} />
        </Card>
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
        <TopItemsCard items={data.topItems} />
        <LiveChallengesCard challenges={data.liveChallenges} />
      </div>
    </>
  )
}

function ScreenState({ children, tone }: { children: React.ReactNode; tone?: 'danger' }) {
  return (
    <div
      className={css({
        textStyle: 'body',
        color: tone === 'danger' ? 'rFg' : 'faint',
        p: '48px 4px',
        textAlign: 'center',
      })}
    >
      {children}
    </div>
  )
}
