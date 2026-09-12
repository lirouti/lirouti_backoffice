/**
 * 둥지 해금 일수 수정.
 *
 * **고치는 것은 경계 둘뿐이다.** 첫 둥지는 언제나 1일차부터라 경계가 아니고, 표시되는
 * 구간(`누적 1–29일` …)은 전부 경계에서 나온다 (docs/ARCHITECTURE.md §41.4).
 *
 * ⚠️ **저장될 값을 미리 보여 준다.** 경계 하나를 옮기면 **세 줄의 표시가 함께** 바뀌는데,
 *    숫자만 받으면 운영자는 무엇이 달라지는지 모른 채 저장하게 된다 (§31.4 와 같은 규율).
 */
import { useState } from 'react'

import { css } from 'styled-system/css'

import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'

import {
  applyNestBoundaries,
  validateNestBoundaries,
  withUnlocks,
  type Nest,
  type NestBoundaries,
} from '@/domain/nest'

import { useNests, useSaveNestBoundaries } from '@/api/backgrounds'

type NestBoundaryDialogProps = {
  open: boolean
  onClose: () => void
  initial: NestBoundaries
}

export function NestBoundaryDialog({ open, onClose, initial }: NestBoundaryDialogProps) {
  const { data } = useNests()
  const save = useSaveNestBoundaries()
  const [value, setValue] = useState(initial)
  const [wasOpen, setWasOpen] = useState(open)

  const errors = validateNestBoundaries(value)
  const invalid = Object.keys(errors).length > 0
  // 저장될 값 그대로를 미리 만든다 — 화면이 따로 계산하면 저장 결과와 갈린다.
  const preview = withUnlocks(applyNestBoundaries(data ?? [], value))

  // 취소한 입력이 다음 번에 남아 있으면 안 고친 값을 저장하게 된다.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setValue(initial)
  }

  return (
    <Dialog
      open={open}
      onCancel={onClose}
      onConfirm={() => save.mutate(value, { onSuccess: onClose })}
      confirmLabel="저장"
      confirmDisabled={invalid || save.isPending}
      wide
      title="둥지 해금 일수"
      body="첫 둥지는 1일차부터입니다. 나머지 둘이 열리는 날을 정하세요."
    >
      {save.error && <ErrorBanner message={save.error.message} />}

      <div className={css({ display: 'flex', flexDirection: 'column', gap: '11px' })}>
        <Input
          label="두 번째 둥지 해금일"
          type="number"
          min={2}
          value={String(value.secondFrom)}
          error={errors.secondFrom}
          onChange={(v) => setValue({ ...value, secondFrom: Number(v) })}
        />
        <Input
          label="세 번째 둥지 해금일"
          type="number"
          min={3}
          value={String(value.thirdFrom)}
          error={errors.thirdFrom}
          onChange={(v) => setValue({ ...value, thirdFrom: Number(v) })}
        />
      </div>

      <div className={css({ mt: '15px' })}>
        <div className={css({ textStyle: 'caption', fontWeight: '700', color: 'sub' })}>
          이렇게 저장됩니다
        </div>
        <ul
          className={css({
            listStyle: 'none',
            m: '7px 0 0',
            p: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          })}
        >
          {preview.map(({ nest, unlock }) => (
            <Line key={nest.assetId} nest={nest} unlock={unlock} invalid={invalid} />
          ))}
        </ul>
      </div>
    </Dialog>
  )
}

/** ⚠️ 값이 틀린 동안에는 흐리게 둔다 — 말이 안 되는 구간을 사실처럼 보여 주지 않는다 */
function Line({ nest, unlock, invalid }: { nest: Nest; unlock: string; invalid: boolean }) {
  return (
    <li
      className={css({
        display: 'flex',
        alignItems: 'baseline',
        gap: '9px',
        textStyle: 'caption',
      })}
      style={{ opacity: invalid ? 0.45 : 1 }}
    >
      <span className={css({ flex: 'none', width: '96px', color: 'ink', fontWeight: '600' })}>
        {nest.name}
      </span>
      <span className={css({ color: 'sub', fontVariantNumeric: 'tabular-nums' })}>
        {unlock}
      </span>
    </li>
  )
}
