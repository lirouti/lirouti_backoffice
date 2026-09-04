import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Card, CardTitle } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Table, type Column } from '@/shared/ui/Table'

type SlotRow = {
  name: string
  /** 이 슬롯에 꽂을 수 있는 부품 수 */
  parts: number
  /** 종 특성으로 정해지는 기본 부품. 「없음」 이면 의상이 채운다 */
  def: string
  note: string
}

/**
 * 기준 좌표. **네 값이 모든 종·모든 의상의 앵커다.**
 *
 * 원본이 화면에 박아 둔 숫자를 그대로 옮겼다. 리그 SVG(`rg`)의 좌표계 기준이라
 * viewBox 가 바뀌면 함께 바뀐다 — 그때는 아트 쪽과 같이 고쳐야 한다.
 */
const ANCHORS: { label: string; value: string }[] = [
  { label: '중심축', value: 'x 468' },
  { label: '눈높이', value: 'y 177' },
  { label: '목선', value: 'y 305' },
  { label: '접지선', value: 'y 481' },
]

const SLOTS: SlotRow[] = [
  { name: '정수리', parts: 6, def: '볏', note: '종 특성 기본값' },
  { name: '눈', parts: 12, def: '기본 눈', note: '표정 슬롯과 공유' },
  { name: '부리', parts: 5, def: '짧은 부리', note: '색상 변형 포함' },
  { name: '꼬리', parts: 7, def: '짧은 꼬리', note: '유체 단계는 없음' },
  { name: '몸', parts: 13, def: '없음', note: '의상이 붙는 주 슬롯' },
  { name: '손', parts: 13, def: '없음', note: '오른손 기준 앵커' },
]

const COLUMNS: Column<SlotRow>[] = [
  { key: 'name', label: '슬롯', width: '110px', strong: true },
  { key: 'parts', label: '부품 수', width: '90px', align: 'right' },
  { key: 'def', label: '기본값', width: '140px' },
  {
    key: 'swap',
    label: '교체',
    width: '90px',
    // 여섯 슬롯이 전부 교체 가능하다. 그래도 열을 두는 이유는 **불가능한 슬롯이 생겼을 때
    // 바로 드러나야** 해서다 — 값이 하나뿐이라 지우면 그 변화를 아무도 못 본다.
    render: () => <Badge tone="success">가능</Badge>,
  },
  { key: 'note', label: '비고', truncate: true },
]

/**
 * 캐릭터 리그 · 슬롯 — **읽는 화면이다.**
 *
 * 리그는 아트 파이프라인이 정하고 어드민은 그 기준을 확인만 한다. 그래서 등록도 수정도
 * 없고, 아트 원본으로 가는 링크만 둔다 (docs/ARCHITECTURE.md §19).
 */
export default function RigPage() {
  return (
    <>
      <PageHeader
        title="캐릭터 리그 · 슬롯"
        sub="모든 캐릭터가 같은 몸과 같은 외곽선을 씁니다. 여섯 슬롯에 어떤 부품을 꽂느냐로 개성이 결정됩니다."
      />

      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '18px',
          alignItems: 'flex-start',
        })}
      >
        <Card className={css({ flex: '1 1 400px', minWidth: '280px', p: '15px' })}>
          <AssetThumb assetId="rg" fluid alt="리그 기준 실루엣" />
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '9px',
              mt: '13px',
            })}
          >
            {ANCHORS.map((a) => (
              <div
                key={a.label}
                className={css({
                  bg: 'surf2',
                  border: '1px solid token(colors.ln)',
                  borderRadius: 'md',
                  p: '9px 11px',
                })}
              >
                <div className={css({ textStyle: 'caption', color: 'sub' })}>{a.label}</div>
                <div
                  className={css({
                    mt: '2px',
                    textStyle: 'body',
                    fontWeight: '700',
                    color: 'ink',
                  })}
                >
                  {a.value}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div
          className={css({
            flex: '3 1 460px',
            minWidth: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          })}
        >
          <Table columns={COLUMNS} rows={SLOTS} minWidth={620} />

          <Card className={css({ p: '19px 21px' })}>
            <CardTitle title="종 특성" />
            <p className={css({ m: '6px 0 0', textStyle: 'body', color: 'sub' })}>
              종 특성도 슬롯 기본값일 뿐입니다. 아이템으로 덮어쓰면 그대로 교체됩니다.{' '}
              <strong className={css({ color: 'ink' })}>
                종의 아트 자체는 캐릭터팀이 관리하며 이 어드민에서는 읽기 전용입니다.
              </strong>
            </p>
          </Card>
        </div>
      </div>
    </>
  )
}
