/**
 * 종 등록 — **원본에 없는 화면이다.**
 *
 * 종에는 올릴 이미지가 없어서(docs/ARCHITECTURE.md §19.1) 색 고르기 + 설정으로 끝난다.
 */
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { restoreDraft } from '@/shared/lib/draft'
import { focusFirstError } from '@/shared/lib/focusFirstError'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { Textarea } from '@/shared/ui/Textarea'

import { SCREENS } from '@/domain/screens'
import { CURRENT_SEASON, seasonOptions } from '@/domain/season'
import {
  emptySpeciesInput,
  RARITIES,
  RIG_SLOTS,
  SLOT_PARTS,
  speciesTint,
  UNLOCKS,
  validateSpecies,
  type Rarity,
  type SpeciesInput,
} from '@/domain/species'

import { useSaveSpecies, useSpeciesList } from '@/api/species'

import { useUnsavedGuard } from '@/stores/dirtyStore'

/**
 * 종 등록 — **원본에 없는 화면이다.**
 *
 * 원본은 종을 읽기 전용으로 뒀지만(docs/ARCHITECTURE.md §19.2) 운영에서 필요해 새로 그렸다.
 * 부담이 작은 이유는 **종에 올릴 이미지가 없기 때문**이다 — 13종이 같은 그림을 쓰고
 * 대표 색 하나로 갈린다(§19.1). 그래서 이 폼은 색 고르기 + 설정이지 업로드가 아니다.
 *
 * ⚠️ **새 종은 「미출현」 으로 만들어진다.** 클라이언트에 그 종의 아트가 아직 없으므로
 *    등록하자마자 뽑기에 나오면 안 된다. 그 사실을 화면에서도 말한다.
 */
/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 화면마다의 `/…/new` 가 **같은 칸을
 *    써서 하나가 다른 하나를 덮어쓴다** (docs/ARCHITECTURE.md §33.2).
 */
const draftScope = (): string => `species:new`

