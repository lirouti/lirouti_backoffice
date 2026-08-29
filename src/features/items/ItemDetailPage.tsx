/**
 * 아이템 상세. **첫 상세 화면이라 나머지 상세들의 본이 된다** (docs/ARCHITECTURE.md §18.7).
 *
 * 열 정의와 기본 정보 항목이 길어 파일 머리말을 따로 둔다 — 컴포넌트 주석이 30줄 밖이다.
 */
import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { IMAGES, isAssetId } from '@/assets/images'

import { count, date, gem, num, pct } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { LineChart } from '@/shared/ui/chart/LineChart'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Table, type Column } from '@/shared/ui/Table'

import {
  ITEM_SOURCE_LABEL,
  ITEM_STATUS_LABEL,
  ITEM_STATUS_TONE,
  SLOT_LABEL,
  TIER_LABEL,
  TIER_TONE,
  type Item,
} from '@/domain/item'
import { LEDGER_KIND_LABEL, LEDGER_KIND_TONE, type LedgerEntry } from '@/domain/ledger'
import { SCREENS } from '@/domain/screens'

import { useItem, type ItemDetail } from '@/api/items'

import { trendAxis } from './trend'

const LEDGER_COLUMNS: Column<LedgerEntry>[] = [
  { key: 'at', label: '일시', width: '150px', nowrap: true },
  {
    key: 'kind',
    label: '유형',
    width: '80px',
    render: (e) => <Badge tone={LEDGER_KIND_TONE[e.kind]}>{LEDGER_KIND_LABEL[e.kind]}</Badge>,
  },
  { key: 'target', label: '대상', width: '130px', strong: true },
  // 「수량」 만 두면 "한 사람이 21개 받았다" 로 읽힌다. 착용 아이템은 계정당 하나뿐이라
  // 이 숫자는 **몇 계정에 나갔는가** 다 (docs/ARCHITECTURE.md §18.6).
  { key: 'qty', label: '계정 수', width: '84px', align: 'right', render: (e) => num(e.qty) },
  { key: 'reason', label: '사유', minWidth: '160px', truncate: true },
  { key: 'by', label: '처리자', width: '90px' },
]

/** 「기본 정보」 카드의 항목들. 값은 화면에서 만들지 않고 라벨 맵을 거친다. */
function basics(item: Item): { k: string; v: string }[] {
  return [
    { k: '슬롯', v: SLOT_LABEL[item.slot] },
    { k: '등급', v: TIER_LABEL[item.tier] },
    { k: '가격', v: gem(item.price) },
    { k: '획득 경로', v: ITEM_SOURCE_LABEL[item.source] },
    { k: '등록일', v: date(item.madeAt) },
    { k: '시즌', v: item.season },
  ]
}

