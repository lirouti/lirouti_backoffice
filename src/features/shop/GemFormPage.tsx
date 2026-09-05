/**
 * 젬 상품 등록·수정.
 *
 * **원본에 없는 화면이다.** 원본은 「상품 추가」 버튼만 두고 폼은 그리지 않았다
 * (입력 요소가 하나도 없다) — 업적 폼(`features/achievements/AchievementFormPage`,
 * docs/ARCHITECTURE.md §40)을 본으로 삼되 **그림이 없어** 에셋·업로드가 통째로 빠진다.
 * 남는 것은 숫자 셋과 이름 하나다.
 *
 * ⚠️ **이 화면은 돈을 정한다.** 젬당 단가가 어긋난 상품은 등록은 되지만 아무도 사지
 * 않으므로, 저장 전에 그 값을 계속 보여 준다 (§59.2).
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
import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Select } from '@/shared/ui/Select'
import { SkeletonForm } from '@/shared/ui/Skeleton'

import { SCREENS } from '@/domain/screens'
import {
  cheaperBetterDeal,
  emptyGemProductInput,
  GEM_STATUS_TONE,
  GEM_STATUSES,
  pricePerGem,
  toGemProductInput,
  validateGemProduct,
  type GemProduct,
  type GemProductInput,
  type GemStatus,
} from '@/domain/shop'

import { useGemProduct, useGems, useSaveGemProduct } from '@/api/shop'

import { useUnsavedGuard } from '@/stores/dirtyStore'

/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 `/shop/gems/new` 와 `/items/new` 가
 *    같은 칸을 써서 **하나가 다른 하나를 덮어쓴다** (§33.2).
 */
const draftScope = (gemId?: string): string => `gems:${gemId ?? 'new'}`

/**
 * 칸 하나를 바꾸고 **더러움 표시를 켠다.**
 *
 * `setValue` 는 기본으로 `shouldDirty` 를 켜지 않는다 — 그러면 미저장 경고도 임시 저장도
 * 동작하지 않는다 (업적 폼과 같은 이유).
 */
const setter =
  (form: UseFormReturn<GemProductInput>) =>
  <K extends FieldPath<GemProductInput>>(k: K, value: FieldPathValue<GemProductInput, K>) =>
    form.setValue(k, value, { shouldDirty: true })

/**
 * 숫자 칸의 표시값.
 *
 * ⚠️ **0 은 빈 칸으로 보여 준다.** `String(0)` 을 그대로 넣으면 빈 폼이 「0」 셋으로 시작해서
 *    지우고 쓰게 된다. 이 셋은 앞자리가 0 인 값이 없으므로 잃는 입력이 없다.
 */
const shownNum = (n: number): string => (n === 0 ? '' : String(n))

/** 숫자만 남긴다. 빈 칸·문자만 있으면 0 (검증이 잡는다) */
const toNum = (v: string): number => Number(v.replace(/\D/g, '')) || 0

/** 로딩 중에도 그리므로 두 곳이 같은 문장을 쓰게 상수로 둔다 (§43.2) */
const FORM_SUB = '충전 패키지 구성입니다. 가격과 보너스는 스토어 심사 후 반영됩니다.'

export default function GemFormPage() {
  const { gemId } = useParams()
  // 수정이면 원본을 받아 초기값으로 쓴다. 등록이면 부르지 않는다.
  const existing = useGemProduct(gemId ?? '')

  // ⚠️ **`key` 로 마운트를 가른다.** `GemForm` 은 `initial` 을 `useForm` 의 `defaultValues`
  //    로 한 번만 읽으므로, 같은 자리에서 `gemId` 만 바뀌면 **A 의 입력으로 B 를 저장한다**
  //    (업적 폼과 같은 불변식).
  if (!gemId) return <GemForm key="new" initial={emptyGemProductInput()} />
  if (existing.isPending) {
    // ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제가 데이터를 안 쓰므로 아는 값이다 (§43.2).
    return (
      <>
        <PageHeader title="젬 상품 수정" sub={FORM_SUB} />
        <SkeletonForm fields={5} />
      </>
    )
  }
  if (existing.error || !existing.data) {
    return <ErrorBanner message={existing.error?.message ?? '젬 상품을 불러오지 못했습니다.'} />
  }
  return <GemForm key={gemId} gemId={gemId} initial={toGemProductInput(existing.data)} />
}

/**
 * 폼 본체.
 *
 * 초기값이 준비된 뒤에 마운트되도록 **바깥에서 갈라 둔다** — `useForm` 의 `defaultValues` 는
 * 나중에 바뀌어도 반영되지 않아서, 수정 화면에서 빈 폼이 뜬다.
 */
