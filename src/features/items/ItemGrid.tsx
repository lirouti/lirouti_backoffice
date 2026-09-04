import { css } from 'styled-system/css'

import { gem } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'

import {
  ITEM_STATUS_LABEL,
  ITEM_STATUS_TONE,
  SLOT_LABEL,
  TIER_LABEL,
  TIER_TONE,
  type Item,
} from '@/domain/item'

/**
 * 아이템을 그림으로 훑는 뷰.
 *
 * 목록(표)이 수치를 보는 자리라면 여기는 **그림을 보는 자리**다. 꾸미기 아이템이라
 * "이름이 뭐였더라"보다 "그 왕관"으로 찾는 일이 많다.
 *
 * 폭은 원본 그대로 `auto-fit, minmax(148px, 1fr)` — 화면이 넓어지면 칸이 늘고
 * 좁아지면 줄어든다. 개수를 고정하면 사이드바를 접었을 때 여백이 뜬다.
 */
export function ItemGrid({ items, onOpen }: { items: Item[]; onOpen: (item: Item) => void }) {
  return (
    <ul
      className={css({
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
        gap: '12px',
        listStyle: 'none',
        m: '0',
        p: '0',
      })}
    >
      {items.map((it) => (
        <li key={it.key}>
          <Tile item={it} onOpen={() => onOpen(it)} />
        </li>
      ))}
    </ul>
  )
}

/**
 * 타일 하나.
 *
 * ⚠️ **`<button>` 이다.** 원본은 `<div onClick>` 이라 Tab 으로 닿지 않고 Enter 로도
 *    안 열렸다 — 마우스로는 멀쩡해서 눈치채기 어려운 종류다 (`Switch` 와 같은 문제).
 */
function Tile({ item, onOpen }: { item: Item; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      // 이름을 앞에 세운다. 그냥 두면 DOM 순서대로 읽혀 "무료 밀짚모자 머리 무료" 가
      // 되는데, 목록을 훑을 때 필요한 건 배지가 아니라 이름이다.
      // (무료 아이템이 등급·가격 둘 다 "무료" 인 건 화면에 실제로 그렇게 적혀 있다)
      aria-label={[
        item.name,
        SLOT_LABEL[item.slot],
        TIER_LABEL[item.tier],
        gem(item.price),
        item.status !== 'VISIBLE' ? ITEM_STATUS_LABEL[item.status] : null,
      ]
        .filter(Boolean)
        .join(', ')}
      className={css({
        width: 'full',
        display: 'block',
        textAlign: 'left',
        appearance: 'none',
        p: '0',
        font: 'inherit',
        bg: 'surf',
        border: '1px solid token(colors.bd)',
        borderRadius: 'xl',
        overflow: 'hidden',
        cursor: 'pointer',
        _hover: { borderColor: 'chart', boxShadow: '0 4px 14px rgba(47,124,239,.13)' },
        _focusVisible: {
          outline: 'none',
          borderColor: 'ringBd',
          boxShadow: '0 0 0 3px token(colors.ring)',
        },
      })}
    >
      <span className={css({ position: 'relative', display: 'block' })}>
        {/* 이름은 아래 제목이 이미 읽어 준다. 여기서 또 읽으면 두 번 들린다 */}
        <AssetThumb assetId={item.assetId} fluid paid={item.tier === 'PAID'} />
        <span className={css({ position: 'absolute', top: '7px', left: '7px' })}>
          <Badge tone={TIER_TONE[item.tier]}>{TIER_LABEL[item.tier]}</Badge>
        </span>
        {item.status !== 'VISIBLE' && (
          <span className={css({ position: 'absolute', top: '7px', right: '7px' })}>
            <Badge tone={ITEM_STATUS_TONE[item.status]}>{ITEM_STATUS_LABEL[item.status]}</Badge>
          </span>
        )}
      </span>

      <span
        className={css({
          display: 'block',
          p: '9px 11px 11px',
          borderTop: '1px solid token(colors.ln)',
        })}
      >
        <span
          className={css({
            display: 'block',
            textStyle: 'label',
            fontWeight: '700',
            color: 'ink',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {item.name}
        </span>
        <span className={css({ mt: '3px', display: 'flex', alignItems: 'center', gap: '6px' })}>
          <span className={css({ textStyle: 'micro', color: 'faint' })}>
            {SLOT_LABEL[item.slot]}
          </span>
          <span
            className={css({ ml: 'auto', textStyle: 'micro', fontWeight: '700', color: 'sub' })}
          >
            {gem(item.price)}
          </span>
        </span>
      </span>
    </button>
  )
}
