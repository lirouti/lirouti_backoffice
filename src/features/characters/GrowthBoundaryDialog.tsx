/**
 * 성장 단계 기준 일수 수정.
 *
 * **고치는 것은 경계 둘뿐이다.** 알은 언제나 0일차부터라 경계가 아니고, 「금」 은 날짜 축에
 * 없다 — 사건(부화)으로 끝나는 단계다 (docs/ARCHITECTURE.md §42.2).
 *
 * ⚠️ **저장될 값을 미리 보여 준다.** 경계 하나를 옮기면 **두 단계의 소요가 함께** 바뀌는데,
 *    숫자만 받으면 운영자는 무엇이 달라지는지 모른 채 저장하게 된다 (§31.4 와 같은 규율).
 */
import { useState } from 'react'

import { css } from 'styled-system/css'

import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'

import {
  applyBoundaries,
  validateBoundaries,
  withSpans,
  type GrowthBoundaries,
  type GrowthStage,
} from '@/domain/growth'

import { useSaveBoundaries, useStages } from '@/api/growth'

type GrowthBoundaryDialogProps = {
  open: boolean
  onClose: () => void
  initial: GrowthBoundaries
}

export function GrowthBoundaryDialog({ open, onClose, initial }: GrowthBoundaryDialogProps) {
  const { data } = useStages()
  const save = useSaveBoundaries()
  const [value, setValue] = useState(initial)
  const [wasOpen, setWasOpen] = useState(open)

  const errors = validateBoundaries(value)
  const invalid = Object.keys(errors).length > 0
  // 저장될 값 그대로를 미리 만든다 — 화면이 따로 계산하면 저장 결과와 갈린다.
  const preview = withSpans(applyBoundaries(data ?? [], value))

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
      title="성장 기준 일수"
      body="알은 0일차부터입니다. 유체와 성체가 시작되는 날을 정하세요."
    >
      {save.error && <ErrorBanner message={save.error.message} />}

      <div className={css({ display: 'flex', flexDirection: 'column', gap: '11px' })}>
        <Input
          label="유체 시작일"
          type="number"
          min={1}
          value={String(value.juvenileFrom)}
          error={errors.juvenileFrom}
          onChange={(v) => setValue({ ...value, juvenileFrom: Number(v) })}
        />
        <Input
          label="성체 시작일"
          type="number"
          min={2}
          value={String(value.adultFrom)}
          error={errors.adultFrom}
          onChange={(v) => setValue({ ...value, adultFrom: Number(v) })}
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
          {preview.map(({ stage, span }) => (
            <Line key={stage.assetId} stage={stage} span={span} invalid={invalid} />
          ))}
        </ul>
      </div>

      <p className={css({ m: '11px 0 0', textStyle: 'micro', color: 'faint' })}>
        「금」 은 부화 직전의 짧은 연출이라 날짜로 끝나지 않습니다 — 기준 일수가 없습니다.
      </p>
    </Dialog>
  )
}

/** ⚠️ 값이 틀린 동안에는 흐리게 둔다 — 말이 안 되는 기간을 사실처럼 보여 주지 않는다 */
function Line({
  stage,
  span,
  invalid,
}: {
  stage: GrowthStage
  span: string
  invalid: boolean
}) {
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
      <span className={css({ flex: 'none', width: '72px', color: 'ink', fontWeight: '600' })}>
        {stage.name}
      </span>
      <span className={css({ color: 'sub', fontVariantNumeric: 'tabular-nums' })}>{span}</span>
    </li>
  )
}
