/**
 * 회원 상세 — 읽기 + 제재.
 *
 * 재화 지급·환불·문의는 서버가 있어야 하는 일이라 잠가 뒀다 (docs/ARCHITECTURE.md §18.8).
 */
import { useParams } from 'react-router'

import { css } from 'styled-system/css'

import { date, num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonHeader, SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  canBan,
  SOCIAL_LABEL,
  SOCIAL_TONE,
  USER_STATUS_LABEL,
  USER_STATUS_TONE,
  walletTotal,
  type CoinLedgerRow,
  type OrderRow,
} from '@/domain/user'

import { useBanUser, useUser, type UserDetail } from '@/api/users'

export default function UserDetailPage() {
  const { userId = '' } = useParams()
  const { data, isPending, error } = useUser(userId)

  if (isPending) {
    // ⚠️ **제목을 그릴 수 없다** — 상세 화면의 제목은 불러온 값이다(「소이」 · 「첫 알」).
    //    그래서 헤더도 자리만 잡는다. 아는 것과 모르는 것을 섞지 않는다 (docs/ARCHITECTURE.md §43.2).

    return (
      <>
        <SkeletonHeader />
        <SkeletonStats count={4} min={150} silent className={css({ mb: '18px' })} />

        <SkeletonRows rows={5} silent />
      </>
    )
  }
  if (error || !data)
    return <ErrorBanner message={error?.message ?? '회원을 불러오지 못했습니다.'} />

  return <Detail detail={data} userId={userId} />
}

