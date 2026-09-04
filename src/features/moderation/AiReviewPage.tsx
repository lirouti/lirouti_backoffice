/**
 * AI 심사 — 자동 심사 현황과 스위치.
 *
 * **끄는 것이 위험한 화면이다.** 꺼지면 모든 인증이 심사 없이 승인되므로 확인 창을
 * 한 번 받는다 (docs/ARCHITECTURE.md §23.4).
 */
import { useState } from 'react'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { StackedBarLineChart, type StackedDatum } from '@/shared/ui/chart/StackedBarLineChart'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonBlock, SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Switch } from '@/shared/ui/Switch'
import { Table, type Column } from '@/shared/ui/Table'

import {
  AI_TABS,
  AI_VERDICT_TONE,
  filterAiReviews,
  type AiDay,
  type AiReview,
  type AiTab,
} from '@/domain/moderation'

import { useAi, useToggleAi } from '@/api/moderation'

/** 소수 첫째 자리를 고정한다. `2초` 와 `2.1초` 가 한 열에 섞이면 자릿수가 어긋나 보인다 */
const sec = (v: number): string => `${v.toFixed(1)}초`

const COLUMNS: Column<AiReview>[] = [
  { key: 'at', label: '일시', width: '150px', nowrap: true },
  { key: 'who', label: '회원', width: '110px', strong: true },
  { key: 'title', label: '챌린지', truncate: true },
  {
    key: 'verdict',
    label: '심사',
    width: '80px',
    render: (r) => <Badge tone={AI_VERDICT_TONE[r.verdict]}>{r.verdict}</Badge>,
  },
  {
    key: 'tookSec',
    label: '소요',
    width: '80px',
    align: 'right',
    // 대기 건은 0 초가 아니라 아직 값이 없다. 0 으로 그리면 "즉시 끝났다" 로 읽힌다.
    render: (r) => (r.tookSec === null ? '—' : sec(r.tookSec)),
  },
  {
    key: 'open',
    // 화면에는 제목이 군더더기지만 **비우면 이 열의 칸들이 헤더를 잃는다** (§38).
    label: '열람',
    labelHidden: true,
    width: '72px',
    align: 'right',
    // TODO(사진 열람 API 가 생기면): 신고 처리와 같은 열람 규칙을 따른다 (§23.2)
    render: () => <Button disabled>보기 · 준비 중</Button>,
  },
]

/** 차트 한 칸. 승인 + 반려가 그날 심사한 전부다 */
const toDatum = (d: AiDay): StackedDatum => {
  const judged = d.passed + d.rejected
  const [, m, dd] = d.date.split('-')
  return {
    label: `${Number(m)}/${Number(dd)}`,
    a: d.passed,
    b: d.rejected,
    rate: judged === 0 ? 0 : Math.round((d.passed / judged) * 100),
  }
}

