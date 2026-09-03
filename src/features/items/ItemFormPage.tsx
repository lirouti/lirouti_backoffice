/**
 * 아이템 등록·수정. **첫 폼 화면이라 나머지 폼들의 본이 된다** (docs/ARCHITECTURE.md §18.8).
 *
 * 선택지 목록과 필드가 길어 파일 머리말을 따로 둔다 — 컴포넌트 주석이 30줄 밖이다.
 */
import { useEffect, useState } from 'react'

import { useForm, type FieldPath, type FieldPathValue, type UseFormReturn } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { restoreDraft } from '@/shared/lib/draft'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { SkeletonRows } from '@/shared/ui/Skeleton'
import { Switch } from '@/shared/ui/Switch'
import { Textarea } from '@/shared/ui/Textarea'

import { kindOfSlot,
  emptyItemInput,
  isKnownSlot,
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
import { CURRENT_SEASON, seasonOptions } from '@/domain/season'

import { useAssets, useUploadAsset } from '@/api/assets'
import { useItem, useSaveItem } from '@/api/items'

import { useUnsavedGuard } from '@/stores/dirtyStore'

import { AssetPicker } from '@/entities/asset'


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
/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 `/items/new` 와 `/coupons/new` 가
 *    같은 칸을 써서 **하나가 다른 하나를 덮어쓴다** (docs/ARCHITECTURE.md §33.2).
 *
 * 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2).
 */
const draftScope = (itemId?: string): string => `items:${itemId ?? 'new'}`

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

/**
 * 아직 올리지 않은 파일.
 *
 * `preview` 는 `URL.createObjectURL` 이 만든 `blob:` URL 이라, 바꾸거나 저장을 마치면
 * 놓아 줘야 한다.
 */
type PendingAsset = { file: File; preview: string }

/**
 * 검증에만 쓰는 가짜 `assetId`.
 *
 * 올릴 파일을 고른 상태에서는 `assetId` 가 아직 비어 있지만 저장할 때 생긴다.
 * 이 값을 끼워 넣어 `validateItem` 이 "에셋 없음" 으로 막지 않게 한다 —
 * **저장되는 값이 아니다.**
 */
