/**
 * 아이템 등록·수정. **첫 폼 화면이라 나머지 폼들의 본이 된다** (docs/ARCHITECTURE.md §18.8).
 *
 * 선택지 목록과 필드가 길어 파일 머리말을 따로 둔다 — 컴포넌트 주석이 30줄 밖이다.
 */
import { useEffect, useState } from 'react'

import { useForm, type FieldPath, type FieldPathValue, type UseFormReturn } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { EmptyState, Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { Switch } from '@/shared/ui/Switch'
import { Textarea } from '@/shared/ui/Textarea'

import {
  emptyItemInput,
  ITEM_SOURCE_LABEL,
  SLOT_LABEL,
  SLOT_ORDER,
  TIER_LABEL,
  toItemInput,
  validateItem,
  type ItemFlags,
  type ItemInput,
  type ItemSource,
  type Slot,
  type Tier,
} from '@/domain/item'
import { SCREENS } from '@/domain/screens'

import { useAssets, useItem, useSaveItem } from '@/api/items'

import { useUnsavedGuard } from '@/stores/dirtyStore'

import { AssetPicker } from './AssetPicker'
import { restoreDraft } from './draft'
import { useItemDraft } from './useItemDraft'

const SLOT_OPTIONS: { value: Slot; label: string }[] = SLOT_ORDER.map((s) => ({
  value: s,
  label: SLOT_LABEL[s],
}))

const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: 'FREE', label: TIER_LABEL.FREE },
  { value: 'PAID', label: TIER_LABEL.PAID },
]

const SOURCE_OPTIONS = (Object.keys(ITEM_SOURCE_LABEL) as ItemSource[]).map((s) => ({
  value: s,
  label: ITEM_SOURCE_LABEL[s],
}))

/** 원본의 `seasonOpts`. 시즌은 아직 도메인 개념이 아니라 문자열이다. */
const SEASON_OPTIONS = ['상시', '시즌 2', '시즌 3', '시즌 4']

/**
 * 칸 하나를 바꾸고 **더러움 표시를 켠다.**
 *
 * `setValue` 는 기본으로 `shouldDirty` 를 켜지 않는다 — 그러면 미저장 경고도
 * 임시 저장도 동작하지 않는다. 열 곳에서 매번 붙이는 대신 여기서 한 번 감싼다.
 * (우리 입력 컴포넌트가 `value`/`onChange` 계약이라 `register` 를 못 쓴다.)
 */
const setter =
  (form: UseFormReturn<ItemInput>) =>
  <K extends FieldPath<ItemInput>>(k: K, value: FieldPathValue<ItemInput, K>) =>
    form.setValue(k, value, { shouldDirty: true })

/** 진열·유통 스위치 셋. 라벨과 설명이 원본의 `flags` 배열과 같다. */
const FLAGS: { key: keyof ItemFlags; label: string; hint: string }[] = [
  { key: 'shop', label: '상점 노출', hint: '상점 첫 화면에 진열합니다' },
  { key: 'gacha', label: '가챠 포함', hint: '확률 뽑기 풀에 넣습니다' },
  { key: 'gift', label: '선물 가능', hint: '유저 간 선물을 허용합니다' },
]

export default function ItemFormPage() {
  const { itemId } = useParams()
  // 수정이면 원본을 받아 초기값으로 쓴다. 등록이면 부르지 않는다.
  const existing = useItem(itemId ?? '')

  if (!itemId) return <ItemForm initial={emptyItemInput()} />
  if (existing.isPending) return <Skeleton rows={6} />
  if (existing.error || !existing.data) {
    return <ErrorBanner message={existing.error?.message ?? '아이템을 불러오지 못했습니다.'} />
  }
  return <ItemForm itemId={itemId} initial={toItemInput(existing.data.item)} />
}

/**
 * 폼 본체.
 *
 * 초기값이 준비된 뒤에 마운트되도록 **바깥에서 갈라 둔다** — `useForm` 의
 * `defaultValues` 는 나중에 바뀌어도 반영되지 않아서, 수정 화면에서 빈 폼이 뜬다.
 */
