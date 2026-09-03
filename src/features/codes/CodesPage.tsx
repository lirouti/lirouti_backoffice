/**
 * 공통 코드 목록.
 *
 * **여기서 바꾸면 그 값을 쓰는 화면에 바로 반영된다** — 「사용처」 열이 그래서 있다
 * (docs/ARCHITECTURE.md §29.2).
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
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import { CODE_CATEGORIES, CODE_TONE_BADGE, type CodeFilter, type CodeGroup } from '@/domain/code'
import { SCREENS } from '@/domain/screens'

import { useCodeGroups } from '@/api/codes'

/** 목록에 미리 보여 주는 값 개수. 넘으면 「+N」 */
const PREVIEW = 4

/** 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2) */
const filterOf = (p: URLSearchParams): CodeFilter => ({
  category: p.get('cat') ?? undefined,
  q: p.get('q') ?? undefined,
})

const COLUMNS: Column<CodeGroup>[] = [
  {
    key: 'name',
    label: '그룹',
    minWidth: '200px',
    render: (g) => (
      <span>
        <span className={css({ display: 'block', fontWeight: '600', color: 'ink' })}>{g.name}</span>
        <span
          className={css({
            display: 'block',
            textStyle: 'micro',
            color: 'faint',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {g.note}
        </span>
      </span>
    ),
  },
  {
    key: 'codeKey',
    label: '코드 키',
    width: '160px',
    render: (g) => <span className={css({ fontFamily: 'mono', textStyle: 'caption' })}>{g.codeKey}</span>,
  },
  {
    key: 'values',
    label: '값',
    minWidth: '240px',
    render: (g) => (
      <span className={css({ display: 'flex', flexWrap: 'wrap', gap: '4px' })}>
        {g.values.slice(0, PREVIEW).map((v) => (
          <Badge key={v.code} tone={CODE_TONE_BADGE[v.tone]} size="sm">
            {v.label}
          </Badge>
        ))}
        {g.values.length > PREVIEW && (
          <Badge size="sm">+{num(g.values.length - PREVIEW)}</Badge>
        )}
      </span>
    ),
  },
  { key: 'n', label: '개수', width: '68px', align: 'right', render: (g) => num(g.values.length) },
  {
    key: 'usages',
    label: '사용처',
    width: '96px',
    // 0 이면 아직 아무 화면도 안 쓴다 — 「0개 화면」 보다 그렇게 읽히는 편이 낫다.
    render: (g) => (g.usages.length === 0 ? '없음' : `${num(g.usages.length)}개 화면`),
  },
  { key: 'updatedAt', label: '수정', width: '110px', nowrap: true, render: (g) => g.updatedAt.slice(0, 10) },
]

export default function CodesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useCodeGroups(filterOf(params))

  const f = filterOf(params)

  const patch = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v === '' || v === '전체') p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="공통 코드"
        sub="드롭다운과 배지에 쓰이는 값을 한곳에서 관리합니다. 여기서 바꾸면 해당 화면에 바로 반영됩니다."
        actions={
          <Button variant="primary" onClick={() => navigate(SCREENS.codenew.path)}>
            코드 그룹 추가
          </Button>
        }
      />

      {data ? (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            mb: '16px',
          })}
        >
          <StatTile label="코드 그룹" value={num(data.summary.groups)} />
          <StatTile label="전체 코드 값" value={num(data.summary.values)} />
          <StatTile label="분류" value={num(data.summary.categories)} />
          {/* 감춘 값은 새로 못 고르지만 기존 데이터에는 남아 있다 (§29.1) */}
          <StatTile label="감춘 값" value={num(data.summary.hidden)} />
        </div>
      ) : isPending ? (
        <SkeletonStats count={4} min={150} silent className={css({ mb: '16px' })} />
      ) : null}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', mb: '14px' })}>
        <Input
          value={f.q ?? ''}
          onChange={(v) => patch('q', v)}
          placeholder="그룹명 · 코드 키 · 값"
          aria-label="코드 검색"
          className={css({ flex: '1 1 200px', maxWidth: '280px' })}
        />
        <Segmented
          value={f.category ?? '전체'}
          onChange={(v) => patch('cat', v)}
          options={['전체', ...CODE_CATEGORIES]}
          aria-label="분류"
        />
      </div>

      {isPending ? (
        <SkeletonRows rows={8} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table
          columns={COLUMNS}
          rows={data?.groups ?? []}
          minWidth={1020}
          rowKey={(g) => String(g.key)}
          onRowClick={(g) => navigate(SCREENS.codedet.path.replace(':codeId', String(g.key)))}
        />
      )}
    </>
  )
}
