/**
 * 챌린지 등록·수정 — **한 화면이다.** `chalId` 유무로 갈린다.
 *
 * 아이템 폼(docs/ARCHITECTURE.md §18.7)과 같은 골격이다: 검증은 도메인 한 곳, 체크리스트도 그 결과로 그린다.
 */
import { useState } from 'react'

import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { Textarea } from '@/shared/ui/Textarea'

import {
  CHALLENGE_CONDS,
  CHALLENGE_KIND_LABEL,
  CHALLENGE_KINDS,
  emptyChallengeInput,
  REPEAT_LABEL,
  rewardLabel,
  toChallengeInput,
  validateChallenge,
  type ChallengeInput,
  type ChallengeKind,
} from '@/domain/challenge'
import { SCREENS } from '@/domain/screens'

import { useChallenge, useSaveChallenge } from '@/api/challenges'

import { useUnsavedGuard } from '@/stores/dirtyStore'

import { RewardItemPicker } from './RewardItemPicker'

const KIND_OPTIONS = CHALLENGE_KINDS.map((k) => ({ value: k, label: CHALLENGE_KIND_LABEL[k] }))

/** 「없음」 은 보상 아이템을 안 붙인다는 뜻이다 — 값이 아니라 선택지 하나로 둔다 */
const NO_ITEM = '없음'

export default function ChallengeFormPage() {
  const { chalId } = useParams()
  // 수정이면 원본을 받아 초기값으로 쓴다. 등록이면 부르지 않는다.
  const existing = useChallenge(chalId ?? '')

  if (!chalId) return <ChallengeForm key="new" initial={emptyChallengeInput()} />
  if (existing.isPending) return <Skeleton rows={6} />
  if (existing.error || !existing.data) {
    return <ErrorBanner message={existing.error?.message ?? '챌린지를 불러오지 못했습니다.'} />
  }
  // ⚠️ `key` 로 `chalId` 가 바뀌면 반드시 새로 마운트한다 — 초기값을 한 번만 읽으므로
  //    A 의 입력으로 B 를 저장하게 될 수 있다 (`ItemFormPage` 와 같은 이유).
  return (
    <ChallengeForm key={chalId} chalId={chalId} initial={toChallengeInput(existing.data.challenge)} />
  )
}

function ChallengeForm({ chalId, initial }: { chalId?: string; initial: ChallengeInput }) {
  const navigate = useNavigate()
  const save = useSaveChallenge()
  const [input, setInput] = useState<ChallengeInput>(initial)
  const [touched, setTouched] = useState(false)
  const markSaved = useUnsavedGuard(touched)

  const errors = validateChallenge(input)
  const blocked = Object.keys(errors).length > 0
  // 손대기 전에는 빨갛게 하지 않는다 — 무엇이 남았는지는 오른쪽 체크리스트가 말한다.
  const shown = touched ? errors : {}

  const set = <K extends keyof ChallengeInput>(k: K, v: ChallengeInput[K]) => {
    setTouched(true)
    setInput((prev) => ({ ...prev, [k]: v }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (blocked) return
    save.mutate(
      { chalId, input },
      {
        onSuccess: (c) => {
          // ⚠️ 표시를 지금 지운다 — 아래 `navigate` 를 이동 가드가 막지 않게.
          markSaved()
          navigate(SCREENS.chaldet.path.replace(':chalId', String(c.key)))
        },
      },
    )
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={chalId ? '챌린지 수정' : '챌린지 등록'}
        sub="달성 조건과 보상을 정합니다. 주기가 반복 규칙을 결정합니다."
      />

      {save.error && <ErrorBanner message={save.error.message} />}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <div className={css({ flex: '3 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Card className={css({ p: '17px 20px' })}>
            <CardTitle title="챌린지 정보" />
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '14px', mt: '14px' })}>
              <Input
                value={input.title}
                onChange={(v) => set('title', v)}
                label="제목"
                placeholder="예: 오늘 출석하기"
                error={shown.title}
                required
              />

              <Segmented
                value={input.kind}
                onChange={(v) => set('kind', v as ChallengeKind)}
                options={KIND_OPTIONS}
                aria-label="주기"
              />
              {/* 주기를 고르면 반복 규칙이 정해진다 — 따로 입력받지 않는다 */}
              <p className={css({ m: '-6px 0 0', textStyle: 'micro', color: 'faint' })}>
                반복 규칙: {REPEAT_LABEL[input.kind]}
              </p>

              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px' })}>
                <Select
                  value={input.cond}
                  onChange={(v) => set('cond', v)}
                  options={CHALLENGE_CONDS}
                  label="조건"
                  error={shown.cond}
                  className={css({ flex: '1 1 200px' })}
                />
                <Input
                  value={String(input.goal)}
                  onChange={(v) => set('goal', Number(v.replace(/\D/g, '')) || 0)}
                  label="목표치"
                  error={shown.goal}
                  required
                  className={css({ flex: '1 1 140px' })}
                />
                <Input
                  value={String(input.gem)}
                  onChange={(v) => set('gem', Number(v.replace(/\D/g, '')) || 0)}
                  label="젬 보상"
                  suffix="젬"
                  error={shown.gem}
                  className={css({ flex: '1 1 140px' })}
                />
              </div>

              <Textarea
                value={input.desc}
                onChange={(v) => set('desc', v)}
                label="설명"
                placeholder="예: 오늘 출석하기 챌린지입니다. 달성 시 보상이 즉시 지급됩니다."
                rows={2}
              />
            </div>
          </Card>

          <Card className={css({ p: '17px 20px' })}>
            <CardTitle title="운영 기간" sub="비워 두면 제한 없음" />
            <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
              <Input
                type="date"
                value={input.startAt}
                onChange={(v) => set('startAt', v)}
                label="시작"
                className={css({ flex: '1 1 180px' })}
              />
              <Input
                type="date"
                value={input.endAt}
                onChange={(v) => set('endAt', v)}
                label="종료"
                error={shown.endAt}
                className={css({ flex: '1 1 180px' })}
              />
            </div>
          </Card>

          <RewardCard input={input} onChange={(v) => set('rewardItem', v)} />
        </div>

        <SideCard input={input} errors={errors} />
      </div>

      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: '18px' })}>
        <Button type="button" onClick={() => navigate(SCREENS.chal.path)}>
          취소
        </Button>
        <Button type="submit" variant="primary" disabled={blocked || save.isPending}>
          {save.isPending ? '저장 중…' : chalId ? '수정' : '등록'}
        </Button>
      </div>
    </form>
  )
}

