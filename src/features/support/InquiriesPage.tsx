/**
 * 1:1 문의 목록.
 *
 * **대기 시간은 접수 시각에서 계산한다** — 저장된 문자열이 아니다
 * (docs/ARCHITECTURE.md §28.1).
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

import {
  durationLabel,
  INQUIRY_CATEGORIES,
  INQUIRY_CATEGORY_TONE,
  INQUIRY_STATUS_TONE,
  INQUIRY_TABS,
  isOverdue,
  isOpen,
  SLA_HOURS,
  waitMinutes,
  type Inquiry,
} from '@/domain/inquiry'
import { SCREENS } from '@/domain/screens'

import { useInquiries } from '@/api/inquiries'

import { inquiriesQueryOf, inquiryScopeLabel, parseInquiryQuery } from './query'

export default function InquiriesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useInquiries(inquiriesQueryOf(params))

  const parsed = parseInquiryQuery(params)
  const f = parsed.filter

  const patch = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v === '' || v === '전체') p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }

  const columns: Column<Inquiry>[] = [
    {
      key: 'code',
      label: '문의번호',
      width: '92px',
      render: (i) => <span className={css({ fontFamily: 'mono', textStyle: 'caption' })}>{i.code}</span>,
    },
    {
      key: 'category',
      label: '분류',
      width: '84px',
      render: (i) => <Badge tone={INQUIRY_CATEGORY_TONE[i.category]}>{i.category}</Badge>,
    },
    {
      key: 'title',
      label: '제목',
      truncate: true,
      render: (i) => (
        <span className={css({ display: 'flex', alignItems: 'center', gap: '7px', minWidth: '0' })}>
          <span className={css({ fontWeight: '600', color: 'ink', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
            {i.title}
          </span>
          {/* 재문의는 답변이 문제를 못 풀었다는 신호다 — 목록에서 바로 보여야 한다 */}
          {i.reopened && <Badge tone="danger" size="sm">재문의</Badge>}
        </span>
      ),
    },
    { key: 'at', label: '접수', width: '140px', nowrap: true },
    {
      key: 'wait',
      label: '대기',
      width: '110px',
      align: 'right',
      render: (i) => {
        const waited = data ? waitMinutes(i, data.now) : null
        if (waited === null) return '—'
        const late = data ? isOverdue(i, data.now) : false
        return (
          <span className={css({ color: late ? 'rFg' : 'sub', fontWeight: late ? '700' : '400' })}>
            {durationLabel(waited)}
            {/* 끝난 건의 시간은 「걸린 시간」 이라 뜻이 다르다 */}
            {!isOpen(i.status) && <span className={css({ color: 'faint' })}> 만에</span>}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: '상태',
      width: '92px',
      render: (i) => <Badge tone={INQUIRY_STATUS_TONE[i.status]}>{i.status}</Badge>,
    },
    { key: 'assignee', label: '담당', width: '90px', render: (i) => i.assignee || '미배정' },
  ]

  return (
    <>
      <PageHeader
        title="1:1 문의"
        sub="유저가 앱에서 보낸 문의입니다. 답변하면 앱 알림으로 전달됩니다."
        actions={
          <>
            {/* TODO(내보내기 엔드포인트가 생기면): 필터에 걸린 전체를 뽑는다 (§18.8) */}
            <Button disabled>CSV 내보내기 · 준비 중</Button>
          </>
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
          <StatTile label="답변 대기" value={`${num(data.summary.open)}건`} alert={data.summary.open > 0} />
          <StatTile
            label={`${SLA_HOURS}시간 초과`}
            value={`${num(data.summary.overdue)}건`}
            alert={data.summary.overdue > 0}
          />
          <StatTile label="오늘 접수" value={`${num(data.summary.today)}건`} />
          {/* 답한 건이 없으면 평균이 없다 — 0분으로 그리면 즉답한 것처럼 보인다 */}
          <StatTile
            label="평균 응답"
            value={data.summary.avgResponse === null ? '—' : durationLabel(data.summary.avgResponse)}
          />
          <StatTile label="재문의율" value={`${data.summary.reopenRate}%`} />
        </div>
      ) : isPending ? (
        <SkeletonStats count={5} min={150} silent className={css({ mb: '16px' })} />
      ) : null}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', mb: '14px' })}>
        <Input
          value={f.q ?? ''}
          onChange={(v) => patch('q', v)}
          placeholder="제목 또는 담당자"
          aria-label="문의 검색"
          className={css({ flex: '1 1 200px', maxWidth: '260px' })}
        />
        <Segmented
          value={f.tab ?? '전체'}
          onChange={(v) => patch('tab', v)}
          options={[...INQUIRY_TABS]}
          aria-label="처리 상태"
        />
        <Segmented
          value={f.category ?? '전체'}
          onChange={(v) => patch('cat', v)}
          options={['전체', ...INQUIRY_CATEGORIES]}
          aria-label="분류"
        />
      </div>

      {parsed.userUid && (
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            mb: '14px',
            px: '13px',
            py: '9px',
            bg: 'soft',
            border: '1px solid token(colors.liveBd)',
            borderRadius: 'lg',
          })}
        >
          <span className={css({ flex: '1', minWidth: '0', textStyle: 'label', color: 'ink' })}>
            {inquiryScopeLabel(parsed.userUid, data?.filteredUser)}
          </span>
          <Button size="sm" onClick={() => patch('who', '')}>
            전체 문의 보기
          </Button>
        </div>
      )}

      {isPending ? (
        <SkeletonRows rows={8} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table
          columns={columns}
          rows={data?.inquiries ?? []}
          minWidth={980}
          rowKey={(i) => String(i.key)}
          onRowClick={(i) => navigate(SCREENS.qnadet.path.replace(':qnaId', String(i.key)))}
        />
      )}
    </>
  )
}
