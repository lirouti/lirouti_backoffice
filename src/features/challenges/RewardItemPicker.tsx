import { useState } from 'react'

import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Dialog } from '@/shared/ui/Dialog'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'

import type { ChallengeReward } from '@/domain/challenge'
import { SLOT_LABEL, type Item } from '@/domain/item'

import { useItems } from '@/api/items'

type RewardItemPickerProps = {
  open: boolean
  /** 지금 고른 것. 창을 열 때 여기서 시작한다 */
  value: ChallengeReward | null
  onClose: () => void
  onPick: (v: ChallengeReward) => void
}

/** 한 번에 보여 줄 수. 이름으로 좁혀 찾는 창이라 목록을 길게 둘 이유가 없다 */
const PER_PAGE = 12

/**
 * 보상 아이템 고르기.
 *
 * ⚠️ **`AssetPicker` 가 아니다.** 그 창은 슬롯별 **그림** 목록이고, 챌린지 보상은
 *    **이미 만들어진 아이템**을 가리켜야 한다 — 그림만 같고 가격·획득 경로가 다른
 *    아이템이 여럿일 수 있다 (docs/ARCHITECTURE.md §20.4).
 */
export function RewardItemPicker({ open, value, onClose, onPick }: RewardItemPickerProps) {
  const [q, setQ] = useState('')
  const { data, isPending, error } = useItems({ q: q.trim() || undefined, page: 1, perPage: PER_PAGE })
  const [picked, setPicked] = useState<ChallengeReward | null>(value)
  const [wasOpen, setWasOpen] = useState(open)

  // ⚠️ 창이 열릴 때마다 임시 선택과 검색어를 되돌린다. 「취소」 는 `picked` 를 건드리지
  //    않는데 이 창은 닫혀도 언마운트되지 않아, 되돌리지 않으면 취소한 아이템이
  //    다음에 열어서 「선택」 을 누른 순간 확정된다 (`AssetPicker` 와 같은 함정).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPicked(value)
      setQ('')
    }
  }

  const items = data?.items ?? []

  return (
    <Dialog
      open={open}
      onCancel={onClose}
      onConfirm={() => {
        if (picked) onPick(picked)
        onClose()
      }}
      title="보상 아이템 고르기"
      body="달성했을 때 젬과 함께 지급할 아이템입니다."
      confirmLabel="선택"
    >
      <Input
        value={q}
        onChange={setQ}
        label="아이템 이름"
        placeholder="예: 왕관"
        className={css({ mb: '12px' })}
      />

      {isPending ? (
        <Skeleton rows={3} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : items.length === 0 ? (
        <p className={css({ m: '0', p: '18px 0', textAlign: 'center', textStyle: 'caption', color: 'faint' })}>
          찾는 아이템이 없습니다.
        </p>
      ) : (
        <ul
          className={css({
            listStyle: 'none',
            m: '0',
            p: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxHeight: '280px',
            overflowY: 'auto',
          })}
        >
          {items.map((it) => (
            <li key={it.key}>
              <Row
                item={it}
                on={picked?.assetId === it.assetId && picked?.name === it.name}
                // ⚠️ `assetSrc` 를 함께 담는다 — 버리면 고른 뒤에 그림이 사라진다.
                onPick={() =>
                  setPicked({ assetId: it.assetId, assetSrc: it.assetSrc, name: it.name, slot: it.slot })
                }
              />
            </li>
          ))}
        </ul>
      )}

      {data && data.total > items.length && (
        <p className={css({ m: '10px 0 0', textStyle: 'micro', color: 'faint' })}>
          {data.total}개 중 {items.length}개를 보여 줍니다. 이름으로 좁혀 주세요.
        </p>
      )}
    </Dialog>
  )
}

/**
 * 한 줄.
 *
 * 고른 것을 테두리 색으로만 알리지 않는다 — `aria-pressed` 가 있어야 스크린리더가
 * "눌림" 을 읽는다 (`AssetPicker` 의 타일과 같은 이유).
 */
function Row({ item, on, onPick }: { item: Item; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={css({
        width: 'full',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        p: '7px 9px',
        appearance: 'none',
        font: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: 'md',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: on ? 'pri' : 'transparent',
        bg: on ? 'soft' : 'transparent',
        _hover: { bg: on ? 'soft' : 'hov' },
        _focusVisible: { outline: 'none', boxShadow: '0 0 0 3px token(colors.ring)' },
      })}
    >
      <AssetThumb assetId={item.assetId} src={item.assetSrc} size={32} paid={item.tier === 'PAID'} />
      <span className={css({ flex: '1', minWidth: '0' })}>
        <span
          className={css({
            display: 'block',
            textStyle: 'label',
            fontWeight: '600',
            color: 'ink',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {item.name}
        </span>
        <span className={css({ display: 'block', mt: '1px', textStyle: 'micro', color: 'faint' })}>
          {SLOT_LABEL[item.slot]} · {item.code}
        </span>
      </span>
    </button>
  )
}
