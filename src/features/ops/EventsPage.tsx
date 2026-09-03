/**
 * 이벤트 — 카드 목록.
 *
 * **진행 중인 것이 위**다. 끝난 이벤트가 섞여 있으면 무엇이 라이브인지 한눈에
 * 안 보인다 (docs/ARCHITECTURE.md §25.2).
 */
import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Skeleton'

import { EVENT_STATUS_LABEL, PERIOD_STATUS_TONE, periodLabel } from '@/domain/ops'

import { useEvents, type EventEntry } from '@/api/ops'

export default function EventsPage() {
  const { data, isPending, error } = useEvents()

  if (isPending) return <SkeletonRows rows={6} />
  if (error || !data) return <ErrorBanner message={error?.message ?? '이벤트를 불러오지 못했습니다.'} />

  return (
    <>
      <PageHeader
        title="이벤트"
        sub="기간제 이벤트입니다. 보상 아이템은 아이템 모듈에서 먼저 등록해야 합니다."
        actions={
          <>
            {/* TODO(이벤트 생성 API 가 생기면): 기간·보상 아이템·설명을 받는 폼 (§18.8) */}
            <Button disabled>이벤트 생성 · 준비 중</Button>
          </>
        }
      />

      <div className={css({ display: 'flex', flexDirection: 'column', gap: '12px' })}>
        {data.map((entry) => (
          <EventCard key={entry.event.key} entry={entry} />
        ))}
      </div>
    </>
  )
}

function EventCard({ entry: { event: e, status, reward } }: { entry: EventEntry }) {
  return (
    <Card className={css({ display: 'flex', p: '0', overflow: 'hidden' })}>
      {/*
        왼쪽 띠는 기획이 넣는 색이라 토큰이 아니다. 장식 전용이고 이 위에 글자를
        올리지 않는다 — 대비 검사가 못 보는 값이다 (§25.2).
      */}
      <div aria-hidden="true" className={css({ flex: 'none', width: '5px' })} style={{ background: e.accent }} />
      <div className={css({ flex: '1', minWidth: '0', p: '15px 18px' })}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
          <Badge tone={PERIOD_STATUS_TONE[status]}>{EVENT_STATUS_LABEL[status]}</Badge>
          <span className={css({ textStyle: 'caption', color: 'faint' })}>
            {periodLabel(e.startAt, e.endAt)}
          </span>
        </div>
        <h3 className={css({ m: '9px 0 0', textStyle: 'h3', fontWeight: '700', color: 'ink' })}>{e.title}</h3>
        <p className={css({ m: '3px 0 0', textStyle: 'body', color: 'sub' })}>{e.desc}</p>

        <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px', mt: '13px' })}>
          <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
            {/* 보상 아이템이 지워졌을 수 있다 — 빈 칸 대신 무엇이 없는지 말한다 */}
            {reward ? (
              <AssetThumb assetId={reward.assetId} alt={reward.name} size={40} />
            ) : null}
            <div>
              <div className={css({ textStyle: 'micro', color: 'faint' })}>보상 아이템</div>
              <div className={css({ textStyle: 'label', fontWeight: '600', color: reward ? 'ink' : 'rFg' })}>
                {reward ? reward.name : '삭제된 아이템'}
              </div>
            </div>
          </div>
          <div>
            <div className={css({ textStyle: 'micro', color: 'faint' })}>참여</div>
            <div className={css({ textStyle: 'label', fontWeight: '600', color: 'ink' })}>
              {/* 시작 전에는 0 이 아니라 셀 것이 없다 */}
              {status === 'SCHEDULED' ? '—' : `${num(e.joined)}명`}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
