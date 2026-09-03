/**
 * 레벨 테이블 — 읽기 전용.
 *
 * **편집 수단이 없으므로 「변경 저장」 도 두지 않았다** (docs/ARCHITECTURE.md §24.1.1).
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

import { LEVEL_STATUS_TONE, type Level } from '@/domain/level'

import { useLevels } from '@/api/levels'

const COLUMNS: Column<Level>[] = [
  { key: 'lv', label: 'Lv', width: '58px', align: 'right', strong: true },
  { key: 'need', label: '필요 경험치', width: '120px', align: 'right', render: (l) => num(l.need) },
  {
    key: 'total',
    label: '누적',
    width: '120px',
    align: 'right',
    // 앞 행들의 필요 경험치 합이다. 회색으로 낮춰 「필요 경험치」 와 헷갈리지 않게 한다.
    render: (l) => <span className={css({ color: 'sub' })}>{num(l.total)}</span>,
  },
  { key: 'gem', label: '젬 보상', width: '96px', align: 'right', render: (l) => num(l.gem) },
  { key: 'unlock', label: '해금', truncate: true },
  {
    key: 'status',
    label: '상태',
    width: '90px',
    render: (l) => <Badge tone={LEVEL_STATUS_TONE[l.status]}>{l.status}</Badge>,
  },
]

export default function LevelsPage() {
  const { data, isPending, error } = useLevels()

  return (
    <>
      <PageHeader
        title="레벨 테이블"
        sub="레벨별 필요 경험치와 보상입니다. 상수는 릴리스 전 검수를 거칩니다."
        actions={
          <>
            {/* TODO(밸런스 상수 업로드 API 가 생기면): 스프레드시트를 통째로 갈아 끼운다 (§18.8) */}
            <Button disabled>CSV 가져오기 · 준비 중</Button>
          </>
        }
      />

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <>
          <SkeletonStats count={4} min={150} />
          <SkeletonRows rows={8} silent className={css({ mt: '14px' })} />
        </>
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? '레벨 테이블을 불러오지 못했습니다.'} />
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
            <StatTile label="만렙" value={`Lv ${num(data.summary.maxLv)}`} />
            <StatTile label="만렙까지 경험치" value={num(data.summary.totalExp)} />
            <StatTile label="만렙까지 젬" value={num(data.summary.totalGem)} />
            <StatTile
              label="검수 중"
              value={num(data.summary.reviewing)}
              alert={data.summary.reviewing > 0}
            />
          </div>

          <Table
            columns={COLUMNS}
            rows={data.levels}
            minWidth={720}
            rowKey={(l) => String(l.lv)}
          />

          <p className={css({ m: '14px 0 0', textStyle: 'caption', color: 'faint' })}>
            「누적」 은 Lv 1 부터 그 레벨을 마치기까지 쌓인 합입니다 — 「필요 경험치」 를 더한
            값입니다.
          </p>
        </>
      )}
    </>
  )
}
