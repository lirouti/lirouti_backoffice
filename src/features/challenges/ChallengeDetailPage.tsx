/**
 * 챌린지 상세 — 읽기 + 「중단」.
 *
 * 값 수정은 별도 화면(`/challenges/:chalId/edit`)이다. **한 필드를 바꾸는 길은 하나다**
 * (docs/ARCHITECTURE.md §18.7.1).
 */
import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { num, pct } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { BarChart } from '@/shared/ui/chart/BarChart'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'

import {
  CHALLENGE_KIND_LABEL,
  CHALLENGE_KIND_TONE,
  CHALLENGE_STATUS_LABEL,
  CHALLENGE_STATUS_TONE,
  periodLabel,
  REPEAT_LABEL,
  rewardLabel,
} from '@/domain/challenge'
import { SLOT_LABEL } from '@/domain/item'
import { SCREENS } from '@/domain/screens'

import { useChallenge, useStopChallenge, type ChallengeDetail } from '@/api/challenges'

export default function ChallengeDetailPage() {
  const { chalId = '' } = useParams()
  const { data, isPending, error } = useChallenge(chalId)

  if (isPending) return <SkeletonRows rows={8} />
  if (error || !data) return <ErrorBanner message={error?.message ?? '챌린지를 불러오지 못했습니다.'} />

  return <Detail detail={data} chalId={chalId} />
}

function Detail({ detail, chalId }: { detail: ChallengeDetail; chalId: string }) {
  const navigate = useNavigate()
  const stop = useStopChallenge()

  const { challenge: c, trend, stats } = detail
  const ended = c.status === 'ENDED'
  // 막대 하나가 하루다. 라벨은 D-13 … D-0 으로 상대 표기 — 목이라 실제 날짜가 없다.
  const groups = trend.map((v, i) => ({ label: `D-${trend.length - 1 - i}`, a: v, b: 0 }))

  return (
    <>
      <PageHeader
        title={c.title}
        sub={c.desc}
        actions={
          <>
            <Button onClick={() => stop.mutate(chalId)} disabled={ended || stop.isPending}>
              {ended ? '중단됨' : stop.isPending ? '중단하는 중…' : '중단'}
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(SCREENS.chaledit.path.replace(':chalId', chalId))}
            >
              수정
            </Button>
          </>
        }
      />

      {stop.error && <ErrorBanner message={stop.error.message} />}

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mb: '14px', flexWrap: 'wrap' })}>
        <Badge tone={CHALLENGE_KIND_TONE[c.kind]}>{CHALLENGE_KIND_LABEL[c.kind]}</Badge>
        <Badge tone={CHALLENGE_STATUS_TONE[c.status]}>{CHALLENGE_STATUS_LABEL[c.status]}</Badge>
        <span className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}>{c.code}</span>
      </div>

      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', mb: '18px' })}>
        {stats.map((s) => (
          <StatTile key={s.k} label={s.k} value={s.v} />
        ))}
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '3 1 460px', minWidth: '0', p: '17px 20px' })}>
          <CardTitle title="일자별 달성 추이" sub="최근 14일" />
          <div className={css({ mt: '12px' })}>
            <BarChart groups={groups} max={100} legend={['달성률 (%)', '']} />
          </div>
        </Card>

        <div className={css({ flex: '1 1 300px', minWidth: '260px', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Card className={css({ p: '15px' })}>
            <CardTitle title="설정" />
            <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
              <Row k="조건" v={c.cond} />
              <Row k="목표" v={num(c.goal)} />
              <Row k="보상" v={rewardLabel(c)} />
              <Row k="기간" v={periodLabel(c)} />
              <Row k="반복" v={REPEAT_LABEL[c.kind]} />
              <Row k="대상" v={c.target} />
              <Row k="달성률" v={pct(c.rate)} />
            </dl>
          </Card>

          <Card className={css({ p: '15px' })}>
            <CardTitle title="보상 아이템" />
            {c.rewardItem ? (
              <div className={css({ display: 'flex', alignItems: 'center', gap: '11px', mt: '12px' })}>
                <AssetThumb
                  assetId={c.rewardItem.assetId}
                  src={c.rewardItem.assetSrc}
                  size={48}
                  alt={c.rewardItem.name}
                />
                <div className={css({ minWidth: '0' })}>
                  <div className={css({ textStyle: 'body', fontWeight: '700', color: 'ink' })}>
                    {c.rewardItem.name}
                  </div>
                  <div className={css({ mt: '2px', textStyle: 'caption', color: 'faint' })}>
                    {SLOT_LABEL[c.rewardItem.slot]}
                  </div>
                </div>
              </div>
            ) : (
              <p className={css({ m: '12px 0 0', textStyle: 'caption', color: 'faint' })}>
                젬 보상만 지급됩니다.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

/**
 * 지표 한 칸.
 *
 * `StatCard` 를 쓰지 않는다 — 그건 증감(`delta`·`direction`)까지 요구하는 KPI 카드인데,
 * 여기 넷은 견줄 앞 기간이 없다. 없는 증감을 지어내느니 숫자만 보인다.
 */

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '64px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textAlign: 'right',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
        })}
      >
        {v}
      </dd>
    </div>
  )
}
