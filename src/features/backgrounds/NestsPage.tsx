/**
 * 둥지 — 카드 3 + 표.
 *
 * ⚠️ **등록 버튼이 없다.** 3단계가 기획으로 고정돼 있어 운영자가 늘리는 대상이 아니다 —
 *    4번째를 만들면 해금 일수 구간이 겹치고 클라이언트에 그 연출이 없다
 *    (docs/ARCHITECTURE.md §41.3). 버튼이 없는 것은 빠뜨린 게 아니다.
 */
import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { SkeletonCards, SkeletonRows } from '@/shared/ui/Skeleton'
import { Table, type Column } from '@/shared/ui/Table'

import type { Nest } from '@/domain/nest'

import { useNests } from '@/api/backgrounds'

export default function NestsPage() {
  const { data, isPending, error } = useNests()

  return (
    <>
      <PageHeader title="둥지" sub="발밑 단계입니다. 함께한 일수로 해금되며 소품이 늘어납니다." />

      {error ? (
        <ErrorBanner message={error.message} />
      ) : isPending ? (
        <>
          {/* 셋인 것을 안다 — 둥지는 기획이 고정한 3단계다 (§41.3) */}
          <SkeletonCards count={3} min={280} className={css({ mb: '18px' })} />
          <SkeletonRows rows={3} silent />
        </>
      ) : (
        <>
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '13px',
              mb: '18px',
            })}
          >
            {data.map((n) => (
              <NestCard key={n.assetId} nest={n} />
            ))}
          </div>

          <Table columns={COLUMNS} rows={data} rowKey={(n) => n.assetId} minWidth={640} />
        </>
      )}
    </>
  )
}

/**
 * 둥지 한 단계.
 *
 * ⚠️ **가격을 적지 않는다.** 원본은 배경과 카드 생성기를 공유해서 「해금」 배지 옆에
 *    「무료」 가 함께 찍히는데, 둥지는 사고 파는 물건이 아니라 **함께한 일수로 열리는 것**이라
 *    두 라벨이 서로 다른 이야기를 한다. 배지가 이미 「해금」 이라 값은 덜어냈다.
 *
 * ⚠️ **누를 수 없다.** 고칠 것이 없는 화면이라 갈 곳도 없다.
 */
function NestCard({ nest: n }: { nest: Nest }) {
  return (
    <Card className={css({ p: '0', overflow: 'hidden' })}>
      <div className={css({ position: 'relative' })}>
        {/* 둥지는 아래쪽에만 그려져 있다 — 배경 위에 얹히는 오브젝트라 좌표계가 배경과 같다 (§8.6) */}
        <AssetThumb assetId={n.assetId} src={undefined} alt={n.name} fluid />
        <span
          className={css({
            position: 'absolute',
            top: '7px',
            left: '7px',
            textStyle: 'micro',
            fontWeight: '700',
            p: '2px 7px',
            borderRadius: 'md',
            bg: 'nBg',
            color: 'sub',
          })}
        >
          해금
        </span>
      </div>
      <div className={css({ p: '10px 12px 12px', borderTop: '1px solid token(colors.ln)' })}>
        <div className={css({ textStyle: 'label', fontWeight: '700', color: 'ink' })}>{n.name}</div>
        <div className={css({ mt: '3px', textStyle: 'micro', color: 'faint' })}>{n.sub}</div>
      </div>
    </Card>
  )
}

const COLUMNS: Column<Nest>[] = [
  { key: 'name', label: '단계', width: '150px', strong: true },
  { key: 'cond', label: '해금 조건', width: '140px' },
  { key: 'props', label: '소품' },
  {
    key: 'own',
    label: '보유율',
    width: '140px',
    // ⚠️ **`plain` 이다.** 100일을 함께한 사람이 적은 것은 고칠 문제가 아니라 단계가 깊다는
    //    뜻이다 — 신호등 색을 쓰면 「보금자리 18%」 가 주황으로 칠해져 사고로 읽힌다 (§40.1).
    render: (n) => (
      <div className={css({ display: 'flex', alignItems: 'center', gap: '7px' })}>
        <div className={css({ flex: '1', minWidth: '0' })}>
          <ProgressBar rate={n.own} label={`${n.name} 보유율`} tone="plain" />
        </div>
        <span
          className={css({
            textStyle: 'micro',
            fontWeight: '700',
            color: 'sub',
            width: '32px',
            textAlign: 'right',
          })}
        >
          {n.own}%
        </span>
      </div>
    ),
  },
]
