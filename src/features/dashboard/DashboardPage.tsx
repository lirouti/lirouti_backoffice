/**
 * 지표 화면.
 *
 * 원본 디자인의 첫 화면이고 유일하게 차트를 쓴다. recharts 를 안고 있어 청크가
 * gzip 111KB 라, 라우터에서 lazy 로 두는 것이 전제다 (docs/ARCHITECTURE.md §9.2).
 */
import { css } from 'styled-system/css'

import { csvSection, joinCsvSections, type CsvColumn } from '@/shared/lib/csv'
import { downloadCsv } from '@/shared/lib/download'
import { today } from '@/shared/lib/today'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { BarChart } from '@/shared/ui/chart/BarChart'
import { LineChart } from '@/shared/ui/chart/LineChart'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonBlock, SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatCard } from '@/shared/ui/StatCard'

import { CHALLENGE_KIND_LABEL, type Challenge } from '@/domain/challenge'
import type { Kpi, SeriesPoint } from '@/domain/dashboard'
import { SLOT_LABEL, TIER_LABEL, type Item } from '@/domain/item'
import { CURRENT_SEASON, seasonLabel } from '@/domain/season'

import { useDashboard } from '@/api/dashboard'

import { LiveChallengesCard } from './LiveChallengesCard'
import { TopItemsCard } from './TopItemsCard'

export default function DashboardPage() {
  const { data, isPending, error } = useDashboard()

  /**
   * 화면의 넷을 **한 파일에** 담는다 — 구역마다 제목을 두고 빈 줄로 나눈다.
   *
   * ⚠️ **엄격한 CSV 가 아니다**(§57.2). 구역마다 열 수가 달라서 파서에 그대로 물리면
   *    깨진다 — 운영자가 엑셀로 한 번에 열어 보는 용도다.
   */
  const exportCsv = () => {
    if (!data) return
    downloadCsv(
      `riruti-dashboard-${today()}.csv`,
      joinCsvSections([
        csvSection('지표', data.kpis, KPI_COLUMNS),
        csvSection('일간 활성 유저 (천 명)', data.dau.points, DAU_COLUMNS),
        csvSection('젬 유입 · 소비 (백만)', data.gemFlow.groups, GEM_COLUMNS),
        csvSection('인기 아이템', data.topItems, TOP_ITEM_COLUMNS),
        csvSection('진행 중 챌린지', data.liveChallenges, CHALLENGE_COLUMNS),
      ]),
    )
  }

  return (
    <>
      {/*
        버튼 둘 다 아직 동작하지 않는다. 눌러도 아무 일이 없는 버튼은 "이 도구는
        고장났다"를 학습시키므로, 상단 헤더의 가짜 검색창을 지운 것과 같은 이유로
        **비활성으로 표시**한다. 지우지 않는 이유는 자리와 크기가 디자인 대조에
        쓰이고, 붙일 곳이 명확해서다 (로그인 화면의 "비밀번호 재설정"과 같은 처리).

        TODO(대시보드에 기간 필터가 생기면): 기간 설정 — 목이 14일치뿐이라 아직 고를 것이 없다
      */}
      <PageHeader
        title="지표"
        sub={`${seasonLabel(CURRENT_SEASON.no)} · 최근 14일 기준 참여와 경제 지표입니다.`}
        actions={
          <>
            <Button disabled>기간 설정 · 준비 중</Button>
            <Button variant="primary" disabled={!data} onClick={exportCsv}>
              리포트 내보내기
            </Button>
          </>
        }
      />

      {/*
        ⚠️ **헤더는 로딩 중에도 그린다.** 제목·부제·버튼은 데이터가 없어도 아는 값이라,
        지웠다 다시 그리면 **아는 것까지 튄다** (docs/ARCHITECTURE.md §43).
      */}
      {isPending ? (
        <DashboardSkeleton />
      ) : error ? (
        <ScreenState tone="danger">{error.message}</ScreenState>
      ) : (
        <>
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
              <LineChart
                values={data.dau.points.map((p) => p.value)}
                domain={data.dau.domain}
                ticks={data.dau.ticks}
              />
            </Card>
            <Card className={css({ flex: '1 1 340px', p: '17px 19px 12px' })}>
              <CardTitle title="젬 유입 · 소비" sub="주간 · 백만" />
              <BarChart
                groups={data.gemFlow.groups}
                max={data.gemFlow.max}
                legend={['유입', '소비']}
              />
            </Card>
          </div>

          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
            <TopItemsCard items={data.topItems} />
            <LiveChallengesCard challenges={data.liveChallenges} />
          </div>
        </>
      )}
    </>
  )
}

/** 지표 6 + 차트 2 + 목록 카드 2. 실제 화면과 같은 자리를 잡는다 */
function DashboardSkeleton() {
  return (
    <>
      {/* `min` 은 아래 실제 격자와 **같은 200** 이어야 한다 — 다르면 열 수가 바뀌어 튄다 */}
      <SkeletonStats count={6} min={200} variant="card" />
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
        <SkeletonBlock height={196} silent className={css({ flex: '1 1 520px' })} />
        <SkeletonBlock height={196} silent className={css({ flex: '1 1 340px' })} />
      </div>
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
        <SkeletonRows rows={5} silent className={css({ flex: '1 1 420px' })} />
        <SkeletonRows rows={5} silent className={css({ flex: '1 1 420px' })} />
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

/**
 * 파일에 담을 열.
 *
 * ⚠️ **화면이 그리는 것과 같은 값이어야 한다.** KPI 는 이미 서식을 갖춘 문자열이라
 *    그대로 쓰고(`24,180`), 차트 값은 숫자라 숫자로 넣는다 — 엑셀에서 계산에 쓰려면
 *    숫자여야 한다 (docs/ARCHITECTURE.md §56.1).
 */
const KPI_COLUMNS: CsvColumn<Kpi>[] = [
  { header: '지표', value: (k) => k.label },
  { header: '값', value: (k) => k.value },
  { header: '변화', value: (k) => k.delta },
  { header: '기준', value: (k) => k.note },
]

const DAU_COLUMNS: CsvColumn<{ date: string; value: number }>[] = [
  { header: '날짜', value: (d) => d.date },
  { header: '활성 유저(천 명)', value: (d) => d.value },
]

const GEM_COLUMNS: CsvColumn<SeriesPoint>[] = [
  { header: '주차', value: (g) => g.label },
  { header: '유입(백만)', value: (g) => g.a },
  { header: '소비(백만)', value: (g) => g.b },
]

const TOP_ITEM_COLUMNS: CsvColumn<Item>[] = [
  { header: '아이템', value: (it) => it.name },
  { header: '슬롯', value: (it) => SLOT_LABEL[it.slot] },
  { header: '등급', value: (it) => TIER_LABEL[it.tier] },
  { header: '판매', value: (it) => it.sold },
  { header: '보유율(%)', value: (it) => it.own },
]

const CHALLENGE_COLUMNS: CsvColumn<Challenge>[] = [
  { header: '챌린지', value: (c) => c.title },
  { header: '구분', value: (c) => CHALLENGE_KIND_LABEL[c.kind] },
  { header: '조건', value: (c) => c.cond },
  { header: '목표', value: (c) => c.goal },
  { header: '달성률(%)', value: (c) => c.rate },
]
