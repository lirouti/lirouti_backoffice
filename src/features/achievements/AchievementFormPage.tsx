/**
 * 업적 등록·수정.
 *
 * **원본에 없는 화면이다.** 원본은 「업적 등록」 버튼만 두고 폼은 그리지 않았다 —
 * 아이템 폼(`features/items/ItemFormPage`, docs/ARCHITECTURE.md §18.8)을 본으로 삼되
 * 업적에 없는 것(등급·가격·노출 기간·진열 스위치)은 전부 뺐다. 남는 것은 **그림과 글 다섯 칸**이라
 * 카드 하나로 끝난다.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'

import {
  useForm,
  type FieldPath,
  type FieldPathValue,
  type UseFormReturn,
} from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { restoreDraft } from '@/shared/lib/draft'
import { focusFirstError } from '@/shared/lib/focusFirstError'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonForm } from '@/shared/ui/Skeleton'

import {
  emptyAchievementInput,
  toAchievementInput,
  validateAchievement,
  type AchievementInput,
} from '@/domain/achievement'
import { SCREENS } from '@/domain/screens'

import { useAchievement, useSaveAchievement } from '@/api/achievements'
import { useAssets, useUploadAsset } from '@/api/assets'

import { useUnsavedGuard } from '@/stores/dirtyStore'

import { AssetPicker } from '@/entities/asset'

/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 `/achievements/new` 와 `/items/new` 가
 *    같은 칸을 써서 **하나가 다른 하나를 덮어쓴다** (§33.2).
 *
 * 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2).
 */
const draftScope = (achId?: string): string => `achievements:${achId ?? 'new'}`

/**
 * 칸 하나를 바꾸고 **더러움 표시를 켠다.**
 *
 * `setValue` 는 기본으로 `shouldDirty` 를 켜지 않는다 — 그러면 미저장 경고도 임시 저장도
 * 동작하지 않는다 (아이템 폼과 같은 이유).
 */
const setter =
  (form: UseFormReturn<AchievementInput>) =>
  <K extends FieldPath<AchievementInput>>(k: K, value: FieldPathValue<AchievementInput, K>) =>
    form.setValue(k, value, { shouldDirty: true })

/** 아직 올리지 않은 파일. `preview` 는 `blob:` URL 이라 다 쓰면 놓아 준다 */
type PendingAsset = { file: File; preview: string }

/** 검증에만 쓰는 가짜 `assetId`. 저장되는 값이 아니다 (아이템 폼과 같은 장치) */
const PENDING_ASSET_ID = '(올리는 중)'

/** 로딩 중에도 그리므로 두 곳이 같은 문장을 쓰게 상수로 둔다 (§43.2) */
const FORM_SUB =
  '조형이 곧 이름표입니다. 수집함에서 그림만 보고 어느 업적인지 알 수 있어야 합니다.'

export default function AchievementFormPage() {
  const { achId } = useParams()
  // 수정이면 원본을 받아 초기값으로 쓴다. 등록이면 부르지 않는다.
  const existing = useAchievement(achId ?? '')

  // ⚠️ **`key` 로 마운트를 가른다.** `AchievementForm` 은 `initial` 을 `useForm` 의
  //    `defaultValues` 로 한 번만 읽으므로, 같은 자리에서 `achId` 만 바뀌면
  //    **A 의 입력으로 B 를 저장한다** (아이템 폼과 같은 불변식, §18.8).
  if (!achId) return <AchievementForm key="new" initial={emptyAchievementInput()} />
  if (existing.isPending) {
    // ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제가 데이터를 안 쓰므로 아는 값이다.
    //    지웠다 다시 그리면 아는 것까지 튄다 (docs/ARCHITECTURE.md §43.2).
    //    다만 **버튼은 빼둔다** — 아직 없는 데이터를 대상으로 하는 동작이다.
    return (
      <>
        <PageHeader title={achId ? '업적 수정' : '업적 등록'} sub={FORM_SUB} />
        <SkeletonForm fields={4} />
      </>
    )
  }
  if (existing.error || !existing.data) {
    return <ErrorBanner message={existing.error?.message ?? '업적을 불러오지 못했습니다.'} />
  }
  return (
    <AchievementForm key={achId} achId={achId} initial={toAchievementInput(existing.data)} />
  )
}