export default function SpeciesFormPage() {
  const navigate = useNavigate()
  const save = useSaveSpecies()
  const list = useSpeciesList()
  // 폼을 만들기 **전에** 읽는다 — 만든 뒤에는 초기값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(draftScope(), emptySpeciesInput()))
  const [input, setInput] = useState<SpeciesInput>(restored ?? emptySpeciesInput)
  // ⚠️ **되살렸으면 처음부터 「손댔다」 다.** 안 그러면 미저장 경고도 자동 저장도 안 돌아
  //    되살려 놓고 다음 새로고침에 또 잃는다.
  const [touched, setTouched] = useState(restored != null)
  // ⚠️ **알림 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정이라
  //    「새로 시작」 으로 버려도 계속 참이고 알림이 안 지워진다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  // ⚠️ **`touched` 와 다른 것을 센다** (`ChallengeFormPage` 와 같은 이유)
  const [tried, setTried] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const markSaved = useUnsavedGuard(touched)
  const draft = useFormDraft(draftScope(), input, touched)

  // ⚠️ **목록이 없으면 중복 검사가 조용히 꺼진다.** `taken` 이 빈 배열이라 이미 쓰는
  //    코드도 통과하고, 파사드는 중복을 보지 않으므로 그대로 저장된다. 아직 오는 중이거나
  //    실패했으면 등록 자체를 막는다 — 검사를 못 하는 상태와 통과한 상태는 다르다.
  const codesUnknown = list.isPending || list.isError
  const taken = (list.data ?? []).map((s) => s.code)
  const errors = validateSpecies(input, taken)
  const blocked = Object.keys(errors).length > 0 || codesUnknown
  // 제출을 눌러 보기 전에는 빨갛게 하지 않는다 — 빈 폼을 열자마자 혼나는 기분이 든다.
  // 무엇이 남았는지는 오른쪽 체크리스트가 말한다 (`ItemFormPage` 와 같은 규칙).
  const shown = tried ? errors : {}

  const set = <K extends keyof SpeciesInput>(k: K, v: SpeciesInput[K]) => {
    setTouched(true)
    setInput((prev) => ({ ...prev, [k]: v }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    // ⚠️ **제출을 막는 곳은 여기 하나다.** 버튼은 잠그지 않는다 — 잠긴 버튼은 왜 잠겼는지
    //    말하지 못한다(§22.2.3). 누르면 무엇이 왜 남았는지 그 자리에서 보인다.
    //
    // ⚠️ **`flushSync` 가 필요하다.** 오류 표시는 `tried` 를 켠 렌더에서야 DOM 에 붙어서,
    //    그냥 `setTried(true)` 하면 아래 `focusFirstError` 가 대상을 못 찾는다.
    flushSync(() => setTried(true))
    if (blocked) {
      focusFirstError(formRef.current)
      return
    }
    // ⚠️ **이미 돌고 있으면 두 번 보내지 않는다.** 버튼의 `disabled` 로는 못 막는다 —
    //    한 줄 입력의 Enter 는 버튼을 거치지 않는다. 실제로 세 번 제출하니 **셋 다
    //    만들어졌다**(`/challenges/18` 대 `/challenges/20`).
    if (save.isPending) return
    save.mutate(
      { input },
      {
        onSuccess: (sp) => {
          draft.clear()
          // ⚠️ 표시를 지금 지운다 — 아래 `navigate` 를 이동 가드가 막지 않게.
          markSaved()
          navigate(SCREENS.speciesdet.path.replace(':speciesId', String(sp.key)))
        },
      },
    )
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <PageHeader
        title="종 등록"
        sub="종은 대표 색으로 구분됩니다. 아트는 캐릭터팀이 따로 올립니다."
      />

      {noticeOpen && (
        <DraftNotice
          onDiscard={() => {
            draft.clear()
            setInput(emptySpeciesInput())
            setTouched(false)
            setNoticeOpen(false)
          }}
        />
      )}
      <DraftSavedAt at={draft.savedAt} />

      {save.error && <ErrorBanner message={save.error.message} />}
      {list.isError && (
        <ErrorBanner message={`종 목록을 불러오지 못해 코드 중복을 확인할 수 없습니다. ${list.error.message}`} />
      )}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <div className={css({ flex: '3 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Card className={css({ p: '17px 20px' })}>
            <CardTitle title="기본 정보" />
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '14px', mt: '14px' })}>
              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px' })}>
                <Input
                  value={input.name}
                  onChange={(v) => set('name', v)}
                  label="종 이름"
                  placeholder="예: 노을"
                  error={shown.name}
                  required
                  className={css({ flex: '1 1 200px' })}
                />
                <Input
                  value={input.code}
                  onChange={(v) => set('code', v)}
                  label="코드"
                  placeholder="예: SP-CORAL"
                  hint="`SP-` + 대문자. 종끼리 겹칠 수 없습니다"
                  error={shown.code}
                  required
                  className={css({ flex: '1 1 200px' })}
                />
              </div>

              <Segmented
                value={input.rarity}
                onChange={(v) => set('rarity', v as Rarity)}
                options={[...RARITIES]}
                aria-label="희귀도"
              />

              <ToneField value={input.tone} onChange={(v) => set('tone', v)} error={shown.tone} />

              <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px' })}>
                <Input
                  value={input.by}
                  onChange={(v) => set('by', v)}
                  label="아트 담당"
                  placeholder="예: 최지우"
                  className={css({ flex: '1 1 200px' })}
                />
              </div>

              <Textarea
                value={input.note}
                onChange={(v) => set('note', v)}
                label="설명"
                placeholder="예: 산호색. 꼬리깃이 세 갈래"
                rows={2}
              />
            </div>
          </Card>

          <Card className={css({ p: '17px 20px' })}>
            <CardTitle title="출현 설정" sub="가중치는 같은 희귀도끼리 견준 비율이 확률이 됩니다." />
            <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
              <Input
                value={String(input.weight)}
                onChange={(v) => set('weight', Number(v.replace(/\D/g, '')) || 0)}
                label="출현 가중치"
                error={shown.weight}
                required
                className={css({ flex: '1 1 160px' })}
              />
              <Select
                value={input.unlock}
                onChange={(v) => set('unlock', v as SpeciesInput['unlock'])}
                options={UNLOCKS}
                label="해금 조건"
                className={css({ flex: '1 1 180px' })}
              />
              <Select
                value={input.season}
                onChange={(v) => set('season', v as SpeciesInput['season'])}
                options={seasonOptions(CURRENT_SEASON, input.season)}
                error={shown.season}
                label="시즌 한정"
                className={css({ flex: '1 1 160px' })}
              />
            </div>
          </Card>

          <Card className={css({ p: '17px 20px' })}>
            <CardTitle title="슬롯 기본값" sub="아이템으로 덮어쓰면 그대로 교체됩니다." />
            <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
              {RIG_SLOTS.map((slot) => (
                <Select
                  key={slot}
                  value={input.slots[slot]}
                  onChange={(v) => set('slots', { ...input.slots, [slot]: v })}
                  options={SLOT_PARTS[slot]}
                  label={slot}
                  className={css({ flex: '1 1 180px' })}
                />
              ))}
            </div>
            {shown.slots && <p className={css({ m: '10px 0 0', textStyle: 'micro', color: 'rFg' })}>{shown.slots}</p>}
          </Card>
        </div>

        <SideCard input={input} errors={errors} />
      </div>

      <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: '8px', mt: '18px' })}>
        <Button type="button" onClick={() => navigate(SCREENS.species.path)}>
          취소
        </Button>
        <Button type="button" onClick={draft.saveNow} disabled={!touched}>
          임시 저장
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={save.isPending || codesUnknown}
          title={codesUnknown ? '종 목록을 확인하는 중입니다' : undefined}
        >
          {save.isPending ? '등록 중…' : '등록'}
        </Button>
      </div>
    </form>
  )
}

