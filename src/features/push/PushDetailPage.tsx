/**
 * 알림 상세 — 발송 결과.
 *
 * **도달 실패에 「푸시 거부」 를 넣지 않는다.** 대상 수가 이미 푸시를 켠 사람만
 * 세었으므로 두 번 빼는 것이 된다 (docs/ARCHITECTURE.md §26.3).
 */
import { useState } from 'react'

import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { BarChart } from '@/shared/ui/chart/BarChart'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonHeader, SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'

import {
  canCancel,
  openRate,
  PUSH_KIND_LABEL,
  PUSH_KIND_TONE,
  PUSH_STATUS_TONE,
} from '@/domain/push'
import { SCREENS } from '@/domain/screens'

import { useCancelSchedule, usePush, type PushDetail } from '@/api/push'

export default function PushDetailPage() {
  const { pushId = '' } = useParams()
  const { data, isPending, error } = usePush(pushId)

  if (isPending) {
    // ⚠️ **제목을 그릴 수 없다** — 상세 화면의 제목은 불러온 값이다(「소이」 · 「첫 알」).
    //    그래서 헤더도 자리만 잡는다. 아는 것과 모르는 것을 섞지 않는다 (docs/ARCHITECTURE.md §43.2).

    return (
      <>
        <SkeletonHeader />
        <SkeletonStats count={4} min={140} silent />

        <SkeletonRows rows={5} silent />
      </>
    )
  }
  if (error || !data)
    return <ErrorBanner message={error?.message ?? '알림을 불러오지 못했습니다.'} />

  return <Detail detail={data} pushId={pushId} />
}

function Detail({ detail: { push: p, hours, failures }, pushId }: { detail: PushDetail; pushId: string }) {
  const navigate = useNavigate()
  const cancel = useCancelSchedule()
  const [asking, setAsking] = useState(false)

  const rate = openRate(p)
  // 아직 안 보낸 건은 잴 것이 없다 — 0 으로 그리면 실패한 것처럼 보인다.
  const sent = p.status === '발송 완료'
  const groups = hours.map((v, i) => ({ label: `+${i + 1}h`, a: v }))

  return (
    <>
      <PageHeader
        title={p.title}
        sub={p.body}
        actions={
          <>
            <Button onClick={() => navigate(SCREENS.push.path)}>목록</Button>
            {canCancel(p.status) && (
              <Button variant="danger" onClick={() => setAsking(true)} disabled={cancel.isPending}>
                예약 취소
              </Button>
            )}
            {/* TODO(재발송 API 가 생기면): 같은 내용으로 새 알림을 연다 (§18.8) */}
            {sent && <Button disabled>같은 내용으로 재발송 · 준비 중</Button>}
          </>
        }
      />

      {cancel.error && <ErrorBanner message={cancel.error.message} />}

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px', flexWrap: 'wrap' })}>
        <Badge tone={PUSH_KIND_TONE[p.kind]}>{PUSH_KIND_LABEL[p.kind]}</Badge>
        <Badge tone={PUSH_STATUS_TONE[p.status]}>{p.status}</Badge>
        <span className={css({ textStyle: 'caption', color: 'faint' })}>{p.at}</span>
      </div>

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          mb: '18px',
        })}
      >
        <StatTile label="대상" value={num(p.targeted)} />
        <StatTile label="도달" value={sent ? num(p.delivered) : '—'} />
        <StatTile label="열림" value={sent ? num(p.opened) : '—'} />
        <StatTile label="열림률" value={rate === null ? '—' : `${rate}%`} />
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '2 1 420px', minWidth: '0', p: '17px 20px' })}>
          <CardTitle title="발송 후 시간대별 열림" sub="발송 시각 기준 12시간" />
          {sent ? (
            <div className={css({ mt: '10px' })}>
              <BarChart
                groups={groups}
                max={Math.max(1, ...hours)}
                legend={['열림']}
              />
            </div>
          ) : (
            <p className={css({ m: '20px 0', textAlign: 'center', textStyle: 'body', color: 'faint' })}>
              아직 보내지 않았습니다.
            </p>
          )}
        </Card>

        <div className={css({ flex: '1 1 280px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '18px' })}>
          <Card className={css({ p: '15px' })}>
            <CardTitle title="설정" />
            <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
              <Row k="대상" v={p.audience} />
              <Row k="이동" v={p.link} />
              <Row k="발송자" v={p.by} />
              <Row k="발송 방식" v={p.by === '시스템' ? '자동' : '수동'} />
            </dl>
          </Card>

          <Card className={css({ p: '15px' })}>
            <CardTitle title="도달 실패" sub="대상은 이미 푸시를 켠 회원만 셉니다." />
            {failures.length === 0 ? (
              <p className={css({ m: '12px 0 0', textStyle: 'body', color: 'faint' })}>
                {sent ? '모두 도달했습니다.' : '아직 보내지 않았습니다.'}
              </p>
            ) : (
              <>
                <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
                  {failures.map((f) => (
                    <Row key={f.why} k={f.why} v={`${num(f.count)}명`} />
                  ))}
                </dl>
                <p className={css({ m: '11px 0 0', textStyle: 'micro', color: 'faint' })}>
                  토큰 만료가 계속 늘면 앱 업데이트 후 재등록이 안 되고 있을 수 있습니다.
                </p>
              </>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={() => cancel.mutate(pushId, { onSuccess: () => setAsking(false) })}
        title="예약을 취소합니다"
        body={`${p.at} 에 나갈 예정이던 알림입니다. 취소하면 다시 예약해야 합니다.`}
        tone="danger"
        confirmLabel={cancel.isPending ? '취소 중…' : '예약 취소'}
      />
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '78px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd className={css({ m: '0', flex: '1', minWidth: '0', textAlign: 'right', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
        {v}
      </dd>
    </div>
  )
}
