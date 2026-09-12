/**
 * 성장 단계 — 카드 4 + 표.
 *
 * ⚠️ **등록 버튼이 없다.** 네 단계가 기획으로 고정돼 있어 운영자가 늘리는 대상이 아니다 —
 *    늘리면 클라이언트에 그 연출이 없다 (docs/ARCHITECTURE.md §19.3).
 *
 * ⚠️ **그래도 그림과 경계는 고친다.** 줄이 고정인 것과 내용이 고정인 것은 다른 말이다 —
 *    디자이너가 다시 그린 알을 반영하는 건 줄을 더하는 게 아니라 같은 줄의 교체다.
 *    예전에는 `design/` 에 넣고 `bun run assets` 를 돌려야 했다 (§42.3).
 *
 * ⚠️ **「금」 은 알과 유체 사이의 짧은 연출 단계다.** 소요가 날짜가 아니라 「부화 직전」 인
 *    것은 오타가 아니라 **시간이 아니라 사건으로 끝나는 단계**라서다 (§42.2).
 */
import { useState } from 'react'

import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonCards, SkeletonRows } from '@/shared/ui/Skeleton'
import { Table, type Column } from '@/shared/ui/Table'

import { boundariesOf, withSpans, type GrowthStage } from '@/domain/growth'

import { useSaveStageAsset, useStages } from '@/api/growth'

import { AssetReplaceDialog } from '@/entities/asset'

import { GrowthBoundaryDialog } from './GrowthBoundaryDialog'

/** 표 한 줄 — 단계와 **파생된** 소요 */
type Row = { stage: GrowthStage; span: string }

export default function GrowthPage() {
  const { data, isPending, error } = useStages()
  const saveAsset = useSaveStageAsset()
  const [editing, setEditing] = useState(false)
  const [replacing, setReplacing] = useState<GrowthStage | null>(null)

  // 소요는 저장하지 않고 경계에서 만든다 — 문자열로 들면 반드시 어긋난다 (§42.3).
  const rows = withSpans(data ?? [])

  return (
    <>
      <PageHeader
        title="성장 단계"
        sub="알에서 성체까지 네 단계입니다. 알 껍질 색이 부화 결과를 예고합니다."
        actions={
          <Button onClick={() => setEditing(true)} disabled={isPending || !!error}>
            기준 일수 수정
          </Button>
        }
      />

      {saveAsset.error && <ErrorBanner message={saveAsset.error.message} />}

      {error ? (
        <ErrorBanner message={error.message} />
      ) : isPending ? (
        <>
          {/* 넷인 것을 안다 — 기획이 고정한 4단계다 (§19.3) */}
          <SkeletonCards count={4} min={170} button className={css({ mb: '14px' })} />
          <SkeletonRows rows={4} silent />
        </>
      ) : (
        <>
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '13px',
              mb: '14px',
            })}
          >
            {rows.map(({ stage, span }) => (
              <StageCard
                key={stage.key}
                stage={stage}
                span={span}
                onReplace={() => setReplacing(stage)}
              />
            ))}
          </div>

          <Table
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => String(r.stage.key)}
            minWidth={640}
          />

          <GrowthBoundaryDialog
            open={editing}
            onClose={() => setEditing(false)}
            initial={boundariesOf(data)}
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
            kind="growth"
            assetId={replacing?.assetId ?? ''}
            name={replacing?.name ?? ''}
            on="rig"
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
 * 단계 한 장.
 *
 * ⚠️ **가격을 적지 않는다.** 원본은 배경과 카드 생성기를 공유해서 「단계」 배지 옆에
 *    「무료」 가 함께 찍히는데, 성장 단계는 사고 파는 물건이 아니라 **시간이 지나면 오는 것**
 *    이라 두 라벨이 서로 다른 이야기를 한다 (둥지와 같은 판단, §41.3).
 *
 * 소요는 **받아서 그린다** — 카드와 표가 같은 값을 두 번 만들면 어긋날 수 있다.
 */
function StageCard({
  stage: s,
  span,
  onReplace,
}: {
  stage: GrowthStage
  span: string
  onReplace: () => void
}) {
  return (
    <Card className={css({ p: '0', overflow: 'hidden' })}>
      <div className={css({ position: 'relative' })}>
        <AssetThumb assetId={s.assetId} src={s.assetSrc} alt={s.name} fluid />
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
          단계
        </span>
      </div>
      <div className={css({ p: '10px 12px 12px', borderTop: '1px solid token(colors.ln)' })}>
        <div className={css({ textStyle: 'label', fontWeight: '700', color: 'ink' })}>
          {s.name}
        </div>
        <div className={css({ mt: '3px', textStyle: 'micro', color: 'faint' })}>{span}</div>
        <div className={css({ mt: '9px' })}>
          <Button onClick={onReplace}>그림 교체</Button>
        </div>
      </div>
    </Card>
  )
}

const COLUMNS: Column<Row>[] = [
  { key: 'name', label: '단계', width: '140px', strong: true, render: (r) => r.stage.name },
  { key: 'span', label: '소요', width: '160px', render: (r) => r.span },
  { key: 'unlock', label: '해금', render: (r) => r.stage.unlock },
]