const PENDING_ASSET_ID = '(올리는 중)'

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

  // ⚠️ **`key` 는 지금 없어도 되지만 두는 게 맞다.** `ItemForm` 은 `initial` 을 `useForm` 의
  //    `defaultValues` 로 한 번만 읽고, 초안·알림도 마운트 시점에 고정한다. 그래서 같은
  //    자리에서 `itemId` 만 바뀌면 **A 의 입력으로 B 를 저장하게 된다.**
  //    지금은 셸이 `activeCacheKey={pathname}` 으로 캐시해(`layouts/AdminLayout`) 경로가
  //    다르면 새로 마운트되므로 실제로는 일어나지 않는다 — 확인했다. 다만 그 안전이
  //    **먼 파일의 설정 한 줄에 달려 있고**, 깨졌을 때 화면은 멀쩡해 보이면서 다른
  //    아이템에 값이 덮인다. 불변식을 여기에 두어 그 의존을 끊는다.
  if (!itemId) return <ItemForm key="new" initial={emptyItemInput()} />
  if (existing.isPending) return <SkeletonRows rows={6} />
  if (existing.error || !existing.data) {
    return <ErrorBanner message={existing.error?.message ?? '아이템을 불러오지 못했습니다.'} />
  }
  return <ItemForm key={itemId} itemId={itemId} initial={toItemInput(existing.data.item)} />
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
  const upload = useUploadAsset()
  // 폼을 만들기 **전에** 읽는다. 만든 뒤에는 기본값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(draftScope(itemId), initial, isKnownSlot))
  // ⚠️ **알림의 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정되므로
  //    「새로 시작」 으로 초안을 버려도 계속 참이고, 알림이 지워지지 않는다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  // 고르기만 하고 **아직 올리지 않은** 파일. 「등록」 을 눌러야 올라간다 (§4.5).
  const [pending, setPending] = useState<PendingAsset | null>(null)
  const form = useForm<ItemInput>({ defaultValues: initial })
  const draft = useFormDraft(draftScope(itemId), form.watch(), form.formState.isDirty)
  // 임시 저장은 등록이 아니다 — 초안이 있어도 폼이 더러우면 경고를 켠다.
  const markSaved = useUnsavedGuard(form.formState.isDirty)

  const values = form.watch()
  // 올릴 파일을 고른 상태면 저장할 때 `assetId` 가 생긴다 — 지금 비어 있다고 막지 않는다.
  const errors = validateItem(pending ? { ...values, assetId: PENDING_ASSET_ID } : values)
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

  // ⚠️ **미리보기 URL 은 여기 한 곳에서만 놓아 준다.** 바꿀 때·버릴 때마다 손으로 부르면
  //    **화면을 떠나는 경로를 반드시 하나 빠뜨린다** — 실제로 취소·저장 후 이동·탭 닫기
  //    셋 다 빠져 있어서 blob URL 이 문서 수명 내내 남았다. cleanup 은 `pending` 이 바뀔 때와
  //    언마운트 때 함께 돈다.
  //
  //    ⚠️ **탭 전환에서는 돌지 않는다**(keep-alive, docs/ARCHITECTURE.md §10). 그게 맞다 —
  //    돌아왔을 때 미리보기가 살아 있어야 한다.
  useEffect(() => {
    if (!pending) return
    return () => URL.revokeObjectURL(pending.preview)
  }, [pending])

  const pickFile = (file: File) => {
    setPending({ file, preview: URL.createObjectURL(file) })
    // 올린 그림을 쓸 것이므로 골라 뒀던 에셋은 버린다.
    form.setValue('assetId', '', { shouldDirty: true })
  }

  const submit = form.handleSubmit(async (input) => {
    // ⚠️ **업로드는 여기서 한다.** 파일을 고르는 순간 올리면 등록을 그만둔 사람의
    //    그림이 남는다. 실패하면 저장까지 가지 않으므로 폼은 그대로 있다.
    let assetId = input.assetId
    if (pending) {
      try {
        const asset = await upload.mutateAsync({ kind: kindOfSlot(input.slot), file: pending.file, name: input.name })
        assetId = asset.assetId
      } catch {
        // 오류는 `upload.error` 로 화면에 나온다.
        return
      }
    }

    save.mutate(
      { itemId, input: { ...input, assetId } },
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
        <DraftNotice
          onDiscard={() => {
            draft.clear()
            // ⚠️ **고른 파일도 함께 버린다.** 글자만 되돌리면 미리보기에 그 그림이 남아
            //    있다가 **저장할 때 그대로 올라간다** (§33.3 — 실제로 났던 버그).
            setPending(null)
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
          pending={pending}
          onPickFile={pickFile}
          onPick={(assetId) => {
            // 목록에서 골랐으면 올리려던 파일은 버린다 — 둘 다 가질 수 없다.
            setPending(null)
            form.setValue('assetId', assetId, { shouldDirty: true })
          }}
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

      <DraftSavedAt at={draft.savedAt} />
    </form>
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
            /* ⚠️ 지금 값을 함께 넘긴다 — 목록 밖의 값이면 셀렉트가 빈 칸이 된다 (§34.8) */
            options={seasonOptions(CURRENT_SEASON, v.season)}
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
  pending,
  onPick,
  onPickFile,
}: {
  input: ItemInput
  errors: ReturnType<typeof validateItem>
  /** 올릴 파일을 고른 상태. 아직 카탈로그에 없으므로 미리보기는 이쪽을 쓴다 */
  pending: PendingAsset | null
  onPick: (assetId: string) => void
  onPickFile: (file: File) => void
}) {
  const assets = useAssets(kindOfSlot(input.slot))
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
        {pending ? (
          <AssetThumb assetId="" src={pending.preview} fluid paid={input.tier === 'PAID'} />
        ) : input.assetId ? (
          <AssetThumb assetId={input.assetId} src={current?.src} fluid paid={input.tier === 'PAID'} />
        ) : (
          <EmptyState title="에셋 없음" body="아래에서 고르거나 올려 주세요." className={css({ border: '0' })} />
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
          {pending ? pending.file.name : (current?.name ?? '없음')}
        </span>
      </div>

      <Button onClick={() => setPicking(true)} className={css({ width: 'full', mt: '9px' })}>
        {pending || input.assetId ? '에셋 교체' : '에셋 고르기'}
      </Button>

      <AssetPicker
        open={picking}
        kind={kindOfSlot(input.slot)}
        value={input.assetId}
        onClose={() => setPicking(false)}
        onPick={onPick}
        onPickFile={onPickFile}
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
