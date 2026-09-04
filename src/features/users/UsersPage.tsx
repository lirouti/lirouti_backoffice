/**
 * 회원 목록.
 *
 * **쪽을 자르지 않는다** — 12명뿐이고 원본에도 페이지 바가 없다. 대신 검색·소셜·상태와
 * 「탈퇴 포함」 이 **모두 주소에 실린다** (docs/ARCHITECTURE.md §18.1).
 */
import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { date, num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Checkbox } from '@/shared/ui/Checkbox'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import { SCREENS } from '@/domain/screens'
import {
  SOCIAL_LABEL,
  SOCIAL_TONE,
  USER_STATUS_LABEL,
  USER_STATUS_TONE,
  type Social,
  type User,
  type UserFilter,
  type UserStatus,
} from '@/domain/user'

import { useUsers } from '@/api/users'

const SOCIALS = [
  { value: '전체', label: '전체' },
  { value: 'KAKAO', label: SOCIAL_LABEL.KAKAO },
  { value: 'GOOGLE', label: SOCIAL_LABEL.GOOGLE },
]

/** ⚠️ 「탈퇴」 는 탭에 없다 — 「탈퇴 포함」 스위치가 그 역할을 한다. 둘을 다 두면 서로 싸운다 */
const STATES = [
  { value: '전체', label: '전체' },
  { value: 'ACTIVE', label: USER_STATUS_LABEL.ACTIVE },
  { value: 'BANNED', label: USER_STATUS_LABEL.BANNED },
  { value: 'DORMANT', label: USER_STATUS_LABEL.DORMANT },
]

const isSocial = (v: string | null): v is Social => v === 'KAKAO' || v === 'GOOGLE'
const isStatus = (v: string | null): v is UserStatus =>
  v === 'ACTIVE' || v === 'BANNED' || v === 'DORMANT' || v === 'LEFT'

/**
 * 주소에서 필터를 읽는다. 모르는 값은 조용히 버린다.
 *
 * 모듈 함수로 둔 이유는 **훅이 이 값을 인자로 받기** 때문이다 (§14.2).
 */
const filterOf = (p: URLSearchParams): UserFilter => {
  const social = p.get('social')
  const status = p.get('status')
  return {
    q: p.get('q') ?? undefined,
    social: isSocial(social) ? social : undefined,
    status: isStatus(status) ? status : undefined,
    withLeft: p.get('left') === '1',
  }
}

export default function UsersPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useUsers(filterOf(params))

  const f = filterOf(params)
  const summary = data?.summary

  const patch = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v == null || v === '' || v === '전체') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="회원"
        sub="이메일과 닉네임으로 찾습니다. 탈퇴 회원은 기본으로 숨겨집니다."
        actions={
          <>
            {/*
              내려받을 것은 지금 화면이 아니라 필터에 걸린 전체여야 하는데, 서버가
              쪽을 자르기 시작하면 전용 엔드포인트 없이 만들 수 없다 (§18.8).
              TODO(내보내기 엔드포인트가 생기면): CSV 내려받기
            */}
            <Button disabled>CSV 내려받기 · 준비 중</Button>
          </>
        }
      />

      {summary ? (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            mb: '16px',
          })}
        >
          {/* ⚠️ 지표는 **거르기 전 전체**다. 필터마다 「전체 회원」 이 바뀌면 그건 전체가 아니다. */}
          <StatTile label="전체 회원" value={num(summary.total)} />
          <StatTile label="오늘 가입" value={num(summary.joinedToday)} />
          <StatTile label="결제 회원" value={num(summary.paying)} />
          <StatTile label="제재 중" value={num(summary.banned)} />
        </div>
      ) : isPending ? (
        <SkeletonStats count={4} min={150} silent className={css({ mb: '16px' })} />
      ) : null}

      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          mb: '14px',
        })}
      >
        <Input
          value={f.q ?? ''}
          onChange={(v) => patch('q', v)}
          placeholder="닉네임 · 이메일"
          aria-label="회원 검색"
          className={css({ flex: '1 1 220px', maxWidth: '280px' })}
        />
        <Segmented
          value={f.social ?? '전체'}
          onChange={(v) => patch('social', v)}
          options={SOCIALS}
          aria-label="소셜"
        />
        <Segmented
          value={f.status ?? '전체'}
          onChange={(v) => patch('status', v)}
          options={STATES}
          aria-label="상태"
        />
        <Checkbox
          checked={!!f.withLeft}
          onChange={(on) => patch('left', on ? '1' : null)}
          label="탈퇴 회원 포함"
        />
      </div>

      {isPending ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table
          columns={COLUMNS}
          rows={data?.users ?? []}
          minWidth={1000}
          onRowClick={(u) => navigate(SCREENS.user.path.replace(':userId', String(u.key)))}
        />
      )}
    </>
  )
}

const COLUMNS: Column<User>[] = [
  {
    key: 'nick',
    label: '회원',
    minWidth: '200px',
    render: (u) => (
      <span className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
        <Avatar nick={u.nick} />
        <span className={css({ minWidth: '0' })}>
          <span className={css({ display: 'block', fontWeight: '700', color: 'ink' })}>
            {u.nick}
          </span>
          <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>
            {u.email}
          </span>
        </span>
      </span>
    ),
  },
  {
    key: 'social',
    label: '소셜',
    width: '84px',
    render: (u) => <Badge tone={SOCIAL_TONE[u.social]}>{SOCIAL_LABEL[u.social]}</Badge>,
  },
  {
    key: 'wallet',
    label: '보유 재화',
    width: '150px',
    align: 'right',
    // ⚠️ 둘을 합쳐 보이지 않는다 — 유상(파란)만 환불 대상이라 합계는 오해를 만든다.
    render: (u) => (
      <span className={css({ display: 'block', textAlign: 'right' })}>
        <span className={css({ color: 'priD', fontWeight: '700' })}>{num(u.wallet.gem)}</span>
        <span className={css({ color: 'faint' })}> · </span>
        <span className={css({ color: 'aFg', fontWeight: '700' })}>{num(u.wallet.topaz)}</span>
      </span>
    ),
  },
  {
    key: 'paid',
    label: '누적 결제',
    width: '110px',
    align: 'right',
    render: (u) => (u.paid > 0 ? `${num(u.paid)}원` : '—'),
  },
  { key: 'certs', label: '인증', width: '80px', align: 'right', render: (u) => num(u.certs) },
  {
    key: 'joinedAt',
    label: '가입',
    width: '110px',
    nowrap: true,
    render: (u) => date(u.joinedAt),
  },
  {
    key: 'status',
    label: '상태',
    width: '84px',
    render: (u) => (
      <Badge tone={USER_STATUS_TONE[u.status]}>{USER_STATUS_LABEL[u.status]}</Badge>
    ),
  },
]

/** 닉네임 첫 글자. 사진이 없는 서비스라 색은 하나로 둔다 */
function Avatar({ nick }: { nick: string }) {
  return (
    <span
      aria-hidden="true"
      className={css({
        width: '30px',
        height: '30px',
        flex: 'none',
        borderRadius: '50%',
        bg: 'avB',
        color: 'avF',
        textStyle: 'micro',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {nick.charAt(0)}
    </span>
  )
}
