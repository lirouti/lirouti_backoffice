/**
 * 관리자 계정 목록.
 *
 * ⚠️ **「대기 · 정지」 지표와 탭이 같은 함수를 쓴다.** 원본은 지표만 휴면을 세서
 *    「2」 인데 눌러 보면 1건이었다 (docs/ARCHITECTURE.md §31.2).
 */
import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonRows } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  ADMIN_ROLE_LABEL,
  ADMIN_ROLE_TONE,
  ADMIN_STATUS_TONE,
  ADMIN_TABS,
  SCOPE_LABEL,
  type AdminFilter,
  type AdminTab,
} from '@/domain/admin'
import { SCREENS } from '@/domain/screens'

import { useAdmins, type AdminEntry } from '@/api/admins'

const isTab = (v: string | null): v is AdminTab => ADMIN_TABS.some((t) => t === v)

/** 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2) */
const filterOf = (p: URLSearchParams): AdminFilter => {
  const tab = p.get('tab')
  return { q: p.get('q') ?? undefined, tab: isTab(tab) ? tab : '전체' }
}

export default function AdminsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useAdmins(filterOf(params))

  const f = filterOf(params)
  const open = (e: AdminEntry) =>
    navigate(SCREENS.admindet.path.replace(':adminId', String(e.admin.adminId)))

  const patch = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v == null || v === '' || v === '전체') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="관리자 계정"
        sub="최고 관리자만 계정을 발급하고 권한을 조정할 수 있습니다."
        actions={
          <Button variant="primary" onClick={() => navigate(SCREENS.adminnew.path)}>
            관리자 초대
          </Button>
        }
      />

      {data && (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            mb: '16px',
          })}
        >
          <StatTile label="전체 관리자" value={num(data.summary.total)} />
          <StatTile label="활성" value={num(data.summary.active)} />
          <StatTile label="생체 등록" value={`${data.summary.passkey} / ${data.summary.total}`} />
          <StatTile label="대기 · 정지" value={num(data.summary.pending)} alert={data.summary.pending > 0} />
        </div>
      )}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', mb: '14px' })}>
        <Segmented
          value={f.tab ?? '전체'}
          onChange={(v) => patch('tab', v)}
          options={ADMIN_TABS}
          aria-label="역할 · 상태"
        />
        <Input
          value={f.q ?? ''}
          onChange={(v) => patch('q', v)}
          placeholder="이름 · 아이디 검색"
          aria-label="관리자 검색"
          className={css({ flex: '1 1 200px', maxWidth: '280px' })}
        />
      </div>

      {isPending ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table columns={COLUMNS} rows={data?.admins ?? []} minWidth={1000} onRowClick={open} />
      )}
    </>
  )
}

const COLUMNS: Column<AdminEntry>[] = [
  {
    key: 'name',
    label: '관리자',
    width: '210px',
    render: ({ admin }) => (
      <span className={css({ display: 'block', minWidth: '0' })}>
        <span className={css({ display: 'block', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
          {admin.name}
        </span>
        <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>{admin.email}</span>
      </span>
    ),
  },
  {
    key: 'role',
    label: '역할',
    width: '108px',
    render: ({ admin }) => <Badge tone={ADMIN_ROLE_TONE[admin.role]}>{ADMIN_ROLE_LABEL[admin.role]}</Badge>,
  },
  {
    key: 'scopes',
    label: '담당 모듈',
    minWidth: '240px',
    // 최고 관리자에게 14개 이름을 늘어놓으면 「전체」 라는 사실이 오히려 안 보인다.
    render: ({ admin }) => (
      <span className={css({ display: 'flex', flexWrap: 'wrap', gap: '4px' })}>
        {(admin.role === 'top' ? ['전체 권한'] : admin.scopes.map((s) => SCOPE_LABEL[s])).map((label) => (
          <Badge key={label} tone={admin.role === 'top' ? 'purple' : 'neutral'} size="sm">
            {label}
          </Badge>
        ))}
      </span>
    ),
  },
  {
    key: 'passkey',
    label: '생체',
    width: '82px',
    render: ({ admin }) => (
      <Badge tone={admin.passkey ? 'teal' : 'neutral'}>{admin.passkey ? '등록' : '미등록'}</Badge>
    ),
  },
  {
    key: 'seenAt',
    label: '최근 접속',
    width: '104px',
    nowrap: true,
    // ⚠️ **행이 `Admin` 이 아니라 `AdminEntry` 라 `key` 만으로는 못 꺼낸다** — 값이
    //    없으면 `Table` 은 빈 칸을 그리고 아무도 알려 주지 않는다.
    render: ({ admin }) => admin.seenAt,
  },
  {
    key: 'status',
    label: '상태',
    width: '80px',
    render: ({ status }) => <Badge tone={ADMIN_STATUS_TONE[status]}>{status}</Badge>,
  },
]
