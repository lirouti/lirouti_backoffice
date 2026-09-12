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

import { useAssets, useUploadAsset } from '@/api/assets'

import { AssetPicker } from './AssetPicker'
import { CompositePreview } from './CompositePreview'

type AssetReplaceDialogProps = {
  open: boolean
  onClose: () => void
  kind: AssetKind
  /** 지금 그림의 id — 창을 열 때 여기서 시작한다 */
  assetId: string
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
  name,
  on,
  backdropId,
  onSave,
  saving = false,
}: AssetReplaceDialogProps) {
  const { data: catalog } = useAssets(kind)
  const upload = useUploadAsset()
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState(assetId)
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null)
  const [uploaded, setUploaded] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  const busy = saving || upload.isPending
  const changed = pending !== null || picked !== assetId
  /*
    ⚠️ **카탈로그에서 URL 을 찾는다.** `AssetPicker` 는 id 만 넘겨 주는데, **올린 에셋은
       빌드에 없어 id 로 못 찾는다**(§8.5) — `IMAGES` 만 보면 이미 올려 둔 그림을 골랐을 때
       미리보기가 빈 칸이 되고, 그런데도 「교체」 는 눌린다. 빌드 에셋은 `CompositePreview`
       가 `assetId` 로 찾으므로 여기서는 카탈로그만 보면 된다.
  */
  const previewSrc =
    pending?.preview ?? catalog?.find((a) => a.assetId === picked)?.src ?? undefined

  /*
    ⚠️ **`blob:` URL 은 손으로 놓아 줘야 한다.** 안 그러면 문서가 살아 있는 동안 계속
       남는다 — 아이템 폼에서 이미 한 번 샜다 (§8.5).
  */
  useEffect(() => {
    if (!pending) return
    return () => URL.revokeObjectURL(pending.preview)
  }, [pending])

  // ⚠️ **창을 닫았다 열면 처음으로 되돌린다.** 취소한 선택이 다음 번에 남아 있으면
  //    운영자는 자기가 안 고른 그림을 저장하게 된다. **지난 오류도 함께 지운다** —
  //    안 그러면 다음에 열었을 때 손대지도 않은 입력 위에 옛 오류가 떠 있다.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPicked(assetId)
      setPending(null)
      setUploaded(null)
      upload.reset()
    }
  }

  /*
    ⚠️ **한 번 올린 파일을 다시 올리지 않는다.** 업로드는 됐는데 저장이 실패하면 창이 그대로
       남는데, 그때 다시 누르면 같은 파일이 카탈로그에 한 번 더 들어간다 — 마지막 것만
       쓰이고 나머지는 **주인 없는 그림**으로 남는다(`api/assets.ts` 가 경고하는 그것).
       올린 id 를 들고 있다가 재시도에서는 그대로 쓴다.
  */
  const confirm = async () => {
    let next = picked
    if (pending) {
      if (uploaded) next = uploaded
      else
        try {
          const asset = await upload.mutateAsync({ kind, file: pending.file, name })
          setUploaded(asset.assetId)
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
          setUploaded(null)
          setPicking(false)
        }}
        onPickFile={(file) => {
          setPending({ file, preview: URL.createObjectURL(file) })
          // 다른 파일을 고르면 앞서 올린 것은 이 창의 결과가 아니다.
          setUploaded(null)
          setPicking(false)
        }}
      />
    </>
  )
}
