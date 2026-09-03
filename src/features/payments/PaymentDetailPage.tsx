/**
 * 결제 상세 — 읽기 + 환불.
 *
 * **환불액이 결제 금액과 다르다.** 미사용 유상 재화만 청약철회 대상이라, 그 계산을
 * 화면에서 드러낸다 (docs/ARCHITECTURE.md §22.2).
 */
import { useState } from 'react'

import { useParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonHeader, SkeletonRows } from '@/shared/ui/Skeleton'
import { Textarea } from '@/shared/ui/Textarea'

import {
  canRefund,
  PAY_STATUS_LABEL,
  PAY_STATUS_TONE,
  PG_LABEL,
  refundableAmount,
  validateRefund,
  type Payment,
} from '@/domain/payment'

import { usePayment, useRefund } from '@/api/payments'

const won = (n: number): string => `${num(n)}원`

export default function PaymentDetailPage() {
  const { payId = '' } = useParams()
  const { data, isPending, error } = usePayment(payId)

  if (isPending) {
    // ⚠️ **제목을 그릴 수 없다** — 상세 화면의 제목은 불러온 값이다(「소이」 · 「첫 알」).
    //    그래서 헤더도 자리만 잡는다. 아는 것과 모르는 것을 섞지 않는다 (docs/ARCHITECTURE.md §43.2).

    return (
      <>
        <SkeletonHeader />

        <SkeletonRows rows={6} silent />
      </>
    )
  }
  if (error || !data)
    return <ErrorBanner message={error?.message ?? '결제를 불러오지 못했습니다.'} />

  return <Detail payment={data} payId={payId} />
}

function Detail({ payment: p, payId }: { payment: Payment; payId: string }) {
  const refund = useRefund()
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  // ⚠️ **누르기 전에는 빨갛게 하지 않는다.** 창을 열자마자 "사유를 입력하세요" 가 뜨면
  //    아직 아무것도 안 했는데 혼난 기분이 든다(폼 화면과 같은 규칙, §18.7).
  //    대신 **누른 뒤에는 반드시 보여야 한다** — 안 그러면 눌러도 아무 일이 없다.
  const [tried, setTried] = useState(false)

  const refundable = refundableAmount(p)
  const errors = validateRefund(reason)
  const stuck = p.status === 'READY'

  return (
    <>
      <PageHeader
        title={won(p.amount)}
        sub={`${p.product} · ${p.at}`}
        actions={
          <>
            {/* TODO(결제사 API 가 붙으면): 원문 응답을 그대로 보여 준다 */}
            <Button disabled>결제사 원문 · 준비 중</Button>
            <Button
              variant="danger"
              onClick={() => {
                setTried(false)
                setAsking(true)
              }}
              disabled={!canRefund(p) || refund.isPending}
            >
              {!canRefund(p) ? `환불 · ${PAY_STATUS_LABEL[p.status]} 건` : '환불'}
            </Button>
          </>
        }
      />

      {refund.error && <ErrorBanner message={refund.error.message} />}

      {stuck && (
        <div
          className={css({
            p: '12px 15px',
            mb: '16px',
            borderRadius: 'lg',
            bg: 'aBg',
            border: '1px solid token(colors.warnBd)',
            textStyle: 'body',
            color: 'warnFg',
          })}
        >
          <strong>준비 상태로 멈춘 건입니다.</strong> 결제사에서 돈이 나갔는지 먼저 확인하세요 —
          나갔다면 재화를 지급하고, 안 나갔다면 실패로 정리해야 합니다.
        </div>
      )}

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px', flexWrap: 'wrap' })}>
        <Badge tone={PAY_STATUS_TONE[p.status]}>{PAY_STATUS_LABEL[p.status]}</Badge>
        <span className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}>{p.orderNo}</span>
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '1 1 300px', minWidth: '260px', p: '15px' })}>
          <CardTitle title="결제" />
          <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
            <Row k="주문번호" v={p.orderNo} mono />
            <Row k="회원" v={`${p.who} · ${p.email}`} />
            <Row k="결제사" v={PG_LABEL[p.pg]} />
            <Row k="금액" v={won(p.amount)} />
            <Row k="일시" v={p.at} />
          </dl>
        </Card>

        <Card className={css({ flex: '1 1 300px', minWidth: '260px', p: '15px' })}>
          <CardTitle title="지급" sub="유상과 보너스를 나눠 봅니다." />
          <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
            <Row k="상품" v={p.product} />
            <Row k="유상 지급" v={`${num(p.give)}개`} />
            {/* ⚠️ 보너스는 무상이라 **환불 대상이 아니다.** 나란히 두되 성질을 밝힌다. */}
            <Row k="보너스" v={p.bonus > 0 ? `${num(p.bonus)}개 (무상)` : '없음'} />
            <Row k="지급 여부" v={p.status === 'DONE' ? '완료' : '확인 필요'} />
            <Row k="미사용 유상" v={`${num(p.unusedGem)}개`} />
          </dl>
        </Card>

        <Card className={css({ flex: '1 1 300px', minWidth: '260px', p: '15px' })}>
          <CardTitle
            title="환불 가능액"
            sub="미사용 유상 재화만 청약철회 대상입니다."
          />
          <div className={css({ mt: '12px' })}>
            <div className={css({ textStyle: 'h2', fontWeight: '700', color: refundable > 0 ? 'ink' : 'faint' })}>
              {won(refundable)}
            </div>
            {/*
              계산을 드러낸다. 「1,100원 중 660원」 만 보이면 왜 그런지 알 수 없고,
              운영자가 결제 금액을 그대로 돌려주려 한다.
            */}
            <p className={css({ m: '8px 0 0', textStyle: 'caption', color: 'sub' })}>
              {won(p.amount)} × {num(Math.min(p.unusedGem, p.give))} / {num(p.give)}개
              {p.bonus > 0 && ' · 보너스는 무상이라 제외'}
            </p>
            {refundable < p.amount && (
              <p className={css({ m: '6px 0 0', textStyle: 'micro', color: 'faint' })}>
                이미 쓴 재화는 상품을 받은 것이라 돌려줄 수 없습니다.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Dialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setTried(true)
          if (errors.reason) return
          refund.mutate({ payId, reason }, { onSuccess: () => setAsking(false) })
        }}
        title="결제사 취소 · 재화 회수"
        body={`${won(refundable)} 을 돌려주고 미사용 유상 재화 ${num(Math.min(p.unusedGem, p.give))}개를 회수합니다. 되돌릴 수 없습니다.`}
        tone="danger"
        confirmLabel="환불"
      >
        <Textarea
          value={reason}
          onChange={setReason}
          label="환불 사유"
          placeholder="예: 중복 결제"
          hint="감사 로그에 남습니다"
          error={reason || tried ? errors.reason : undefined}
          required
          rows={2}
        />
      </Dialog>
    </>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '78px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textAlign: 'right',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        })}
        style={mono ? { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } : undefined}
      >
        {v}
      </dd>
    </div>
  )
}
