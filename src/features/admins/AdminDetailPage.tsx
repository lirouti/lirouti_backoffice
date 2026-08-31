/**
 * 관리자 상세 — 담당 모듈 조정 · 정지 · 시점 미리보기.
 *
 * ⚠️ **담당 모듈은 저장 버튼 없이 즉시 반영된다.** 권한 회수를 저장까지 미루면, 창을
 *    닫아 버린 사이 그 사람은 계속 들어올 수 있다 (docs/ARCHITECTURE.md §31.8).
 */
import { useRef, useState } from 'react'

import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState, Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Table, type Column } from '@/shared/ui/Table'

import { firstScreen } from '@/domain/access'
import {
  ADMIN_LOG_TONE,
  ADMIN_ROLE_LABEL,
  ADMIN_ROLE_TONE,
  ADMIN_STATUS_TONE,
  DEVICE_LABEL,
  hasSignedIn,
  viewerOf,
  type AdminLog,
} from '@/domain/admin'
import { SCREENS, type ScopeId } from '@/domain/screens'

import { useAdmin, useSetScopes, useSuspendAdmin, type AdminDetail } from '@/api/admins'

import { useViewer, useViewerStore } from '@/stores/viewerStore'

import { ScopeGrid } from './ScopeGrid'

export default function AdminDetailPage() {
  const { adminId = '' } = useParams()
  const me = useViewer()
  const { data, isPending, error } = useAdmin(adminId, me.email)

  if (isPending) return <Skeleton rows={8} />
  if (error || !data) return <ErrorBanner message={error?.message ?? '관리자를 불러오지 못했습니다.'} />

  // ⚠️ **`key` 가 있어야 다른 관리자로 옮길 때 아래의 초안이 딸려가지 않는다.**
  return <Detail key={adminId} detail={data} />
}

