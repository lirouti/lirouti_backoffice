import { useState } from 'react'

import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Dialog } from '@/shared/ui/Dialog'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'

import type { Slot } from '@/domain/item'

import { useAssets } from '@/api/items'

type AssetPickerProps = {
  open: boolean
  /** 이 슬롯에 붙는 에셋만 보여 준다 */
  slot: Slot
  /** 지금 고른 것. 창을 열 때 여기서 시작한다 */
  value: string
  onClose: () => void
  onPick: (assetId: string) => void
}

/**
 * 에셋 고르기.
 *
 * **올리는 것이 아니라 고르는 것**이다 — 우리 에셋은 빌드 때 들어오는 SVG 묶음이라
 * 목록이 정해져 있다(docs/ARCHITECTURE.md §8). 업로드는 서버가 생겨야 하고, 그때까지도 이 창은 남는다.
 *
 * ⚠️ **슬롯이 바뀌면 고를 수 있는 것도 바뀐다.** 머리 아이템에 몸 에셋을 붙이면
 *    캐릭터에 겹쳐 그려진다. 그래서 목록을 슬롯으로 거른다.
 */
export function AssetPicker({ open, slot, value, onClose, onPick }: AssetPickerProps) {
  const { data, isPending, error } = useAssets(slot)
  // 창 안에서만 쓰는 임시 선택. 「선택」 을 눌러야 폼에 반영된다.
  const [picked, setPicked] = useState(value)

  return (
    <Dialog
      open={open}
      onCancel={onClose}
      onConfirm={() => {
        onPick(picked)
        onClose()
      }}
      title="에셋 고르기"
      body="이 슬롯에 붙일 수 있는 에셋입니다."
      confirmLabel="선택"
    >
      {isPending ? (
        <Skeleton rows={2} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <ul
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: '8px',
            listStyle: 'none',
            m: '0',
            p: '2px',
            maxHeight: '300px',
            overflowY: 'auto',
          })}
        >
          {(data ?? []).map((a) => (
            <li key={a.assetId}>
              <Tile asset={a} on={a.assetId === picked} onPick={() => setPicked(a.assetId)} />
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}

/**
 * 타일 하나.
 *
 * 고른 것을 **테두리 색으로만** 알리지 않는다 — `aria-pressed` 가 있어야 스크린리더가
 * "눌림" 을 읽는다. 라디오로 안 만든 이유는 창을 닫아야 확정되기 때문이다.
 */
function Tile({ asset, on, onPick }: { asset: { assetId: string; name: string; paid: boolean }; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onPick}
      className={css({
        width: 'full',
        display: 'block',
        appearance: 'none',
        p: '0',
        font: 'inherit',
        textAlign: 'center',
        bg: 'surf',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: on ? 'pri' : 'bd',
        borderRadius: 'lg',
        overflow: 'hidden',
        cursor: 'pointer',
        _hover: { borderColor: on ? 'pri' : 'faint2' },
        _focusVisible: { outline: 'none', borderColor: 'ringBd', boxShadow: '0 0 0 3px token(colors.ring)' },
      })}
    >
      <AssetThumb assetId={asset.assetId} fluid paid={asset.paid} />
      <span
        className={css({
          display: 'block',
          p: '5px 4px 6px',
          textStyle: 'micro',
          fontWeight: on ? '700' : '500',
          color: on ? 'priD' : 'sub',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        })}
      >
        {asset.name}
      </span>
    </button>
  )
}
