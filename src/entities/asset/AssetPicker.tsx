import { useState } from 'react'

import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { FilePicker } from '@/shared/ui/FilePicker'
import { SkeletonRows } from '@/shared/ui/Skeleton'

import { acceptAttr, assetHint, validateAssetFile, ASSET_SPECS, type AssetKind } from '@/domain/asset'

import { useAssets } from '@/api/assets'

type AssetPickerProps = {
  open: boolean
  /** 이 종류의 에셋만 보여 준다 */
  kind: AssetKind
  /** 지금 고른 것. 창을 열 때 여기서 시작한다 */
  value: string
  onClose: () => void
  onPick: (assetId: string) => void
  /**
   * 새 파일을 골랐다. **아직 올리지 않았다** — 부르는 쪽이 들고 있다가 저장할 때 올린다.
   * 파일을 고르면 확인할 것이 없으므로 창은 곧바로 닫힌다.
   */
  onPickFile: (file: File) => void
}

/**
 * 에셋 고르기 — **있는 것에서 고르거나, 새로 올리거나.**
 *
 * 둘을 한 창에 둔 이유는 운영자가 하려는 일이 하나여서다("이 아이템의 그림을 정한다").
 * 별도의 「에셋 등록」 화면을 만들면 그림을 먼저 등록하고 아이템을 따로 만드는
 * 두 걸음이 된다(docs/ARCHITECTURE.md §8).
 *
 * ⚠️ **종류가 바뀌면 고를 수 있는 것도 바뀐다.** 머리 아이템에 몸 에셋을 붙이면
 *    캐릭터에 겹쳐 그려진다. 그래서 목록을 종류로 거른다.
 */
export function AssetPicker({ open, kind, value, onClose, onPick, onPickFile }: AssetPickerProps) {
  const { data, isPending, error } = useAssets(kind)
  const [fileError, setFileError] = useState<string | null>(null)
  // 창 안에서만 쓰는 임시 선택. 「선택」 을 눌러야 폼에 반영된다.
  const [picked, setPicked] = useState(value)
  const [wasOpen, setWasOpen] = useState(open)

  // ⚠️ **창이 열릴 때마다 임시 선택을 되돌린다.** 「취소」 는 `onClose` 만 부르고
  //    `picked` 를 건드리지 않는데, 이 창은 닫혀도 언마운트되지 않는다. 되돌리지 않으면
  //    취소한 에셋이 남아 있다가 **다음에 열어서 「선택」 을 누른 순간 확정된다.**
  //    렌더 중 조정이라 effect 한 번을 더 돌지 않는다 (React 의 "props 로 state 조정" 패턴).
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPicked(value)
      setFileError(null)
    }
  }

  return (
    <Dialog
      open={open}
      onCancel={onClose}
      onConfirm={() => {
        onPick(picked)
        onClose()
      }}
      title="에셋 고르기"
      body="있는 것에서 고르거나 새 파일을 올립니다."
      confirmLabel="선택"
    >
      <FilePicker
        label="새 이미지 올리기"
        accept={acceptAttr(ASSET_SPECS[kind])}
        hint={assetHint(ASSET_SPECS[kind])}
        error={fileError ?? undefined}
        onPick={(file) => {
          const invalid = validateAssetFile(file, ASSET_SPECS[kind])
          setFileError(invalid)
          if (invalid) return
          onPickFile(file)
          onClose()
        }}
        className={css({ mb: '14px' })}
      />

      {isPending ? (
        <SkeletonRows rows={2} />
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