function ItemForm({ itemId, initial }: { itemId?: string; initial: ItemInput }) {
  const navigate = useNavigate()
  const save = useSaveItem()
  // 폼을 만들기 **전에** 읽는다. 만든 뒤에는 기본값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(itemId ?? 'new'))
  // ⚠️ **알림의 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정되므로
  //    「새로 시작」 으로 초안을 버려도 계속 참이고, 알림이 지워지지 않는다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  const form = useForm<ItemInput>({ defaultValues: initial })
  const draft = useItemDraft(itemId ?? 'new', form)
  // 임시 저장은 등록이 아니다 — 초안이 있어도 폼이 더러우면 경고를 켠다.
  const markSaved = useUnsavedGuard(form.formState.isDirty)

  const values = form.watch()
  const errors = validateItem(values)
  const blocked = Object.keys(errors).length > 0
  // ⚠️ **손대기 전에는 빨갛게 하지 않는다.** 빈 폼을 열자마자 "아이템명을 입력하세요" 가
  //    붉게 뜨면 아직 아무것도 안 했는데 혼난 기분이 든다. 무엇이 남았는지는
  //    오른쪽 체크리스트가 말하고, 필드 오류는 고칠 대상이 생긴 뒤에 붙는다.
  const shown = form.formState.isDirty ? errors : {}

  // ⚠️ **기본값은 원본으로 두고 값만 갈아 끼운다**(`keepDefaultValues`). 초안을
  //    기본값으로 넣으면 폼이 "깨끗하다" 고 여겨 미저장 경고도 자동 저장도 안 돈다 —
  //    되살려 놓고는 다음 새로고침에 또 잃는다.
  useEffect(() => {
    if (restored) form.reset(restored, { keepDefaultValues: true })
  }, [restored, form])

  const submit = form.handleSubmit((input) => {
    save.mutate(
      { itemId, input },
      {
        onSuccess: (item) => {
          // 초안은 저장에 성공한 뒤에 지운다. 실패했는데 지우면 쓰던 게 사라진다.
          draft.clear()
          form.reset(input)
          // ⚠️ **표시를 지금 지운다.** `reset` 만으로는 다음 effect 에서야 스토어에 닿아,
          //    바로 아래 `navigate` 를 이동 가드가 막고 방금 저장한 사람에게
          //    "저장하지 않고 이동할까요?" 를 묻는다.
          markSaved()
          navigate(SCREENS.item.path.replace(':itemId', String(item.key)))
        },
      },
    )
  })

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={itemId ? '아이템 수정' : '아이템 등록'}
        sub="상점과 도감에 노출되는 정보입니다. 슬롯이 독립이라 어느 캐릭터에나 그대로 적용됩니다."
      />

      {save.error && <ErrorBanner message={save.error.message} />}
      {noticeOpen && (
        <RestoredNotice
          onDiscard={() => {
            draft.clear()
            // 등록이면 빈 폼, 수정이면 저장돼 있던 값으로 되돌린다.
            form.reset(initial)
            setNoticeOpen(false)
          }}
        />
      )}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <div className={css({ flex: '3 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <BasicsCard form={form} errors={shown} />
          <VisibilityCard form={form} errors={shown} />
        </div>

        <SideCard
          input={values}
          errors={errors}
          onPick={(assetId) => form.setValue('assetId', assetId, { shouldDirty: true })}
        />
      </div>

      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: '16px' })}>
        <Button onClick={() => navigate(SCREENS.items.path)}>취소</Button>
        <Button onClick={draft.saveNow} disabled={!form.formState.isDirty}>
          임시 저장
        </Button>
        <Button type="submit" variant="primary" disabled={blocked || save.isPending}>
          {save.isPending ? '저장 중…' : itemId ? '수정' : '등록'}
        </Button>
      </div>

      {draft.savedAt && (
        <p
          // 방금 무슨 일이 있었는지 조용히 알린다. 저장은 사용자가 누른 것이라 alert 는 과하다.
          aria-live="polite"
          className={css({ m: '8px 0 0', textAlign: 'right', textStyle: 'caption', color: 'faint' })}
        >
          임시 저장됨
        </p>
      )}
    </form>
  )
}

function RestoredNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div
      role="status"
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        p: '10px 14px',
        mb: '14px',
        bg: 'warnBg',
        border: '1px solid token(colors.warnBd)',
        borderRadius: 'lg',
        textStyle: 'label',
        color: 'warnFg',
      })}
    >
      <span className={css({ flex: '1' })}>임시 저장된 내용을 불러왔습니다.</span>
      <Button size="sm" onClick={onDiscard}>
        새로 시작
      </Button>
    </div>
  )
}

function BasicsCard({ form, errors }: { form: UseFormReturn<ItemInput>; errors: ReturnType<typeof validateItem> }) {
  const v = form.watch()
  const set = setter(form)

  return (
    <Card className={css({ p: '17px 20px' })}>
      <CardTitle title="기본 정보" />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: '14px', mt: '14px' })}>
        <Input
          value={v.name}
          onChange={(name) => set('name', name)}
          label="아이템명"
          placeholder="예: 성좌의 로브"
          error={errors.name}
          required
        />

        <Segmented
          value={v.slot}
          // ⚠️ **슬롯을 바꾸면 에셋도 비운다.** 고를 수 있는 목록이 슬롯으로 걸러지는데,
          //    이전 슬롯의 `assetId` 가 남으면 미리보기에는 그 그림이 그대로 뜨고
          //    이름은 「없음」 이 되며, `validateItem` 은 값이 있으니 통과시킨다 —
          //    머리 아이템에 몸 에셋이 붙은 채로 저장된다.
          onChange={(slot) => {
            set('slot', slot)
            set('assetId', '')
          }}
          options={SLOT_OPTIONS}
          aria-label="슬롯"
        />
        <Segmented
          value={v.tier}
          onChange={(tier) => set('tier', tier)}
          options={TIER_OPTIONS}
          aria-label="등급"
        />

        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px' })}>
          <Input
            value={String(v.price)}
            onChange={(price) => set('price', Number(price.replace(/[^\d]/g, '')) || 0)}
            label="가격"
            suffix="젬"
            placeholder="0 이면 무료"
            inputMode="numeric"
            error={errors.price}
            className={css({ flex: '0 1 200px' })}
          />
          <Select
            value={v.source}
            onChange={(source) => set('source', source as ItemSource)}
            options={SOURCE_OPTIONS}
            label="획득 경로"
            className={css({ flex: '0 1 200px' })}
          />
          <Select
            value={v.season}
            onChange={(season) => set('season', season)}
            options={SEASON_OPTIONS}
            label="시즌"
            className={css({ flex: '0 1 160px' })}
          />
        </div>

        <Textarea
          value={v.sub}
          onChange={(sub) => set('sub', sub)}
          label="설명"
          placeholder="상점과 도감에 노출되는 한 줄 설명"
        />
      </div>
    </Card>
  )
}

