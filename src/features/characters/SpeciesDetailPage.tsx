/**
 * 종 상세 — 읽기 + **운영 설정만** 인라인 수정.
 *
 * 종 자체와 아트는 캐릭터팀 소유라 읽기 전용이다 (docs/ARCHITECTURE.md §19.2).
 */
import { useState } from 'react'

import { useParams } from 'react-router'

import { css } from 'styled-system/css'

import { date, num, pct } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Select } from '@/shared/ui/Select'
import { Table, type Column } from '@/shared/ui/Table'

import { CURRENT_SEASON, seasonOptions } from '@/domain/season'
import {
  appearanceLabel,
  appearanceShare,
  appearanceTone,
  RARITY_TONE,
  RIG_SLOTS,
  SLOT_PARTS,
  speciesTint,
  toSpeciesInput,
  UNLOCKS,
  validateSpecies,
  type RigSlot,
  type SpeciesInput,
  type SpeciesLog,
} from '@/domain/species'

import { useSaveSpecies, useSetSpeciesHidden, useSpecies, type SpeciesDetail } from '@/api/species'

import { useUnsavedGuard } from '@/stores/dirtyStore'

/**
 * 슬롯별 비고. 원본이 종마다 같은 문구를 보여 준다.
 *
 * ⚠️ **「덮어쓰기」 는 아이템 얘기지 운영자 얘기가 아니다.** 몸은 의상이 붙는 바탕이라
 *    의상이 그 위에 얹힐 뿐 몸 자체를 갈아끼우지 않는다 — 그래서 「불가」다. 하지만
 *    **종의 기본 몸은 종마다 다르다**(모루가 「통통한 몸」을 쓴다). 그래서 여섯 슬롯
 *    모두 편집할 수 있다. 이 둘을 헷갈려 몸을 읽기 전용으로 만들면 모루의 값을
 *    고칠 수 없게 된다.
 */
const SLOT_NOTE: Record<RigSlot, string> = {
  정수리: '아이템으로 덮어쓸 수 있습니다',
  눈: '아이템으로 덮어쓸 수 있습니다',
  부리: '아이템으로 덮어쓸 수 있습니다',
  꼬리: '아이템으로 덮어쓸 수 있습니다',
  몸: '의상이 붙는 바탕이라 덮어쓰지 않습니다',
  손: '의상 소매가 이 위에 얹힙니다',
}

/** 아이템이 덮어쓸 수 **없는** 슬롯 */
const NO_OVERWRITE: RigSlot = '몸'

/**
 * 종 상세.
 *
 * **어드민이 만지는 것은 운영 설정뿐이다** — 슬롯 기본값 · 출현 가중치 · 해금 조건 · 시즌.
 * 종 자체와 아트는 캐릭터팀 소유라 읽기 전용이고, 「아트 저장소 열기」로 나간다
 * (docs/ARCHITECTURE.md §19.2).
 */
export default function SpeciesDetailPage() {
  const { speciesId = '' } = useParams()
  const { data, isPending, error } = useSpecies(speciesId)

  if (isPending) return <Skeleton rows={8} />
  if (error || !data) {
    return <ErrorBanner message={error?.message ?? '종을 불러오지 못했습니다.'} />
  }

  return <Detail detail={data} speciesId={speciesId} />
}