/**
 * 대표 색 입력.
 *
 * ⚠️ **`<input type="color">` 을 쓰지 않는다.** 그 선택기는 OS 창이라 다크 테마도
 *    키보드 흐름도 우리가 못 잡고, **고른 값이 정확히 무엇인지 운영자가 못 본다.**
 *    hex 를 직접 받고 옆에 스와치를 둔다 — 값이 곧 화면이다.
 */
function ToneField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '11px' })}>
      <Input
        value={value}
        onChange={onChange}
        label="대표 색"
        placeholder="#7DBAFF"
        hint="이 색을 옅게 깔아 종을 구분합니다"
        error={error}
        required
        className={css({ flex: '1 1 200px', maxWidth: '260px' })}
      />
      <span
        aria-hidden="true"
        className={css({
          flex: 'none',
          width: '38px',
          height: '38px',
          borderRadius: 'md',
          border: '1px solid token(colors.bd)',
          mb: error ? '24px' : '2px',
        })}
        style={{ background: value }}
      />
    </div>
  )
}

/** 미리보기 + 체크리스트. 체크는 `validateSpecies` 의 결과로 그린다 */
function SideCard({ input, errors }: { input: SpeciesInput; errors: ReturnType<typeof validateSpecies> }) {
  const checks = [
    { ok: !errors.name, label: errors.name ?? '종 이름 입력됨' },
    { ok: !errors.code, label: errors.code ?? '코드 확인됨' },
    { ok: !errors.tone, label: errors.tone ?? '대표 색 확인됨' },
    { ok: !errors.weight, label: errors.weight ?? '출현 가중치 설정됨' },
    { ok: !errors.season, label: errors.season ?? '시즌 확인됨' },
  ]

  return (
    <Card className={css({ flex: '1 1 300px', minWidth: '260px', maxWidth: '380px', p: '15px' })}>
      <CardTitle title="미리보기" />
      <div
        className={css({ mt: '12px', borderRadius: 'lg', overflow: 'hidden', border: '1px solid token(colors.ln)' })}
        style={{ background: errors.tone ? undefined : speciesTint(input.tone) }}
      >
        <AssetThumb assetId="rg" fluid alt="" className={css({ bg: 'transparent!' })} />
      </div>

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

      <p
        className={css({
          m: '14px 0 0',
          p: '10px 12px',
          borderRadius: 'md',
          bg: 'aBg',
          border: '1px solid token(colors.warnBd)',
          textStyle: 'micro',
          color: 'warnFg',
        })}
      >
        등록한 종은 <strong>미출현</strong> 상태로 만들어집니다. 아트가 붙은 뒤 상세에서
        「출현 재개」를 눌러 주세요.
      </p>
    </Card>
  )
}