function VisibilityCard({ form, errors }: { form: UseFormReturn<ItemInput>; errors: ReturnType<typeof validateItem> }) {
  const v = form.watch()
  const set = setter(form)

  return (
    <Card className={css({ p: '17px 20px' })}>
      <CardTitle title="노출 설정" sub="비워 두면 제한 없음" />
      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
        <Input
          value={v.visibleFrom}
          onChange={(d) => set('visibleFrom', d)}
          label="노출 시작"
          type="date"
          className={css({ flex: '0 1 200px' })}
        />
        <Input
          value={v.visibleTo}
          onChange={(d) => set('visibleTo', d)}
          label="노출 종료"
          type="date"
          error={errors.visibleTo}
          className={css({ flex: '0 1 200px' })}
        />
      </div>

      <div className={css({ display: 'flex', flexDirection: 'column', gap: '13px', mt: '16px' })}>
        {FLAGS.map((f) => (
          <Switch
            key={f.key}
            checked={v.flags[f.key]}
            onChange={(on) => set('flags', { ...v.flags, [f.key]: on })}
            label={f.label}
            hint={f.hint}
          />
        ))}
      </div>
    </Card>
  )
}

/**
 * 미리보기 + 체크리스트.
 *
 * ⚠️ **체크리스트는 `validateItem` 의 결과로 그린다.** 원본은 여기서 따로 계산했는데,
 *    그러면 체크는 초록인데 저장이 막히는 화면이 만들어진다.
 */
function SideCard({
  input,
  errors,
  onPick,
}: {
  input: ItemInput
  errors: ReturnType<typeof validateItem>
  onPick: (assetId: string) => void
}) {
  const assets = useAssets(input.slot)
  const [picking, setPicking] = useState(false)

  const current = assets.data?.find((a) => a.assetId === input.assetId)
  const checks = [
    { ok: !errors.name, label: errors.name ?? '아이템명 입력됨' },
    { ok: !errors.assetId, label: errors.assetId ?? '에셋 선택됨' },
    { ok: !errors.price, label: errors.price ?? '가격 설정 완료' },
    { ok: !errors.visibleTo, label: errors.visibleTo ?? '노출 기간 확인됨' },
  ]

  return (
    <Card className={css({ flex: '1 1 300px', minWidth: '260px', maxWidth: '380px', p: '15px' })}>
      <CardTitle title="착용 미리보기" />
      <div className={css({ mt: '12px' })}>
        {input.assetId ? (
          <AssetThumb assetId={input.assetId} fluid paid={input.tier === 'PAID'} />
        ) : (
          <EmptyState title="에셋 없음" body="아래에서 골라 주세요." className={css({ border: '0' })} />
        )}
      </div>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mt: '12px' })}>
        <span className={css({ textStyle: 'caption', color: 'faint' })}>에셋 파일</span>
        <span
          className={css({
            flex: '1',
            minWidth: '0',
            textAlign: 'right',
            textStyle: 'label',
            fontWeight: '600',
            color: current ? 'ink' : 'faint',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {current?.name ?? '없음'}
        </span>
      </div>

      <Button onClick={() => setPicking(true)} className={css({ width: 'full', mt: '9px' })}>
        {input.assetId ? '에셋 교체' : '에셋 고르기'}
      </Button>

      <AssetPicker
        open={picking}
        slot={input.slot}
        value={input.assetId}
        onClose={() => setPicking(false)}
        onPick={onPick}
      />

      <ul className={css({ listStyle: 'none', m: '14px 0 0', p: '0', display: 'flex', flexDirection: 'column', gap: '7px' })}>
        {checks.map((c) => (
          <li key={c.label} className={css({ display: 'flex', alignItems: 'center', gap: '8px', textStyle: 'caption' })}>
            <span
              aria-hidden="true"
              className={css({ width: '7px', height: '7px', flex: 'none', borderRadius: '50%' })}
              style={{ background: c.ok ? 'var(--colors-g-fg)' : 'var(--colors-faint2)' }}
            />
            <span className={css({ color: c.ok ? 'sub' : 'faint' })}>{c.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