function Detail({ detail }: { detail: AdminDetail }) {
  const me = useViewer()
  const navigate = useNavigate()
  const preview = useViewerStore((s) => s.preview)
  const setScopes = useSetScopes()
  const suspend = useSuspendAdmin()
  /**
   * 서버 응답이 오기 전의 화면 값. `null` 이면 서버 값을 그대로 쓴다.
   *
   * 즉시 반영이라 응답을 기다리면 체크가 250ms 뒤에 움직여 눌리지 않은 것처럼 보인다.
   * **실패하면 `null` 로 되돌려** 서버가 진실이 되게 한다.
   */
  const [draft, setDraft] = useState<ScopeId[] | null>(null)
  const [asking, setAsking] = useState(false)
  /**
   * 보낸 순서대로 서버에 닿게 하는 줄.
   *
   * ⚠️ **토글마다 전체 목록을 보내므로 응답이 뒤바뀌면 옛 값이 최신을 덮는다.** 빨리 두 번
   *    누르면 `[a,b]` 와 `[a]` 가 함께 날아가는데, 늦게 도착한 쪽이 서버에 남는다 —
   *    화면은 `[a]` 인데 서버는 `[a,b]` 다 (docs/ARCHITECTURE.md §31.8).
   *    **누를 때마다 잠그는 대신** 줄을 세운다 — 잠그면 즉시 반영이 아니게 된다.
   */
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  const { admin, status, menu, logs, actions, suspendBlocked } = detail
  const scopes = draft ?? admin.scopes
  const top = admin.role === 'top'
  const suspended = status === '정지'

  const toggle = (scope: ScopeId) => {
    const next = scopes.includes(scope) ? scopes.filter((s) => s !== scope) : [...scopes, scope]
    setDraft(next)
    queue.current = queue.current
      .then(() => setScopes.mutateAsync({ adminId: admin.adminId, scopes: next }))
      // 실패하면 서버 값이 진실이 되게 되돌린다. 삼키므로 뒤에 선 요청은 계속 간다.
      .catch(() => setDraft(null))
  }

  const enterPreview = () => {
    const viewer = viewerOf(admin)
    preview(admin.name, viewer.scopes)
    // 지금 화면(`/admins/…`)은 최고 관리자 전용이라 미리보기로 들어가면 볼 수 없다.
    // 셸의 리다이렉트에 맡기지 않고 **갈 곳을 정해서** 보낸다.
    navigate(SCREENS[firstScreen(viewer)].path)
  }

  return (
    <>
      <PageHeader
        title={admin.name}
        sub={admin.email}
        actions={
          <>
            {/* 최고 관리자를 미리보기 하면 지금과 똑같다 — 보여 줄 것이 없다. */}
            {!top && <Button onClick={enterPreview}>이 계정으로 보기</Button>}
            {/* TODO(비밀번호 재설정 흐름이 생기면): 초기화 메일 발송 */}
            <Button disabled>비밀번호 초기화 · 준비 중</Button>
            <Button
              variant={suspended ? 'secondary' : 'danger'}
              onClick={() => (suspended ? suspend.mutate({ adminId: admin.adminId, suspended: false, meEmail: me.email }) : setAsking(true))}
              disabled={(!suspended && suspendBlocked !== null) || suspend.isPending}
            >
              {suspended ? '정지 해제' : '계정 정지'}
            </Button>
          </>
        }
      />

      {suspendBlocked && !suspended && (
        <p className={css({ m: '-6px 0 14px', textStyle: 'label', color: 'sub' })}>{suspendBlocked}</p>
      )}
      {(setScopes.error || suspend.error) && (
        <ErrorBanner message={(setScopes.error ?? suspend.error)!.message} />
      )}

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px', flexWrap: 'wrap' })}>
        <Badge tone={ADMIN_ROLE_TONE[admin.role]}>{ADMIN_ROLE_LABEL[admin.role]}</Badge>
        <Badge tone={ADMIN_STATUS_TONE[status]}>{status}</Badge>
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <div className={css({ flex: '3 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Card className={css({ p: '18px 20px' })}>
            <CardTitle
              title="담당 모듈"
              sub={top ? '최고 관리자는 전체 접근' : '체크를 바꾸면 즉시 반영됩니다'}
            />

            <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', m: '13px 0' })}>
              <span className={css({ textStyle: 'micro', color: 'faint', mr: '2px' })}>사이드바에 표시</span>
              {menu.length > 0 ? (
                menu.map((label) => (
                  <Badge key={label} tone="brand">
                    {label}
                  </Badge>
                ))
              ) : (
                // 사이드바만 비는 것이지 로그인까지 막히지는 않는다 — 내 계정 보안은
                // 스코프와 무관하게 누구나 연다(`canAccess`).
                <Badge tone="danger">없음 · 내 계정 보안만 열립니다</Badge>
              )}
            </div>

            <ScopeGrid selected={scopes} onToggle={toggle} allOn={top} />
          </Card>

          <Card className={css({ p: '0', overflow: 'hidden' })}>
            <div className={css({ p: '18px 20px 0' })}>
              <CardTitle title="최근 활동" sub="전체 기록은 감사 로그에 남습니다." />
            </div>
            {logs.length > 0 ? (
              <Table columns={LOG_COLUMNS} rows={logs} minWidth={640} className={css({ border: '0' })} />
            ) : (
              <EmptyState
                title="아직 활동이 없습니다"
                body="초대만 받고 한 번도 로그인하지 않은 계정입니다."
              />
            )}
          </Card>
        </div>

        <div className={css({ flex: '1 1 300px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Card className={css({ p: '18px 20px' })}>
            <CardTitle title="계정" />
            <dl className={css({ m: '13px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
              <Row k="발급자" v={admin.invitedBy} />
              <Row k="발급일" v={admin.invitedAt} />
              {/* ⚠️ 대기 계정은 최초 로그인이 없다. 「—」 는 0시가 아니라 **아직 없음**이다. */}
              <Row k="최초 로그인" v={hasSignedIn(admin) ? admin.firstLoginAt : '— · 아직 로그인하지 않음'} />
              <Row k="최근 접속" v={admin.seenAt} />
              <Row k="2단계 인증" v={admin.mfa} />
              <Row k="담당 모듈" v={top ? '전체' : `${num(scopes.length)}개`} />
              <Row k="이번 달 활동" v={`${num(actions)}건`} />
            </dl>
          </Card>

          <Card className={css({ p: '18px 20px' })}>
            <CardTitle title="생체 인증" />
            <div className={css({ mt: '11px', textStyle: 'label', fontWeight: '600', color: admin.passkey ? 'ink' : 'sub' })}>
              {admin.passkey ? DEVICE_LABEL[admin.passkey] : '등록된 기기 없음'}
            </div>
            {/* ⚠️ 패스키는 **아직 로그인에 쓰이지 않는다.** 표시만 하고 있다는 것을 밝힌다. */}
            <p className={css({ m: '7px 0 0', textStyle: 'micro', color: 'faint' })}>
              패스키 로그인은 준비 중입니다. 지금은 비밀번호와 인증 앱으로만 들어옵니다.
            </p>
          </Card>
        </div>
      </div>

      <Dialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={() =>
          suspend.mutate(
            { adminId: admin.adminId, suspended: true, meEmail: me.email },
            { onSuccess: () => setAsking(false) },
          )
        }
        title="계정 정지"
        body={`${admin.name} 님이 즉시 로그인할 수 없게 됩니다. 담당 모듈과 기록은 그대로 남고, 정지는 언제든 풀 수 있습니다.`}
        tone="danger"
        confirmLabel="정지"
      />
    </>
  )
}

const LOG_COLUMNS: Column<AdminLog>[] = [
  { key: 'at', label: '일시', width: '140px', nowrap: true },
  {
    key: 'kind',
    label: '구분',
    width: '84px',
    render: (l) => <Badge tone={ADMIN_LOG_TONE[l.kind]}>{l.kind}</Badge>,
  },
  { key: 'what', label: '내용', truncate: true },
  { key: 'device', label: '기기', width: '150px', nowrap: true },
]

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'baseline', gap: '10px' })}>
      <dt className={css({ flex: 'none', w: '92px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd className={css({ m: '0', flex: '1', minWidth: '0', textAlign: 'right', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
        {v}
      </dd>
    </div>
  )
}