/**
 * 폼 본체.
 *
 * 초기값이 준비된 뒤에 마운트되도록 **바깥에서 갈라 둔다** — `useForm` 의 `defaultValues` 는
 * 나중에 바뀌어도 반영되지 않아서, 수정 화면에서 빈 폼이 뜬다.
 */
function AchievementForm({ achId, initial }: { achId?: string; initial: AchievementInput }) {
  const navigate = useNavigate()
  const save = useSaveAchievement()
  const upload = useUploadAsset()
  // 폼을 만들기 **전에** 읽는다. 만든 뒤에는 기본값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(draftScope(achId), initial))
  // ⚠️ **알림의 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정되므로
  //    「새로 시작」 으로 초안을 버려도 계속 참이고, 알림이 지워지지 않는다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  // 고르기만 하고 **아직 올리지 않은** 파일. 「등록」 을 눌러야 올라간다 (§8.5).
  const [pending, setPending] = useState<PendingAsset | null>(null)
  // 제출을 눌러 보기 전에는 빨갛게 하지 않는다 (`ItemFormPage` 와 같은 규칙)
  const [tried, setTried] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  /**
   * ⚠️ **동기 재진입 잠금.** `busy` 는 React 가 렌더를 커밋한 **뒤에야** 참이라, 같은
   *    태스크에서 연달아 제출하면 두 번째가 아직 거짓을 본다 — 실측으로 3회 중 2개가
   *    만들어졌다. `ref` 는 즉시 반영되므로 그 틈이 없다.
   *
   * ⚠️ **푸는 자리를 빠뜨리면 폼이 영영 잠긴다.** 막으려던 것보다 나쁜 고장이라, 끝나는
   *    길마다 하나씩 있어야 한다 — **업로드 실패의 조기 반환**과 `onSettled`(성공·실패 모두).
   */
  const sending = useRef(false)

  const form = useForm<AchievementInput>({ defaultValues: initial })
  const draft = useFormDraft(draftScope(achId), form.watch(), form.formState.isDirty)
  const markSaved = useUnsavedGuard(form.formState.isDirty)

  const values = form.watch()
  // 올릴 파일을 고른 상태면 저장할 때 `assetId` 가 생긴다 — 지금 비어 있다고 막지 않는다.
  const errors = validateAchievement(
    pending ? { ...values, assetId: PENDING_ASSET_ID } : values,
  )
  const blocked = Object.keys(errors).length > 0
  // ⚠️ **손대기 전에는 빨갛게 하지 않는다.** 빈 폼을 열자마자 혼나는 화면이 된다.
  //    무엇이 남았는지는 오른쪽 체크리스트가 말한다 (§18.7).
  const shown = tried ? errors : {}
  // 업로드가 도는 동안에는 `save.isPending` 이 아직 false 다 — 둘 다 봐야 한다.
  const busy = save.isPending || upload.isPending
  const set = setter(form)

  // ⚠️ **기본값은 원본으로 두고 값만 갈아 끼운다**(`keepDefaultValues`). 초안을 기본값으로
  //    넣으면 폼이 "깨끗하다" 고 여겨 미저장 경고도 자동 저장도 안 돈다.
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
    set('assetId', '')
  }

  const runSave = form.handleSubmit(async (input) => {
    // ⚠️ **업로드는 여기서 한다.** 파일을 고르는 순간 올리면 등록을 그만둔 사람의 그림이
    //    서버에 남는다. 실패하면 저장까지 가지 않으므로 폼은 그대로 있다 (§8.5).
    let assetId = input.assetId
    if (pending) {
      try {
        const asset = await upload.mutateAsync({
          kind: 'ach',
          file: pending.file,
          name: input.name,
        })
        assetId = asset.assetId
      } catch {
        // 오류는 `upload.error` 로 화면에 나온다.
        // ⚠️ 여기서 풀지 않으면 업로드가 한 번 실패한 폼은 다시 보낼 수 없다.
        sending.current = false
        return
      }
    }

    save.mutate(
      { achId, input: { ...input, assetId } },
      {
        onSuccess: () => {
          // 초안은 저장에 성공한 뒤에 지운다. 실패했는데 지우면 쓰던 게 사라진다.
          draft.clear()
          form.reset(input)
          // ⚠️ **표시를 지금 지운다.** `reset` 만으로는 다음 effect 에서야 스토어에 닿아,
          //    바로 아래 `navigate` 를 이동 가드가 막는다.
          markSaved()
          navigate(SCREENS.ach.path)
        },
        // ⚠️ **성공·실패 모두 여기로 온다.** `onSuccess` 에만 두면 실패한 뒤 다시 못 보낸다.
        onSettled: () => {
          sending.current = false
        },
      },
    )
  })

  /**
   * ⚠️ **제출을 막는 곳은 여기 하나다.** 버튼은 잠그지 않는다 — 잠긴 버튼은 왜 잠겼는지
   *    말하지 못한다(§22.2.3). 누르면 무엇이 왜 남았는지 그 자리에서 보인다.
   *    한 줄 입력의 Enter(implicit submission)도 이 길을 지난다.
   *
   * ⚠️ **`flushSync` 가 필요하다.** 오류 표시는 `tried` 를 켠 **렌더에서야** DOM 에 붙는데,
   *    그냥 `setTried(true)` 하면 그 다음 줄에서 아직 안 붙어 있어 포커스를 옮길 대상을
   *    못 찾는다. 여기서 한 번 확정시키면 뒤 두 줄이 같은 프레임에서 성립한다.
   */
  const submit = (e: FormEvent) => {
    flushSync(() => setTried(true))
    if (blocked) {
      e.preventDefault()
      focusFirstError(formRef.current)
      return
    }
    // ⚠️ **이미 돌고 있으면 두 번 보내지 않는다.** 버튼의 `disabled` 로는 못 막는다 —
    //    한 줄 입력의 Enter 는 버튼을 거치지 않는다. 실제로 세 번 제출하니 **셋 다
    //    만들어졌다**(`/challenges/18` 대 `/challenges/20`).
    if (busy || sending.current) {
      e.preventDefault()
      return
    }
    sending.current = true
    void runSave(e)
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <PageHeader title={achId ? '업적 수정' : '업적 등록'} sub={FORM_SUB} />

      {save.error && <ErrorBanner message={save.error.message} />}
      {upload.error && <ErrorBanner message={upload.error.message} />}
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

      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '18px',
          alignItems: 'flex-start',
        })}
      >
        <Card className={css({ flex: '3 1 460px', minWidth: '0', p: '17px 20px' })}>
          <CardTitle title="기본 정보" />
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              mt: '14px',
            })}
          >
            <Input
              value={values.name}
              onChange={(name) => set('name', name)}
              label="업적명"
              placeholder="예: 첫 알"
              error={shown.name}
              required
            />
            <Input
              value={values.sub}
              onChange={(sub) => set('sub', sub)}
              label="조형 설명"
              placeholder="예: 금속 메달 · 월계관"
              hint="목록 카드에서 이름 아래에 붙습니다. 무엇으로 그렸는지 적습니다."
            />
            <Input
              value={values.cond}
              onChange={(cond) => set('cond', cond)}
              label="달성 조건"
              placeholder="예: 계정 생성"
              hint="표시용 문구입니다. 실제 판정은 게임 서버가 합니다."
              error={shown.cond}
              required
            />
            <Input
              value={values.reward}
              onChange={(reward) => set('reward', reward)}
              label="보상"
              placeholder="예: 젬 50 · 보금자리"
              hint="젬과 아이템을 함께 적을 수 있습니다."
              error={shown.reward}
              required
            />
          </div>
        </Card>

        <SideCard
          input={values}
          errors={errors}
          pending={pending}
          onPickFile={pickFile}
          onPick={(assetId) => {
            // 목록에서 골랐으면 올리려던 파일은 버린다 — 둘 다 가질 수 없다.
            setPending(null)
            set('assetId', assetId)
          }}
        />
      </div>

      <div
        className={css({ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: '16px' })}
      >
        <Button onClick={() => navigate(SCREENS.ach.path)}>취소</Button>
        <Button onClick={draft.saveNow} disabled={!form.formState.isDirty}>
          임시 저장
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? '저장 중…' : achId ? '수정' : '등록'}
        </Button>
      </div>

      <DraftSavedAt at={draft.savedAt} />
    </form>
  )
}