function Detail({ detail, userId }: { detail: UserDetail; userId: string }) {
  const ban = useBanUser()

  const { user, ledger, orders } = detail
  const banned = user.status === 'BANNED'

  return (
    <>
      <PageHeader
        title={user.nick}
        sub={user.email}
        actions={
          <>
            {/* TODO(재화 지급 API 가 생기면): 지급 · 회수 화면과 같은 경로를 쓴다 */}
            <Button disabled>재화 지급 · 준비 중</Button>
            {/* TODO(문의 API 가 생기면): 1:1 문의로 연결한다 */}
            <Button disabled>문의 남기기 · 준비 중</Button>
            <Button
              onClick={() => ban.mutate({ userId, ban: !banned })}
              disabled={!canBan(user) || ban.isPending}
            >
              {!canBan(user)
                ? '제재 · 탈퇴 계정'
                : ban.isPending
                  ? '처리 중…'
                  : banned
                    ? '제재 해제'
                    : '제재'}
            </Button>
          </>
        }
      />

      {ban.error && <ErrorBanner message={ban.error.message} />}

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px', flexWrap: 'wrap' })}>
        <Badge tone={SOCIAL_TONE[user.social]}>{SOCIAL_LABEL[user.social]}</Badge>
        <Badge tone={USER_STATUS_TONE[user.status]}>{USER_STATUS_LABEL[user.status]}</Badge>
        <span className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}>{user.uid}</span>
      </div>

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          mb: '18px',
        })}
      >
        <StatTile label="누적 인증" value={num(user.certs)} />
        <StatTile label="누적 결제" value={`${num(user.paid)}원`} />
        <StatTile label="보유 재화" value={num(walletTotal(user.wallet))} />
        <StatTile label="마지막 접속" value={date(user.lastSeenAt)} />
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <div className={css({ flex: '1 1 300px', minWidth: '260px', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Card className={css({ p: '15px' })}>
            <CardTitle title="계정" />
            <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
              <Row k="가입일" v={date(user.joinedAt)} />
              <Row k="마지막 접속" v={date(user.lastSeenAt)} />
              <Row k="로그인" v={SOCIAL_LABEL[user.social]} />
              <Row k="약관 동의" v="필수 · 마케팅" />
              {user.leftAt && <Row k="탈퇴" v={date(user.leftAt)} />}
            </dl>
          </Card>

          <Card className={css({ p: '15px' })}>
            <CardTitle title="지갑" sub="유상 · 무상을 나눠 봅니다." />
            {/*
              ⚠️ **합쳐 보이면 안 된다.** 환불 대상은 유상(파란보석)뿐이라,
              합계만 보고 환불액을 잡으면 무상까지 돌려주게 된다.
            */}
            <div className={css({ mt: '12px', display: 'flex', flexDirection: 'column', gap: '10px' })}>
              <Coin label="파란보석" hint="결제로 사는 유상 재화" value={user.wallet.gem} paid />
              <Coin label="노란보석" hint="챌린지·업적으로 얻는 무상 재화" value={user.wallet.topaz} />
            </div>
          </Card>
        </div>

        <div className={css({ flex: '3 1 460px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Section title="재화 이력" sub="유상·무상이 따로 쌓입니다.">
            <Table columns={LEDGER_COLUMNS} rows={ledger} minWidth={720} className={css({ border: '0' })} />
          </Section>

          <Section title="결제 내역">
            {orders.length > 0 ? (
              <Table columns={ORDER_COLUMNS} rows={orders} minWidth={680} className={css({ border: '0' })} />
            ) : (
              <Empty>결제 내역이 없습니다.</Empty>
            )}
          </Section>
        </div>
      </div>
    </>
  )
}

const LEDGER_COLUMNS: Column<CoinLedgerRow>[] = [
  { key: 'at', label: '일시', width: '150px', nowrap: true },
  { key: 'kind', label: '종류', width: '90px' },
  {
    key: 'coin',
    label: '재화',
    width: '96px',
    render: (r) => (
      <span className={css({ color: r.coin === '파란보석' ? 'priD' : 'aFg', fontWeight: '700' })}>{r.coin}</span>
    ),
  },
  {
    key: 'delta',
    label: '증감',
    width: '90px',
    align: 'right',
    // 부호가 색보다 먼저 읽혀야 한다 — 색맹에게도 남는 정보다.
    render: (r) => (
      <span className={css({ fontWeight: '700', color: r.delta > 0 ? 'gFg' : 'rFg' })}>
        {r.delta > 0 ? '+' : ''}
        {num(r.delta)}
      </span>
    ),
  },
  { key: 'balance', label: '잔액', width: '90px', align: 'right', render: (r) => num(r.balance) },
  { key: 'why', label: '사유', truncate: true },
]

const ORDER_COLUMNS: Column<OrderRow>[] = [
  { key: 'at', label: '일시', width: '150px', nowrap: true },
  { key: 'orderNo', label: '주문번호', width: '150px' },
  { key: 'product', label: '상품', truncate: true },
  { key: 'amount', label: '금액', width: '110px', align: 'right', render: (r) => `${num(r.amount)}원` },
  {
    key: 'status',
    label: '상태',
    width: '90px',
    render: (r) => (
      <Badge tone={r.status === '환불' ? 'danger' : 'success'}>{r.status}</Badge>
    ),
  },
]

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className={css({ p: '0', overflow: 'hidden' })}>
      <div className={css({ p: '17px 20px 0' })}>
        <CardTitle title={title} sub={sub} />
      </div>
      {children}
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className={css({ m: '0', p: '28px 20px', textAlign: 'center', textStyle: 'caption', color: 'faint' })}>
      {children}
    </p>
  )
}

/** @param paid 유상 재화인가. 색이 그것으로 갈린다 */
function Coin({ label, hint, value, paid }: { label: string; hint: string; value: number; paid?: boolean }) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        p: '10px 12px',
        borderRadius: 'md',
        bg: 'surf2',
        border: '1px solid token(colors.ln)',
      })}
    >
      <span className={css({ flex: '1', minWidth: '0' })}>
        <span className={css({ display: 'block', textStyle: 'label', fontWeight: '700', color: 'ink' })}>
          {label}
        </span>
        <span className={css({ display: 'block', mt: '1px', textStyle: 'micro', color: 'faint' })}>{hint}</span>
      </span>
      <span className={css({ textStyle: 'h3', fontWeight: '700', color: paid ? 'priD' : 'aFg' })}>
        {num(value)}
      </span>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '80px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd className={css({ m: '0', flex: '1', minWidth: '0', textAlign: 'right', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
        {v}
      </dd>
    </div>
  )
}

