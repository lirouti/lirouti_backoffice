/**
 * 보상 아이템 들여다보기.
 *
 * **폼을 떠나지 않는다.** 작성 중인 챌린지를 두고 아이템 탭으로 보내면 하던 일을 놓친다 —
 * 여기서 확인하려는 것은 「이 아이템이 맞는가」 지 판매 추이가 아니다.
 *
 * ⚠️ **고르기 전에 봐야 하는 것이 있다.** 고르기 창은 이름·슬롯·코드만 보여 주는데,
 *    **미노출 아이템이나 유료 아이템을 보상으로 거는 것**은 눌러 보기 전에는 모른다
 *    (docs/ARCHITECTURE.md §20.5.2).
 *
 * ⚠️ **지워진 아이템이면 그렇게 말한다.** 보상은 아이템을 `itemKey` 로 가리키는데 그
 *    아이템이 사라질 수 있다 — 빈 칸을 두지 않는 것은 이벤트 보상과 같은 규율(§25.2)이다.
 */
import { css } from 'styled-system/css'

import { gem as gemPrice, num } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { SkeletonRows } from '@/shared/ui/Skeleton'

import {
  ITEM_SOURCE_LABEL,
  ITEM_STATUS_LABEL,
  ITEM_STATUS_TONE,
  SLOT_LABEL,
  TIER_LABEL,
  TIER_TONE,
  type Item,
} from '@/domain/item'

import { useItem } from '@/api/items'

type ItemPeekDialogProps = {
  open: boolean
  /** 들여다볼 아이템. `null` 이면 창을 그리기만 한다 */
  itemKey: number | null
  onClose: () => void
}

export function ItemPeekDialog({ open, itemKey, onClose }: ItemPeekDialogProps) {
  // 창이 닫혀 있거나 가리키는 것이 없으면 부르지 않는다 — 목록을 훑기만 해도 받아 오면 안 된다.
  const { data, isPending, error } = useItem(itemKey === null || !open ? '' : String(itemKey))

  return (
    <Dialog
      open={open}
      onCancel={onClose}
      wide
      title="아이템 확인"
      body="보상으로 걸기 전에 무엇을 주는지 봅니다."
    >
      {itemKey === null ? null : error ? (
        /* 가리키던 아이템이 사라졌다. 빈 칸을 두면 「안 불러왔다」 와 구분이 안 된다 (§25.2) */
        <ErrorBanner message={`${error.message} 보상을 다시 고르세요.`} />
      ) : isPending ? (
        <SkeletonRows rows={4} />
      ) : (
        <Body item={data.item} />
      )}
    </Dialog>
  )
}

function Body({ item }: { item: Item }) {
  return (
    <div className={css({ display: 'flex', gap: '16px', flexWrap: 'wrap' })}>
      <AssetThumb
        assetId={item.assetId}
        src={item.assetSrc}
        size={132}
        paid={item.tier === 'PAID'}
        alt={item.name}
      />

      <div className={css({ flex: '1 1 240px', minWidth: '0' })}>
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '7px',
          })}
        >
          <Badge tone={ITEM_STATUS_TONE[item.status]}>{ITEM_STATUS_LABEL[item.status]}</Badge>
          <Badge tone={TIER_TONE[item.tier]}>{TIER_LABEL[item.tier]}</Badge>
          <span className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}>
            {item.code}
          </span>
        </div>

        <h3 className={css({ m: '8px 0 0', textStyle: 'h3', fontWeight: '700', color: 'ink' })}>
          {item.name}
        </h3>
        <p className={css({ m: '3px 0 0', textStyle: 'caption', color: 'sub' })}>{item.sub}</p>

        <dl
          className={css({
            m: '13px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
          })}
        >
          <Row k="슬롯" v={SLOT_LABEL[item.slot]} />
          {/* `gem()` 은 0 을 「무료」 로 옮긴다 — 가격 칸이라 여기서는 그게 맞다 */}
          <Row k="가격" v={gemPrice(item.price)} />
          <Row k="획득" v={ITEM_SOURCE_LABEL[item.source]} />
          <Row k="시즌" v={item.season} />
          <Row k="누적 판매" v={`${num(item.sold)}건`} />
          <Row k="보유율" v={`${item.own}%`} />
        </dl>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'baseline', gap: '10px' })}>
      <dt
        className={css({ flex: 'none', width: '68px', textStyle: 'caption', color: 'faint' })}
      >
        {k}
      </dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
        })}
      >
        {v}
      </dd>
    </div>
  )
}
