/**
 * 지표 화면.
 *
 * 원본 디자인의 첫 화면이고 유일하게 차트를 쓴다. recharts 를 안고 있어 청크가
 * gzip 111KB 라, 라우터에서 lazy 로 두는 것이 전제다 (§9.2).
 */
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
        {/*
          둘 다 아직 동작하지 않는다. 눌러도 아무 일이 없는 버튼은 "이 도구는
          고장났다"를 학습시키므로, 상단 헤더의 가짜 검색창을 지운 것과 같은 이유로
          **비활성으로 표시**한다. 지우지 않는 이유는 자리와 크기가 디자인 대조에
          쓰이고, 붙일 곳이 명확해서다 (로그인 화면의 "비밀번호 재설정"과 같은 처리).

          TODO(useSearchParams 필터 도입 시): 기간 설정
          TODO(서버 집계 엔드포인트가 생기면): 리포트 내보내기
        */}
        <div className={css({ display: 'flex', gap: '8px' })}>
          <Button disabled title="준비 중">
            기간 설정
          </Button>
          <Button variant="primary" disabled title="준비 중">
            리포트 내보내기
          </Button>
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