export default function AiReviewPage() {
  const { data, isPending, error } = useAi()
  const toggle = useToggleAi()
  const [tab, setTab] = useState<AiTab>('전체')
  const [asking, setAsking] = useState(false)

  const rows = filterAiReviews(data?.reviews ?? [], tab)
  const groups = (data?.days ?? []).map(toDatum)
  const max = Math.max(1, ...groups.map((g) => g.a + g.b))

  // 켜는 것은 안전하니 바로 보낸다. 끄는 것만 확인을 받는다.
  const flip = (on: boolean) => (on ? toggle.mutate(true) : setAsking(true))

  return (
    <>
      <PageHeader title="AI 심사" sub="인증 사진 자동 심사 현황입니다." />

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <>
          {/* 지표가 한 줄로 펴지지 않는다 — 실제는 지표 격자 2 : 요약 카드 1 의 2단이다 */}
          <div
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
              alignItems: 'stretch',
              mb: '16px',
            })}
          >
            <SkeletonStats
              count={4}
              min={140}
              className={css({ flex: '2 1 420px', minWidth: '0' })}
            />
            <SkeletonBlock
              height={70}
              silent
              className={css({ flex: '1 1 300px', minWidth: '0' })}
            />
          </div>
          <SkeletonRows rows={8} silent />
        </>
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? 'AI 심사 현황을 불러오지 못했습니다.'} />
      ) : (
        <>
          {toggle.error && <ErrorBanner message={toggle.error.message} />}

          <div
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
              alignItems: 'stretch',
              mb: '16px',
            })}
          >
            <div
              className={css({
                flex: '2 1 420px',
                minWidth: '0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              })}
            >
              <StatTile label="오늘 심사" value={num(data.summary.judgedToday)} />
              <StatTile label="통과율" value={`${data.summary.passRate}%`} />
              <StatTile
                label="심사 대기"
                value={num(data.summary.queued)}
                alert={data.summary.queued > 0}
              />
              <StatTile label="평균 소요" value={sec(data.summary.avgSec)} />
            </div>

            <Card
              className={css({
                flex: '1 1 300px',
                minWidth: '0',
                display: 'flex',
                alignItems: 'center',
                p: '15px 17px',
              })}
            >
              <Switch
                checked={data.enabled}
                onChange={flip}
                disabled={toggle.isPending}
                label={`AI 심사 ${data.enabled ? '켜짐' : '꺼짐'}`}
                hint={
                  data.enabled
                    ? '모든 사진 인증이 자동 심사를 거칩니다'
                    : '심사 없이 즉시 승인됩니다. 장애 시에만 끄세요'
                }
              />
            </Card>
          </div>

          <Card className={css({ p: '17px 20px', mb: '16px' })}>
            <CardTitle title="통과율 추이" sub="최근 14일. 막대는 그날 심사한 건수입니다." />
            <div className={css({ mt: '10px' })}>
              <StackedBarLineChart
                groups={groups}
                max={max}
                legend={['승인', '반려', '통과율']}
              />
            </div>
          </Card>

          <div
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              mb: '14px',
            })}
          >
            <Segmented
              value={tab}
              onChange={setTab}
              options={[...AI_TABS]}
              aria-label="심사 결과"
            />
            <span className={css({ textStyle: 'caption', color: 'faint' })}>
              최근 {num(data.reviews.length)}건입니다. 전체 건수는 위 지표를 보세요.
            </span>
          </div>

          <Table columns={COLUMNS} rows={rows} minWidth={760} rowKey={(r) => String(r.key)} />

          {/*
        원본에 있던 경고를 그대로 남긴다. 이건 화면의 결함이 아니라 **백엔드에 없는 것**을
        운영자에게 미리 알리는 문장이라, 지우면 문의가 들어왔을 때 답을 못 한다.
      */}
          <p
            className={css({
              m: '14px 0 0',
              p: '11px 14px',
              borderRadius: 'lg',
              bg: 'aBg',
              border: '1px solid token(colors.warnBd)',
              textStyle: 'caption',
              color: 'warnFg',
            })}
          >
            <strong>반려는 건수만 남습니다.</strong> 어느 회원의 무엇이 왜 반려됐는지는 기록되지
            않아 이 목록에 나타나지 않습니다 — 「왜 반려됐나요」 라는 문의에 답할 근거가
            없습니다. 반려 사유를 남기는 백엔드 작업이 필요합니다.
          </p>

          <Dialog
            open={asking}
            onCancel={() => setAsking(false)}
            onConfirm={() => {
              toggle.mutate(false, { onSuccess: () => setAsking(false) })
            }}
            title="AI 심사를 끕니다"
            body="끄는 동안 올라오는 모든 인증이 심사 없이 즉시 승인됩니다. 나중에 켜도 그사이 통과한 것은 다시 심사하지 않습니다."
            tone="danger"
            confirmLabel="끄기"
          />
        </>
      )}
    </>
  )
}
