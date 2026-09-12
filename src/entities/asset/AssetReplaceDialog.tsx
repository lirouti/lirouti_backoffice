/**
 * 그림 교체 창 — 고정 집합의 한 줄에 붙는다.
 *
 * **줄이 고정이라고 그림까지 고정인 것은 아니다** (docs/ARCHITECTURE.md §19.3). 성장
 * 4단계와 둥지 3단계는 추가·삭제가 없지만 디자이너가 다시 그린 것은 반영해야 한다 —
 * 그건 줄을 더하는 것이 아니라 **같은 줄의 교체**다.
 *
 * ⚠️ **미리보기는 합성이다.** 파일만 띄우면 둥지는 위쪽이 비어 보여 「잘못 올렸나?」 로
 *    읽힌다 (§41.5). `CompositePreview` 가 제자리에 놓고 보여 준다.
 */
import { useEffect, useState } from 'react'

import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'

import type { AssetKind } from '@/domain/asset'

import { useUploadAsset } from '@/api/assets'

import { AssetPicker } from './AssetPicker'
import { CompositePreview } from './CompositePreview'

type AssetReplaceDialogProps = {
  open: boolean
  onClose: () => void
  kind: AssetKind
  /** 지금 그림의 id — 창을 열 때 여기서 시작한다 */
  assetId: string
  /** 지금 그림의 URL (올린 에셋이면 있다). 없으면 `assetId` 로 빌드 에셋을 찾는다 */
  assetSrc?: string
  /** 「알」 · 「잔가지 둥지」 — 창 제목과 올린 파일의 카탈로그 이름이 된다 */
  name: string
  /** 어디에 놓고 볼 것인가 */
  on: 'background' | 'rig'
  /** 바닥에 깔 배경 (`on === 'background'`) */
  backdropId?: string
  /** 저장. **업로드까지 끝난 뒤** 새 id 로 불린다 */
  onSave: (nextAssetId: string) => void
  /** 바깥 저장이 도는 중인가 */
  saving?: boolean
}

export function AssetReplaceDialog({
  open,
  onClose,
  kind,
  assetId,
  assetSrc,
  name,
  on,
  backdropId,
  onSave,
  saving = false,
}: AssetReplaceDialogProps) {
  const upload = useUploadAsset()
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(assetId)
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  const busy = saving || upload.isPending
  const changed = pending !== null || picked !== assetId
  // 올린 그림은 `blob:` 로, 고른 빌드 에셋은 id 로 그린다 — 둘 다 있어야 빈 칸이 안 된다.
  const previewSrc = pending?.preview ?? (picked === assetId ? assetSrc : undefined)

  /*
    ⚠️ **`blob:` URL 은 손으로 놓아 줘야 한다.** 안 그러면 문서가 살아 있는 동안 계속
       남는다 — 아이템 폼에서 이미 한 번 샜다 (§8.5).
  */
  useEffect(() => {
    if (!pending) return
    return () => URL.revokeObjectURL(pending.preview)
  }, [pending])

  // ⚠️ **창을 닫았다 열면 처음으로 되돌린다.** 취소한 선택이 다음 번에 남아 있으면
  //    운영자는 자기가 안 고른 그림을 저장하게 된다.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPicked(assetId)
      setPending(null)
    }
  }

  const confirm = async () => {
    let next = picked
    if (pending) {
      try {
        const asset = await upload.mutateAsync({ kind, file: pending.file, name })
        next = asset.assetId
      } catch {
        // 오류는 `upload.error` 로 화면에 나온다. 여기서 멈춰야 폼이 그대로 남는다.
        return
      }
    }
    onSave(next)
  }

  return (
    <>
      <Dialog
        open={open}
        onCancel={onClose}
        onConfirm={confirm}
        confirmLabel="교체"
        confirmDisabled={!changed || busy}
        wide
        title={`${name} 그림 교체`}
        body="올린 그림이 제자리에 놓이는지 보고 저장하세요."
      >
        {upload.error && <ErrorBanner message={upload.error.message} />}

        <CompositePreview
          assetId={pending ? undefined : picked}
          src={previewSrc}
          on={on}
          backdropId={backdropId}
          alt={`${name} 미리보기`}
        />

        <div className={css({ display: 'flex', gap: '8px', mt: '12px' })}>
          <Button onClick={() => setPicking(true)} disabled={busy}>
            다른 그림 고르기
          </Button>
          {changed && (
            <Button
              onClick={() => {
                setPicked(assetId)
                setPending(null)
              }}
              disabled={busy}
            >
              되돌리기
            </Button>
          )}
        </div>

        {on === 'rig' && (
          <p className={css({ m: '10px 0 0', textStyle: 'micro', color: 'faint' })}>
            파란 선은 리그 기준선입니다 — 세로는 중심축, 가로는 접지선(§19).
          </p>
        )}
      </Dialog>

      <AssetPicker
        open={picking}
        kind={kind}
        value={picked}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setPicked(id)
          setPending(null)
          setPicking(false)
        }}
        onPickFile={(file) => {
          setPending({ file, preview: URL.createObjectURL(file) })
          setPicking(false)
        }}
      />
    </>
  )
}
