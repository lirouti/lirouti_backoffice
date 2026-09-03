/**
 * 공지 — 읽기 전용 목록.
 *
 * **상태는 저장된 값이 아니라 기간에서 나온다** (docs/ARCHITECTURE.md §25.1).
 */
import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  NOTICE_STATUS_LABEL,
  PERIOD_STATUS_TONE,
  PIN_LIMIT,
  periodLabel,
} from '@/domain/ops'

import { useNotices, type NoticeEntry } from '@/api/ops'

export default function NoticesPage() {
  const { data, isPending, error } = useNotices()

  const columns: Column<NoticeEntry>[] = [
    { key: 'title', label: '제목', truncate: true, strong: true, render: (r) => r.notice.title },
    { key: 'category', label: '분류', width: '92px', render: (r) => r.notice.category },
    {
      key: 'period',
      label: '게시 기간',
      width: '150px',
      nowrap: true,
      render: (r) => periodLabel(r.notice.startAt, r.notice.endAt),
    },
    {
      key: 'views',
      label: '조회',
      width: '90px',
      align: 'right',
      // 게시 전에는 셀 것이 없다. 0 을 찍으면 「아무도 안 봤다」 로 읽힌다.
      render: (r) => (r.status === 'SCHEDULED' ? '—' : num(r.notice.views)),
    },
    {
      key: 'pinned',
      label: '고정',
      width: '70px',
      render: (r) => (r.notice.pinned ? <Badge size="sm">고정</Badge> : null),
    },
    {
      key: 'status',
      label: '상태',
      width: '90px',
      render: (r) => (
        <Badge tone={PERIOD_STATUS_TONE[r.status]}>{NOTICE_STATUS_LABEL[r.status]}</Badge>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="공지"
        sub={`앱 내 공지사항입니다. 상단 고정은 최대 ${PIN_LIMIT}건까지 권장합니다.`}
        actions={
          <>
            {/* TODO(공지 작성 API 가 생기면): 제목·본문·기간·고정을 받는 폼 (§18.8) */}
            <Button disabled>공지 작성 · 준비 중</Button>
          </>
        }
      />

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <>
          <SkeletonStats count={3} min={150} className={css({ mb: '16px' })} />
          <SkeletonRows rows={8} silent />
        </>
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? '공지를 불러오지 못했습니다.'} />
      ) : (
        <>
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              mb: '16px',
            })}
          >
            <StatTile label="게시중" value={num(data.summary.active)} />
            <StatTile label="예약" value={num(data.summary.scheduled)} />
            {/* 권장치를 넘었을 때만 붉다 — 2건은 정상이라 늘 빨가면 아무 뜻이 없다 */}
            <StatTile
              label={`상단 고정 (권장 ${PIN_LIMIT})`}
              value={num(data.summary.pinned)}
              alert={data.summary.overPinned}
            />
          </div>

          {data.summary.overPinned && (
            <ErrorBanner
              message={`상단 고정이 ${data.summary.pinned}건입니다. ${PIN_LIMIT}건을 넘으면 앱 공지 목록에서 실제 새 글이 밀립니다.`}
            />
          )}

          <Table
            columns={columns}
            rows={data.notices}
            minWidth={820}
            rowKey={(r) => String(r.notice.key)}
          />
        </>
      )}
    </>
  )
}
