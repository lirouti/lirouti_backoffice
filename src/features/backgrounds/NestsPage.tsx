/**
 * 둥지 — 카드 3 + 표.
 *
 * ⚠️ **등록 버튼이 없다.** 3단계가 기획으로 고정돼 있어 운영자가 늘리는 대상이 아니다 —
 *    4번째를 만들면 해금 일수 구간이 겹치고 클라이언트에 그 연출이 없다
 *    (docs/ARCHITECTURE.md §41.3). 버튼이 없는 것은 빠뜨린 게 아니다.
 *
 * ⚠️ **그래도 그림과 해금 일수는 고친다.** 줄이 고정인 것과 내용이 고정인 것은 다른
 *    말이다 (§19.3) — 디자이너가 다시 그린 둥지를 반영하는 건 줄을 더하는 게 아니라
 *    같은 줄의 교체다.
 */
import { useState } from 'react'

import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { SkeletonCards, SkeletonRows } from '@/shared/ui/Skeleton'
import { Table, type Column } from '@/shared/ui/Table'

import { nestBoundariesOf, withUnlocks, type Nest } from '@/domain/nest'

import { useNests, useSaveNestAsset } from '@/api/backgrounds'

import { AssetReplaceDialog } from '@/entities/asset'

import { NestBoundaryDialog } from './NestBoundaryDialog'

export default function NestsPage() {
  const { data, isPending, error } = useNests()
  const saveAsset = useSaveNestAsset()
  const [editing, setEditing] = useState(false)
  const [replacing, setReplacing] = useState<Nest | null>(null)

  // 해금 조건은 저장하지 않고 경계에서 만든다 — 문자열로 들면 반드시 어긋난다 (§41.4).
  const rows = withUnlocks(data ?? [])

  return (
    <>
      <PageHeader
        title="둥지"
        sub="발밑 단계입니다. 함께한 일수로 해금되며 소품이 늘어납니다."
        actions={
          <Button onClick={() => setEditing(true)} disabled={isPending || !!error}>
            해금 일수 수정
          </Button>
        }
      />

      {saveAsset.error && <ErrorBanner message={saveAsset.error.message} />}

      {error ? (
        <ErrorBanner message={error.message} />
      ) : isPending ? (
        <>
          {/* 셋인 것을 안다 — 둥지는 기획이 고정한 3단계다 (§41.3) */}
          <SkeletonCards count={3} min={280} button className={css({ mb: '18px' })} />
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
            {rows.map(({ nest, unlock }) => (
              <NestCard
                key={nest.key}
                nest={nest}
                unlock={unlock}
                onReplace={() => setReplacing(nest)}
              />
            ))}
          </div>

          <Table
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => String(r.nest.key)}
            minWidth={640}
          />

          <NestBoundaryDialog
            open={editing}
            onClose={() => setEditing(false)}
            initial={nestBoundariesOf(data)}
          />

          {/*
            ⚠️ **창을 언마운트로 닫지 말 것.** 네이티브 `<dialog>` 는 `close()` 를 불렀을
               때만 포커스를 돌려준다 — DOM 에서 빼면 **`body` 로 떨어진다**(§63.1).
               실측했다: Esc 를 누르면 포커스가 `body` 였다. 그래서 계속 붙여 두고 `open`
               만 여닫는다 (`AiReviewPage` 와 같은 방식).
          */}
          <AssetReplaceDialog
            open={replacing !== null}
            onClose={() => {
              setReplacing(null)
              // ⚠️ 저장 오류는 페이지에 떠 있다 — 창을 닫고 다른 줄을 열면 **그 줄의
              //    오류처럼** 읽힌다. 닫을 때 함께 지운다.
              saveAsset.reset()
            }}
            kind="nest"
            assetId={replacing?.assetId ?? ''}
            name={replacing?.name ?? ''}
            on="background"
            backdropId="as_bg_0"
            saving={saveAsset.isPending}
            onSave={(nextAssetId) =>
              replacing &&
              saveAsset.mutate(
                { key: replacing.key, nextAssetId },
                { onSuccess: () => setReplacing(null) },
              )
            }
          />
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
 * 해금 조건은 **받아서 그린다** — 카드와 표가 같은 값을 두 번 만들면 어긋날 수 있다.
 */
function NestCard({
  nest: n,
  unlock,
  onReplace,
}: {
  nest: Nest
  unlock: string
  onReplace: () => void
}) {
  return (
    <Card className={css({ p: '0', overflow: 'hidden' })}>
      <div className={css({ position: 'relative' })}>
        {/* 둥지는 아래쪽에만 그려져 있다 — 배경 위에 얹히는 오브젝트라 좌표계가 배경과 같다 (§8.6) */}
        <AssetThumb assetId={n.assetId} src={n.assetSrc} alt={n.name} fluid />
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
        <div className={css({ textStyle: 'label', fontWeight: '700', color: 'ink' })}>
          {n.name}
        </div>
        <div className={css({ mt: '3px', textStyle: 'micro', color: 'faint' })}>
          {unlock} · {n.desc}
        </div>
        <div className={css({ mt: '9px' })}>
          <Button onClick={onReplace}>그림 교체</Button>
        </div>
      </div>
    </Card>
  )
}

/** 표 한 줄 — 둥지와 **파생된** 해금 조건 */
type Row = { nest: Nest; unlock: string }

const COLUMNS: Column<Row>[] = [
  { key: 'name', label: '단계', width: '150px', strong: true, render: (r) => r.nest.name },
  { key: 'unlock', label: '해금 조건', width: '150px', render: (r) => r.unlock },
  { key: 'props', label: '소품', render: (r) => r.nest.props },
  {
    key: 'own',
    label: '보유율',
    width: '140px',
    // ⚠️ **`plain` 이다.** 100일을 함께한 사람이 적은 것은 고칠 문제가 아니라 단계가 깊다는
    //    뜻이다 — 신호등 색을 쓰면 「보금자리 18%」 가 주황으로 칠해져 사고로 읽힌다 (§40.1).
    render: ({ nest: n }) => (
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