/**
 * 미리보기 + 체크리스트.
 *
 * ⚠️ **체크리스트는 `validateAchievement` 의 결과로 그린다.** 따로 계산하면 체크는 초록인데
 *    저장이 막히는 화면이 만들어진다.
 */
function SideCard({
  input,
  errors,
  pending,
  onPick,
  onPickFile,
}: {
  input: AchievementInput
  errors: ReturnType<typeof validateAchievement>
  /** 올릴 파일을 고른 상태. 아직 카탈로그에 없으므로 미리보기는 이쪽을 쓴다 */
  pending: PendingAsset | null
  onPick: (assetId: string) => void
  onPickFile: (file: File) => void
}) {
  const assets = useAssets('ach')
  const [picking, setPicking] = useState(false)

  const current = assets.data?.find((a) => a.assetId === input.assetId)
  const checks = [
    { ok: !errors.name, label: errors.name ?? '업적명 입력됨' },
    { ok: !errors.assetId, label: errors.assetId ?? '에셋 선택됨' },
    { ok: !errors.cond, label: errors.cond ?? '달성 조건 입력됨' },
    { ok: !errors.reward, label: errors.reward ?? '보상 입력됨' },
  ]

  return (
    <Card
      className={css({ flex: '1 1 280px', minWidth: '250px', maxWidth: '360px', p: '15px' })}
    >
      <CardTitle title="수집함 미리보기" sub="배경판 없이 오브젝트 자체로 섭니다." />
      <div className={css({ mt: '12px' })}>
        {/* ⚠️ `plate={false}` — 업적 뱃지는 판 없이 오브젝트 자체로 선다 (목록과 같은 규칙). */}
        {pending ? (
          <AssetThumb assetId="" src={pending.preview} fluid plate={false} />
        ) : input.assetId ? (
          <AssetThumb assetId={input.assetId} src={current?.src} fluid plate={false} />
        ) : (
          <EmptyState
            title="에셋 없음"
            body="아래에서 고르거나 올려 주세요."
            className={css({ border: '0' })}
          />
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
            color: current || pending ? 'ink' : 'faint',
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
        kind="ach"
        value={input.assetId}
        onClose={() => setPicking(false)}
        onPick={onPick}
        onPickFile={onPickFile}
      />

      <ul
        className={css({
          listStyle: 'none',
          m: '14px 0 0',
          p: '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
        })}
      >
        {checks.map((c) => (
          <li
            key={c.label}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textStyle: 'caption',
            })}
          >
            <span
              aria-hidden="true"
              className={css({
                width: '7px',
                height: '7px',
                flex: 'none',
                borderRadius: '50%',
              })}
              style={{ background: c.ok ? 'var(--colors-g-fg)' : 'var(--colors-faint2)' }}
            />
            <span className={css({ color: c.ok ? 'sub' : 'faint' })}>{c.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