function GemForm({ gemId, initial }: { gemId?: string; initial: GemProductInput }) {
  const navigate = useNavigate()
  const list = useGems()
  const save = useSaveGemProduct()
  // 폼을 만들기 **전에** 읽는다. 만든 뒤에는 기본값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(draftScope(gemId), initial))
  // ⚠️ **알림의 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정되므로
  //    「새로 시작」 으로 초안을 버려도 계속 참이고, 알림이 지워지지 않는다 (§33.4).
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  // 제출을 눌러 보기 전에는 빨갛게 하지 않는다 (업적 폼과 같은 규칙)
  const [tried, setTried] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  /**
   * ⚠️ **동기 재진입 잠금.** `save.isPending` 은 React 가 렌더를 커밋한 **뒤에야** 참이라,
   *    같은 태스크에서 연달아 제출하면 두 번째가 아직 거짓을 본다. `ref` 는 즉시 반영된다.
   *
   * ⚠️ **푸는 자리를 빠뜨리면 폼이 영영 잠긴다** — `onSettled` 가 성공·실패 모두 푼다.
   */
  const sending = useRef(false)

  const form = useForm<GemProductInput>({ defaultValues: initial })
  const draft = useFormDraft(draftScope(gemId), form.watch(), form.formState.isDirty)
  const markSaved = useUnsavedGuard(form.formState.isDirty)

  const values = form.watch()
  // ⚠️ **자기 이름은 빼고 센다.** 안 빼면 수정 화면이 열리자마자 「이미 쓰고 있는 이름」 이
  //    되어 자기 자신을 저장할 수 없다.
  const others = (list.data?.products ?? []).filter((p) => String(p.key) !== gemId)
  // ⚠️ **목록이 없으면 이름 중복 검사가 조용히 꺼진다.** 빈 배열이라 이미 쓰는 이름도
  //    통과하고, 파사드는 중복을 보지 않으므로 그대로 저장된다. 아직 오는 중이거나
  //    실패했으면 저장 자체를 막는다 — 검사를 못 하는 상태와 통과한 상태는 다르다
  //    (`SpeciesFormPage` 와 같은 규칙, §34.1).
  const namesUnknown = list.isPending || list.isError
  const errors = validateGemProduct(
    values,
    others.map((p) => p.name),
  )
  const blocked = Object.keys(errors).length > 0 || namesUnknown
  // ⚠️ **손대기 전에는 빨갛게 하지 않는다.** 빈 폼을 열자마자 혼나는 화면이 된다.
  //    무엇이 남았는지는 오른쪽 체크리스트가 말한다 (§18.7).
  const shown = tried ? errors : {}
  const set = setter(form)

  // ⚠️ **기본값은 원본으로 두고 값만 갈아 끼운다**(`keepDefaultValues`). 초안을 기본값으로
  //    넣으면 폼이 "깨끗하다" 고 여겨 미저장 경고도 자동 저장도 안 돈다 (§33.3).
  useEffect(() => {
    if (restored) form.reset(restored, { keepDefaultValues: true })
  }, [restored, form])

  const runSave = form.handleSubmit((input) => {
    save.mutate(
      { gemId, input },
      {
        onSuccess: () => {
          // 초안은 저장에 성공한 뒤에 지운다. 실패했는데 지우면 쓰던 게 사라진다.
          draft.clear()
          form.reset(input)
          // ⚠️ **표시를 지금 지운다.** `reset` 만으로는 다음 effect 에서야 스토어에 닿아,
          //    바로 아래 `navigate` 를 이동 가드가 막는다.
          markSaved()
          navigate(SCREENS.gems.path)
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
   *    말하지 못한다(§18.8). 누르면 무엇이 왜 남았는지 그 자리에서 보인다.
   *    한 줄 입력의 Enter(implicit submission)도 이 길을 지난다.
   *
   * ⚠️ **`flushSync` 가 필요하다.** 오류 표시는 `tried` 를 켠 **렌더에서야** DOM 에 붙는다
   *    (§52).
   */
  const submit = (e: FormEvent) => {
    flushSync(() => setTried(true))
    if (blocked) {
      e.preventDefault()
      focusFirstError(formRef.current)
      return
    }
    // ⚠️ **이미 돌고 있으면 두 번 보내지 않는다.** 버튼의 `disabled` 로는 못 막는다 —
    //    한 줄 입력의 Enter 는 버튼을 거치지 않는다 (§45.2).
    if (save.isPending || sending.current) {
      e.preventDefault()
      return
    }
    sending.current = true
    void runSave(e)
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <PageHeader title={gemId ? '젬 상품 수정' : '상품 추가'} sub={FORM_SUB} />

      {save.error && <ErrorBanner message={save.error.message} />}
      {list.isError && (
        <ErrorBanner
          message={`상품 목록을 불러오지 못해 이름 중복을 확인할 수 없습니다. ${list.error.message}`}
        />
      )}
      {noticeOpen && (
        <DraftNotice
          onDiscard={() => {
            draft.clear()
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
              label="상품명"
              placeholder="예: 초대형"
              hint="표에서 상품을 가리키는 유일한 값입니다. 같은 이름을 둘 만들 수 없습니다."
              error={shown.name}
              required
            />
            <Input
              value={shownNum(values.gem)}
              onChange={(v) => set('gem', toNum(v))}
              label="젬"
              inputMode="numeric"
              placeholder="예: 9000"
              hint="결제로 주는 유상 젬입니다."
              error={shown.gem}
              required
            />
            <Input
              value={shownNum(values.bonus)}
              onChange={(v) => set('bonus', toNum(v))}
              label="보너스"
              inputMode="numeric"
              placeholder="예: 2000"
              hint="함께 주는 무상 젬입니다. 없으면 비워 둡니다."
              error={shown.bonus}
            />
            <Input
              value={shownNum(values.price)}
              onChange={(v) => set('price', toNum(v))}
              label="가격 (원)"
              inputMode="numeric"
              placeholder="예: 89000"
              hint="스토어에 등록된 값과 같아야 합니다. 여기서 바꿔도 심사 전에는 안 바뀝니다."
              error={shown.price}
              required
            />
            {/*
              ⚠️ **등록에는 상태 칸이 없다.** 스토어에 상품이 없는 채로 「판매중」 을 고르면
                 목록에는 파는 것처럼 보이는데 결제가 안 된다 — 만들어질 상태는 오른쪽
                 미리보기가 배지로 말한다 (§59.1).
            */}
            {gemId && (
              <Select
                value={values.status}
                onChange={(v) => set('status', v as GemStatus)}
                label="상태"
                options={GEM_STATUSES.map((s) => ({ value: s, label: s }))}
                hint="「판매중」 은 스토어에 그 상품이 살아 있을 때만 고릅니다."
                error={shown.status}
              />
            )}
          </div>
        </Card>

        <SideCard input={values} errors={errors} others={others} />
      </div>

      <div
        className={css({ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: '16px' })}
      >
        <Button onClick={() => navigate(SCREENS.gems.path)}>취소</Button>
        <Button onClick={draft.saveNow} disabled={!form.formState.isDirty}>
          임시 저장
        </Button>
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? '저장 중…' : gemId ? '수정' : '등록'}
        </Button>
      </div>

      <DraftSavedAt at={draft.savedAt} />
    </form>
  )
}

/**
 * 젬당 단가 + 체크리스트.
 *
 * ⚠️ **체크리스트는 `validateGemProduct` 의 결과로 그린다.** 따로 계산하면 체크는 초록인데
 *    저장이 막히는 화면이 만들어진다 (§18.7).
 */
function SideCard({
  input,
  errors,
  others,
}: {
  input: GemProductInput
  errors: ReturnType<typeof validateGemProduct>
  /** 비교 대상. 수정이면 **자기 자신은 빠져 있다** */
  others: GemProduct[]
}) {
  const per = pricePerGem(input)
  const total = input.gem + input.bonus
  const worse = cheaperBetterDeal(input, others)
  const checks = [
    { ok: !errors.name, label: errors.name ?? '상품명 입력됨' },
    { ok: !errors.gem, label: errors.gem ?? '젬 입력됨' },
    { ok: !errors.price, label: errors.price ?? '가격 입력됨' },
  ]

  return (
    <Card
      className={css({ flex: '1 1 280px', minWidth: '250px', maxWidth: '360px', p: '15px' })}
    >
      <CardTitle title="젬당 단가" sub="보너스를 포함해 나눈 값입니다." />

      <p
        className={css({
          m: '12px 0 0',
          textStyle: 'h1',
          color: per === 0 ? 'faint' : 'priD',
        })}
      >
        {per === 0 ? '—' : `${per.toFixed(1)}원`}
      </p>
      <p className={css({ m: '4px 0 0', textStyle: 'caption', color: 'sub' })}>
        {total === 0 ? '젬을 입력하면 계산됩니다.' : `${num(input.price)}원 / ${num(total)}젬`}
      </p>

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mt: '13px' })}>
        <span className={css({ textStyle: 'caption', color: 'faint' })}>상태</span>
        <span className={css({ flex: '1' })} />
        <Badge tone={GEM_STATUS_TONE[input.status]}>{input.status}</Badge>
      </div>

      {/*
        ⚠️ **막지 않고 보여만 준다.** 기간 한정 구성처럼 일부러 그렇게 두는 경우가 있고
           우리는 그 의도를 모른다. 다만 모르고 낸 것이면 **아무도 사지 않는다** (§59.2).
      */}
      {worse && (
        <p
          className={css({
            m: '13px 0 0',
            p: '9px 11px',
            borderRadius: '8px',
            // ⚠️ `warnBg` 라는 토큰은 **없다.** 경고 톤의 배경은 `aBg` 다 — 잘못 적으면
            //    배경이 아예 안 칠해지고 브라우저가 조용히 버린다 (`DraftNotice` 와 같은 짝).
            bg: 'aBg',
            border: '1px solid token(colors.warnBd)',
            color: 'warnFg',
            textStyle: 'caption',
          })}
        >
          더 싼 <strong>{worse.name}</strong>({num(worse.price)}원)이 젬당{' '}
          {pricePerGem(worse).toFixed(1)}원으로 더 유리합니다. 이대로면 이 상품을 살 이유가
          없습니다.
        </p>
      )}

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