/**
 * 보상 아이템 칸.
 *
 * ⚠️ **여기서 고르는 것은 아이템이지 에셋이 아니다** — `RewardItemPicker` 가 그 이유를
 *    갖고 있다. 이 카드는 지금 값을 보이고 창을 여는 일만 한다.
 */
function RewardCard({
  input,
  onChange,
}: {
  input: ChallengeInput
  onChange: (v: ChallengeInput['rewardItem']) => void
}) {
  const [picking, setPicking] = useState(false)

  return (
    <Card className={css({ p: '17px 20px' })}>
      <CardTitle title="보상 아이템" sub="젬과 함께 줄 아이템입니다. 없으면 젬만 지급됩니다." />
      <div className={css({ display: 'flex', alignItems: 'center', gap: '12px', mt: '14px', flexWrap: 'wrap' })}>
        {input.rewardItem ? (
          <>
            <AssetThumb
              assetId={input.rewardItem.assetId}
              src={input.rewardItem.assetSrc}
              size={44}
              alt={input.rewardItem.name}
            />
            <span className={css({ flex: '1', minWidth: '0', textStyle: 'body', fontWeight: '600', color: 'ink' })}>
              {input.rewardItem.name}
            </span>
            <Button onClick={() => setPicking(true)}>바꾸기</Button>
            <Button onClick={() => onChange(null)}>{NO_ITEM}으로</Button>
          </>
        ) : (
          <>
            <p className={css({ flex: '1', m: '0', textStyle: 'caption', color: 'faint' })}>
              아이템 보상이 없습니다. 젬만 지급됩니다.
            </p>
            <Button onClick={() => setPicking(true)}>아이템 고르기</Button>
          </>
        )}
      </div>

      <RewardItemPicker
        open={picking}
        value={input.rewardItem}
        onClose={() => setPicking(false)}
        onPick={onChange}
      />
    </Card>
  )
}

/** 체크리스트. **`validateChallenge` 의 결과로 그린다** — 규칙이 갈라지면 안 된다 */
function SideCard({
  input,
  errors,
}: {
  input: ChallengeInput
  errors: ReturnType<typeof validateChallenge>
}) {
  const checks = [
    { ok: !errors.title, label: errors.title ?? '제목 입력됨' },
    { ok: !errors.cond, label: errors.cond ?? '조건 선택됨' },
    { ok: !errors.goal, label: errors.goal ?? '목표치 설정됨' },
    { ok: !errors.gem, label: errors.gem ?? '보상 확인됨' },
    { ok: !errors.endAt, label: errors.endAt ?? '기간 확인됨' },
  ]

  return (
    <Card className={css({ flex: '1 1 300px', minWidth: '260px', maxWidth: '380px', p: '15px' })}>
      <CardTitle title="요약" />
      <dl className={css({ m: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' })}>
        <SummaryRow k="주기" v={CHALLENGE_KIND_LABEL[input.kind]} />
        <SummaryRow k="조건" v={`${input.cond} ${input.goal}회`} />
        <SummaryRow k="보상" v={rewardLabel(input)} />
      </dl>

      <ul className={css({ listStyle: 'none', m: '14px 0 0', p: '0', display: 'flex', flexDirection: 'column', gap: '7px' })}>
        {checks.map((c) => (
          <li key={c.label} className={css({ display: 'flex', alignItems: 'center', gap: '7px' })}>
            <span aria-hidden="true" className={css({ flex: 'none', color: c.ok ? 'gFg' : 'faint2' })}>
              {c.ok ? '●' : '○'}
            </span>
            <span className={css({ textStyle: 'caption', color: c.ok ? 'sub' : 'faint' })}>{c.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '48px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd className={css({ m: '0', flex: '1', minWidth: '0', textAlign: 'right', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
        {v}
      </dd>
    </div>
  )
}