export default function ItemDetailPage() {
  const navigate = useNavigate()
  const { itemId = '' } = useParams()
  const { data, isPending, error } = useItem(itemId)

  if (isPending) return <Skeleton rows={6} />
  // 못 불러왔으면 배너만 남긴다 — 빈 상태를 겹치면 "없는 것" 과 "못 받은 것" 이 섞인다 (§18.5)
  if (error || !data) return <ErrorBanner message={error?.message ?? '아이템을 불러오지 못했습니다.'} />

  const { item } = data

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(SCREENS.items.path)}
        className={css({ mb: '12px', px: '0' })}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M7.5,2 L3.5,6 L7.5,10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        아이템 목록
      </Button>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <AssetCard item={item} />

        <div className={css({ flex: '3 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <HeadCard
            detail={data}
            onEdit={() => navigate(SCREENS.itemedit.path.replace(':itemId', String(item.key)))}
          />

          <Card className={css({ p: '17px 20px' })}>
            <CardTitle title="기본 정보" />
            <dl
              className={css({
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '11px',
                m: '13px 0 0',
              })}
            >
              {basics(item).map(({ k, v }) => (
                <div key={k}>
                  <dt className={css({ textStyle: 'micro', color: 'faint' })}>{k}</dt>
                  <dd className={css({ m: '2px 0 0', textStyle: 'body', fontWeight: '600', color: 'ink' })}>{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className={css({ p: '17px 20px 12px' })}>
            <CardTitle title="보유 추이" sub="최근 8주" />
            <div className={css({ mt: '10px' })}>
              <LineChart values={data.trend} {...trendAxis(data.trend)} height={140} />
            </div>
            <div className={css({ display: 'flex', justifyContent: 'space-between', textStyle: 'micro', color: 'faint', px: '4px' })}>
              <span>8주 전</span>
              <span>지난주</span>
            </div>
          </Card>

          <div>
            <h3 className={css({ m: '0 0 10px', textStyle: 'h3', color: 'ink' })}>최근 지급·회수 이력</h3>
            {/*
              원본은 760 인데 열 폭의 합이 690 이라 41px 때문에 가로 스크롤이 걸렸다.
              실제로 필요한 만큼만 잡는다 — 더 좁아지면 그때는 정말로 스크롤이 맞다.
            */}
            <Table columns={LEDGER_COLUMNS} rows={data.ledger} rowKey={(e) => String(e.key)} minWidth={700} />
          </div>
        </div>
      </div>
    </>
  )
}

/** 왼쪽 미리보기 + 에셋 조작. */
function AssetCard({ item }: { item: Item }) {
  // ⚠️ **올린 에셋을 먼저 본다.** 빌드에 없는 그림이라 `IMAGES[assetId]` 로는 못 찾고,
  //    그러면 내려받기가 조용히 잠긴다(`href` 가 없어 `aria-disabled`).
  const src = item.assetSrc ?? (isAssetId(item.assetId) ? IMAGES[item.assetId] : null)
  // 형식이 섞인다 — 업로드는 PNG 도 받는다. 파일명과 라벨을 실제 형식에 맞춘다.
  const ext = item.assetExt ?? 'svg'

  // 에셋을 바꾸는 길은 **「수정」 하나다.** 예전에는 여기서 고르면 그 자리에서 저장했는데,
  // 바로 옆에 「수정」 이 생기면서 같은 필드를 바꾸는 길이 둘이 됐다 — 하나는 즉시 저장이라
  // 미저장 경고를 받지 않아, 어느 쪽이 어떻게 동작하는지 예측할 수 없었다. (docs/ARCHITECTURE.md §18.7)
  //
  // 원본은 `flex: 1 1 380px` 인데 상한을 뒀다. 미리보기가 정사각이라 폭이 커지는 만큼
  // 세로도 길어져, 넓은 화면에서 왕관 하나가 400px 넘게 차지하고 오른쪽 단이
  // 표(760px)보다 좁아졌다. 왼쪽을 멈춰 세우면 남는 폭이 전부 오른쪽으로 간다.
  return (
    <Card className={css({ flex: '1 1 300px', minWidth: '260px', maxWidth: '380px', p: '15px' })}>
      <AssetThumb assetId={item.assetId} src={item.assetSrc} fluid paid={item.tier === 'PAID'} alt={item.name} />
      <div className={css({ display: 'flex', gap: '7px', mt: '12px' })}>
        {/*
          내려받기는 진짜로 된다. 빌드 에셋은 URL 로 들어와 있고, 올린 에셋은 `blob:` 이라
          둘 다 같은 출처다 — `<a download>` 로 파일명을 정할 수 있는 조건이다.
        */}
        <a
          href={src ?? undefined}
          download={`${item.code}.${ext}`}
          aria-disabled={src ? undefined : true}
          className={css({
            flex: '1',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid token(colors.bd)',
            borderRadius: 'md',
            bg: 'surf',
            color: 'ink',
            textStyle: 'label',
            fontWeight: '600',
            py: '8px',
            textDecoration: 'none',
            _hover: { bg: 'hov', borderColor: 'faint2' },
            _focusVisible: { outline: 'none', boxShadow: '0 0 0 3px token(colors.ring)' },
            '&[aria-disabled]': { opacity: 0.5, pointerEvents: 'none' },
          })}
        >
          {ext.toUpperCase()} 내려받기
        </a>
      </div>
    </Card>
  )
}

/** 배지·이름·설명 + 지표 4칸. */
function HeadCard({ detail, onEdit }: { detail: ItemDetail; onEdit: () => void }) {
  const { item } = detail

  const stats = [
    { k: '판매', v: count(item.sold) },
    { k: '보유율', v: pct(item.own) },
    { k: '즐겨찾기', v: num(detail.favorites) },
    { k: '반환', v: count(detail.returned) },
  ]

  return (
    <Card className={css({ p: '19px 21px' })}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '12px' })}>
        <div className={css({ flex: '1 1 300px', minWidth: '0' })}>
          <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' })}>
            <Badge tone={TIER_TONE[item.tier]}>{TIER_LABEL[item.tier]}</Badge>
            <Badge tone={ITEM_STATUS_TONE[item.status]}>{ITEM_STATUS_LABEL[item.status]}</Badge>
            <span className={css({ textStyle: 'caption', color: 'faint' })}>{item.code}</span>
          </div>
          <h2 className={css({ m: '6px 0 0', textStyle: 'h2', color: 'ink' })}>{item.name}</h2>
          <p className={css({ m: '5px 0 0', textStyle: 'body', color: 'sub' })}>{item.sub}</p>
        </div>

        <div className={css({ display: 'flex', gap: '7px', flex: 'none' })}>
          {/* TODO(상태 변경 API 가 생기면): 미노출로 */}
          <Button disabled title="준비 중">
            미노출로
          </Button>
          <Button variant="primary" onClick={onEdit}>
            수정
          </Button>
        </div>
      </div>

      <dl
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '11px',
          m: '16px 0 0',
        })}
      >
        {stats.map(({ k, v }) => (
          <div key={k} className={css({ bg: 'surf2', border: '1px solid token(colors.ln)', borderRadius: 'lg', p: '11px 13px' })}>
            <dt className={css({ textStyle: 'micro', color: 'faint' })}>{k}</dt>
            <dd className={css({ m: '3px 0 0', textStyle: 'h3', color: 'ink' })}>{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