function Detail({ detail, speciesId }: { detail: SpeciesDetail; speciesId: string }) {
  const save = useSaveSpecies()
  const toggle = useSetSpeciesHidden()
  // 편집 중에만 존재하는 초안. `null` 이면 읽기 모드다.
  const [draft, setDraft] = useState<SpeciesInput | null>(null)
  // 편집 중이면 저장 안 된 변경이 있는 것이다 — 탭을 닫으면 사라진다.
  const markSaved = useUnsavedGuard(draft != null)

  const { species, logs, all } = detail
  // 자기 코드는 빼고 넘긴다. 안 그러면 고치지 않고 저장해도 "이미 쓰는 코드" 가 뜬다.
  const taken = all.filter((s) => s.key !== species.key).map((s) => s.code)
  const errors = draft ? validateSpecies(draft, taken) : {}
  const blocked = Object.keys(errors).length > 0
  const share = appearanceShare(species, all)

  const set = <K extends keyof SpeciesInput>(k: K, v: SpeciesInput[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d))

  const submit = () => {
    if (!draft || blocked) return
    save.mutate(
      { speciesId, input: draft },
      {
        onSuccess: () => {
          setDraft(null)
          // ⚠️ 표시를 지금 지운다 — `draft` 가 `null` 이 되어도 스토어에 닿는 건 다음 effect 다.
          markSaved()
        },
      },
    )
  }

  return (
    <>
      <PageHeader
        title={species.name}
        sub={species.note}
        actions={
          <>
            <Button
              onClick={() => toggle.mutate({ speciesId, hidden: !species.hidden })}
              disabled={toggle.isPending}
            >
              {species.hidden ? '출현 재개' : '출현 중단'}
            </Button>
            {/*
              ⚠️ **주소를 아직 모른다.** 예시 도메인을 넣어 두면 눌렀을 때 엉뚱한 데로 가고,
              그건 "이 도구는 고장났다" 를 학습시킨다 — 헤더의 가짜 검색창을 지운 것과 같은
              이유다 (docs/ARCHITECTURE.md §18.8). 자리는 두되 잠그고, **잠긴 이유를 라벨에**
              적는다 — `title` 은 disabled 버튼에서 포커스가 안 가 뜨지 않고, 스크린리더도
              읽어 주지 않는다.
              TODO(아트 저장소 주소가 정해지면): `<a href target="_blank" rel="noreferrer noopener">` 로 바꾼다
            */}
            <Button disabled>아트 저장소 열기 · 준비 중</Button>
          </>
        }
      />

      {save.error && <ErrorBanner message={save.error.message} />}
      {toggle.error && <ErrorBanner message={toggle.error.message} />}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '1 1 300px', minWidth: '260px', maxWidth: '380px', p: '15px' })}>
          <div
            className={css({ borderRadius: 'lg', overflow: 'hidden', border: '1px solid token(colors.ln)' })}
            style={{ background: speciesTint(species.tone) }}
          >
            <AssetThumb assetId="rg" fluid alt={`${species.name} 미리보기`} className={css({ bg: 'transparent!' })} />
          </div>

          <CardTitle title="정보" />
          <dl className={css({ m: '0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
            <Row k="코드" v={species.code} mono />
            <Row k="희귀도" v={<Badge tone={RARITY_TONE[species.rarity]}>{species.rarity}</Badge>} />
            <Row k="상태" v={<Badge tone={appearanceTone(species.hidden)}>{appearanceLabel(species.hidden)}</Badge>} />
            <Row k="보유 유저" v={`${num(species.owners)}명`} />
            <Row k="등록일" v={date(species.madeAt)} />
            <Row k="아트 담당" v={species.by} />
          </dl>
        </Card>

        <div className={css({ flex: '3 1 460px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' })}>
          <Card className={css({ p: '17px 20px' })}>
            <div className={css({ display: 'flex', alignItems: 'flex-start', gap: '12px' })}>
              <div className={css({ flex: '1', minWidth: '0' })}>
                <CardTitle title="출현 설정" sub="뽑기에 얼마나 자주 나오는지와 얻는 조건입니다." />
              </div>
              {draft ? (
                <div className={css({ display: 'flex', gap: '7px', flex: 'none' })}>
                  <Button onClick={() => setDraft(null)} disabled={save.isPending}>
                    취소
                  </Button>
                  <Button variant="primary" onClick={submit} disabled={blocked || save.isPending}>
                    {save.isPending ? '저장 중…' : '저장'}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setDraft(toSpeciesInput(species))} className={css({ flex: 'none' })}>
                  설정 수정
                </Button>
              )}
            </div>

            <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px' })}>
              {draft ? (
                <>
                  <Input
                    value={String(draft.weight)}
                    // 숫자만 남긴다 — 원본이 `replace(/\D/g,'')` 로 같은 일을 한다.
                    onChange={(v) => set('weight', Number(v.replace(/\D/g, '')) || 0)}
                    label="출현 가중치"
                    error={errors.weight}
                    hint={`같은 희귀도끼리 견준 비율이 확률입니다`}
                    required
                    className={css({ flex: '1 1 160px' })}
                  />
                  <Select
                    value={draft.unlock}
                    onChange={(v) => set('unlock', v as SpeciesInput['unlock'])}
                    options={UNLOCKS}
                    label="해금 조건"
                    className={css({ flex: '1 1 180px' })}
                  />
                  <Select
                    value={draft.season}
                    onChange={(v) => set('season', v as SpeciesInput['season'])}
                    options={seasonOptions(CURRENT_SEASON)}
                    label="시즌 한정"
                    className={css({ flex: '1 1 160px' })}
                  />
                </>
              ) : (
                <>
                  <Field k="출현 가중치" v={`${num(species.weight)} · ${pct(share, 1)}`} />
                  <Field k="해금 조건" v={species.unlock} />
                  <Field k="시즌 한정" v={species.season} />
                </>
              )}
            </div>
          </Card>

          <Card className={css({ p: '17px 20px' })}>
            <CardTitle title="슬롯 기본값" sub="아이템으로 덮어쓰면 그대로 교체됩니다." />
            <div className={css({ mt: '12px', display: 'flex', flexDirection: 'column', gap: '10px' })}>
              {RIG_SLOTS.map((slot) => (
                <div key={slot} className={css({ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' })}>
                  <span className={css({ width: '64px', flex: 'none', textStyle: 'label', fontWeight: '700', color: 'sub' })}>
                    {slot}
                  </span>
                  {draft ? (
                    <Select
                      value={draft.slots[slot]}
                      onChange={(v) => set('slots', { ...draft.slots, [slot]: v })}
                      options={SLOT_PARTS[slot]}
                      aria-label={`${slot} 기본 부품`}
                      className={css({ flex: '1 1 180px', maxWidth: '220px' })}
                    />
                  ) : (
                    <span className={css({ flex: '1 1 180px', textStyle: 'body', color: 'ink' })}>
                      {species.slots[slot]}
                    </span>
                  )}
                  <Badge tone={slot === NO_OVERWRITE ? 'neutral' : 'success'}>
                    {slot === NO_OVERWRITE ? '덮어쓰기 불가' : '덮어쓰기 가능'}
                  </Badge>
                  <span className={css({ flex: '2 1 200px', textStyle: 'caption', color: 'faint' })}>
                    {SLOT_NOTE[slot]}
                  </span>
                </div>
              ))}
            </div>
            {errors.slots && (
              <p className={css({ m: '10px 0 0', textStyle: 'micro', color: 'rFg' })}>{errors.slots}</p>
            )}
          </Card>

          <Card className={css({ p: '0', overflow: 'hidden' })}>
            <div className={css({ p: '17px 20px 0' })}>
              <CardTitle title="변경 이력" />
            </div>
            <Table columns={LOG_COLUMNS} rows={logs} minWidth={620} className={css({ border: '0' })} />
          </Card>
        </div>
      </div>
    </>
  )
}

const LOG_COLUMNS: Column<SpeciesLog>[] = [
  { key: 'at', label: '일시', width: '150px', nowrap: true },
  { key: 'kind', label: '구분', width: '90px', strong: true },
  { key: 'what', label: '변경 내용', truncate: true },
  { key: 'by', label: '처리자', width: '100px' },
]

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '72px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textAlign: 'right',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
        })}
        style={mono ? { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } : undefined}
      >
        {v}
      </dd>
    </div>
  )
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ flex: '1 1 160px' })}>
      <div className={css({ textStyle: 'caption', color: 'faint' })}>{k}</div>
      <div className={css({ mt: '3px', textStyle: 'body', fontWeight: '700', color: 'ink' })}>{v}</div>
    </div>
  )
}
