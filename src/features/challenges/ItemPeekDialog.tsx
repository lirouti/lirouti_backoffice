import { css, cx } from 'styled-system/css'

import { count, gem as gemPrice, pct } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { skeletonBar, skeletonRegion } from '@/shared/ui/skeletonBase'

import {
  ITEM_SOURCE_LABEL,
  ITEM_STATUS_LABEL,
  ITEM_STATUS_TONE,
  SLOT_LABEL,
  TIER_LABEL,
  TIER_TONE,
  type Item,
} from '@/domain/item'

import { isApiError } from '@/api/error'
import { useItem } from '@/api/items'

type ItemPeekDialogProps = {
  open: boolean
  /** 들여다볼 아이템 (`Item.key`). `null` 이면 가리키는 것이 없다 */
  itemKey: number | null
  /**
   * 부르는 쪽이 **이미 들고 있는** 아이템. 주면 받아 오지 않는다.
   *
   * 고르기 창은 목록으로 여섯 칸을 전부 갖고 있다 — 그걸 두고 상세를 다시 받으면
   * **화면에 이미 있는 값을 기다리며 스켈레톤이 깜빡인다.**
   */
  item?: Item
  onClose: () => void
}

/** 그림 한 변. 본문과 스켈레톤이 같은 값을 써야 도착할 때 창이 안 튄다 */
const THUMB = 132

/** 값 칸 너비. 다 같으면 기계처럼 보인다 — `Body` 의 여섯 줄과 수가 같아야 한다 */
const ROW_WIDTHS = ['44%', '38%', '52%', '34%', '46%', '30%']

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
 * ⚠️ **못 보여 주는 이유를 셋으로 갈라 말한다.** 「지워졌다(404)」 · 「가리키는 것이 없다」 ·
 *    「못 불러왔다」 는 운영자가 **할 일이 서로 다르다** — 하나로 뭉뚱그리면 잠깐 끊긴
 *    네트워크에 대고 「보상을 다시 고르세요」 라고 하게 된다 (§25.2).
 */
export function ItemPeekDialog({ open, itemKey, item, onClose }: ItemPeekDialogProps) {
  /*
    부르지 않는 경우 셋 — 창이 닫혔거나, 가리키는 것이 없거나, **부르는 쪽이 이미 줬다.**
    목록을 훑기만 해도 받아 오면 안 된다.
  */
  const { data, isPending, error } = useItem(
    item || itemKey === null || !open ? '' : String(itemKey),
  )
  const shown = item ?? data?.item

  return (
    <Dialog
      open={open}
      onCancel={onClose}
      wide
      title="아이템 확인"
      body="보상으로 걸기 전에 무엇을 주는지 봅니다."
    >
      {itemKey === null ? (
        /*
          ⚠️ **빈 창을 띄우지 않는다.** 보상이 `itemKey` 없이 들어올 수 있다 — 이 필드는
             나중에 생겼고(§20.5.3), 서버가 예전 모양으로 주면 「상세」 는 그려지는데
             가리키는 곳이 없다. 그때 본문을 비우면 「안 불러왔다」 와 똑같아 보인다.
        */
        <ErrorBanner message="이 보상은 아이템을 가리키고 있지 않습니다. 다시 골라 주세요." />
      ) : error ? (
        <ErrorBanner
          message={
            isApiError(error) && error.status === 404
              ? `${error.message} 보상을 다시 고르세요.`
              : // 잠깐 끊긴 것일 수 있다. 여기서 「다시 고르라」 고 하면 멀쩡한 보상을 버린다.
                `${error.message} 창을 닫았다 다시 열어 주세요.`
          }
        />
      ) : shown ? (
        <Body item={shown} />
      ) : isPending ? (
        <BodySkeleton />
      ) : null}
    </Dialog>
  )
}

function Body({ item }: { item: Item }) {
  return (
    <div className={css({ display: 'flex', gap: '16px', flexWrap: 'wrap' })}>
      <AssetThumb
        assetId={item.assetId}
        src={item.assetSrc}
        size={THUMB}
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
          {/* ⚠️ 아이템 상세와 **같은 포맷터**를 쓴다. 손으로 찍으면 소수 보유율에서 갈린다 */}
          <Row k="누적 판매" v={count(item.sold)} />
          <Row k="보유율" v={pct(item.own)} />
        </dl>
      </div>
    </div>
  )
}

/**
 * 로딩 자리.
 *
 * ⚠️ **`SkeletonRows` 를 쓰면 안 된다.** 본문은 132px 그림 + 배지줄 + 제목 + 6줄인데
 *    글줄 넷으로 덮으면 **도착하는 순간 창이 커지면서 닫기 버튼이 손가락 밑에서 움직인다.**
 *    스켈레톤의 목적이 바로 그걸 막는 것이다 (§43 원칙 ①).
 */
function BodySkeleton() {
  return (
    <div
      {...skeletonRegion(false)}
      className={css({ display: 'flex', gap: '16px', flexWrap: 'wrap' })}
    >
      <div
        aria-hidden="true"
        className={cx(skeletonBar, css({ flex: 'none', borderRadius: 'lg' }))}
        style={{ width: THUMB, height: THUMB }}
      />
      <div aria-hidden="true" className={css({ flex: '1 1 240px', minWidth: '0' })}>
        <div className={css({ display: 'flex', gap: '7px' })}>
          <div className={skeletonBar} style={{ height: 20, width: 52 }} />
          <div className={skeletonBar} style={{ height: 20, width: 44 }} />
          <div className={skeletonBar} style={{ height: 20, width: 62 }} />
        </div>
        <div className={skeletonBar} style={{ height: 22, width: '58%', marginTop: 8 }} />
        <div className={skeletonBar} style={{ height: 13, width: '76%', marginTop: 5 }} />
        <div
          className={css({ mt: '15px', display: 'flex', flexDirection: 'column', gap: '7px' })}
        >
          {ROW_WIDTHS.map((w, i) => (
            <div key={i} className={css({ display: 'flex', gap: '10px' })}>
              <div className={skeletonBar} style={{ height: 15, width: 68, flex: 'none' }} />
              <div className={skeletonBar} style={{ height: 15, width: w }} />
            </div>
          ))}
        </div>
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
