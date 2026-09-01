/**
 * 성장 단계 — 카드 4 + 표.
 *
 * ⚠️ **아직 그림이 없다.** `as_growth_0..3` 을 **id 로만 참조**하므로 디자이너가 원본을
 *    `design/` 에 넣고 `bun run assets` 를 돌리면 **코드를 고치지 않아도 붙는다.**
 *    그때까지는 `AssetThumb` 이 `?` 로 그린다 (docs/ARCHITECTURE.md §42).
 *
 * 등록·수정이 없는 것은 둥지(§41.3)와 같은 이유다 — 네 단계가 기획으로 고정돼 있다.
 */
import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Table, type Column } from '@/shared/ui/Table'

type Stage = {
  /** 에셋 파일 id — 'as_growth_0' */
  assetId: string
  /** 「알」 */
  name: string
  /** 이 단계에 머무는 기간 — 「0–2일」. 카드의 한 줄이자 표의 「소요」 다 */
  days: string
  /** 이 단계에서 열리는 것 — 「기본 배경 · 잔가지 둥지」 */
  unlock: string
}

/**
 * 원본 `STAGES` 를 그대로 옮겼다.
 *
 * 파사드도 목도 두지 않는다 — **측정값이 하나도 없이 정의뿐**이라 서버가 내려줄 것이 없다.
 * 같은 이유로 리그·슬롯(`RigPage`)도 화면 상수를 쓴다. 반대로 둥지는 보유율(측정값)이
 * 있어서 파사드를 뒀다 (§41.3).
 *
 * ⚠️ **「금」 은 알과 유체 사이의 짧은 연출 단계다.** 소요가 날짜가 아니라 「부화 직전」 인
 *    것은 오타가 아니라 **시간이 아니라 사건으로 끝나는 단계**라서다.
 */
const STAGES: Stage[] = [
  { assetId: 'as_growth_0', name: '알', days: '0–2일', unlock: '기본 배경 · 잔가지 둥지' },
  { assetId: 'as_growth_1', name: '금', days: '부화 직전', unlock: '부화 연출' },
  { assetId: 'as_growth_2', name: '유체', days: '3–13일', unlock: '표정 · 이모티콘' },
  { assetId: 'as_growth_3', name: '성체', days: '14일~', unlock: '전 슬롯 · 챌린지' },
]

export default function GrowthPage() {
  return (
    <>
      <PageHeader title="성장 단계" sub="알에서 성체까지 네 단계입니다. 알 껍질 색이 부화 결과를 예고합니다." />

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '13px',
          mb: '14px',
        })}
      >
        {STAGES.map((s) => (
          <StageCard key={s.assetId} stage={s} />
        ))}
      </div>

      <Table columns={COLUMNS} rows={STAGES} rowKey={(s) => s.assetId} minWidth={640} />
    </>
  )
}

/**
 * 단계 한 장.
 *
 * ⚠️ **가격을 적지 않는다.** 원본은 배경과 카드 생성기를 공유해서 「단계」 배지 옆에
 *    「무료」 가 함께 찍히는데, 성장 단계는 사고 파는 물건이 아니라 **시간이 지나면 오는 것**
 *    이라 두 라벨이 서로 다른 이야기를 한다 (둥지와 같은 판단, §41.3).
 */
function StageCard({ stage: s }: { stage: Stage }) {
  return (
    <Card className={css({ p: '0', overflow: 'hidden' })}>
      <div className={css({ position: 'relative' })}>
        <AssetThumb assetId={s.assetId} alt={s.name} fluid />
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
        <div className={css({ textStyle: 'label', fontWeight: '700', color: 'ink' })}>{s.name}</div>
        <div className={css({ mt: '3px', textStyle: 'micro', color: 'faint' })}>{s.days}</div>
      </div>
    </Card>
  )
}

const COLUMNS: Column<Stage>[] = [
  { key: 'name', label: '단계', width: '140px', strong: true },
  { key: 'days', label: '소요', width: '160px' },
  { key: 'unlock', label: '해금' },
]
