/**
 * 레벨 테이블 — 한 줄씩 고친다.
 *
 * **한동안 읽기 전용이었다.** 「CSV 로 통째로 갈아 끼우는 것이 실제 편집 방식이라 행 단위
 * 저장을 먼저 만들면 쓰이지 않는다」 고 판단했었다(docs/ARCHITECTURE.md §24.1.1).
 * 운영자가 한 줄씩 손보는 쪽을 쓰기로 하면서 열었다 — **CSV 는 여전히 남는다.**
 *
 * ⚠️ **고치면 그 행이 「검수 중」 으로 내려간다.** 여기 숫자는 **이미 그 레벨에 있는 회원**
 *    에게 적용된다 — 고친 채로 「적용」 이 남으면 검수를 건너뛴다 (§24.1.2).
 *
 * ⚠️ **경험치를 고치면 아래 행의 누적이 전부 움직인다.** 저장 전에 그 값을 보여 준다 —
 *    한 칸만 보고 누르면 표 절반이 바뀐 것을 모른 채 저장하게 된다.
 */
import { useState } from 'react'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'

import {
  applyLevelEdit,
  levelInputOf,
  LEVEL_STATUS_TONE,
  summarizeLevels,
  validateLevel,
  type Level,
  type LevelInput,
} from '@/domain/level'

import { useLevels, useSaveLevel } from '@/api/levels'

/** 표 한 줄 — 레벨과, 지금 편집 중이면 그 초안 */
type Row = { level: Level; editing: boolean; shifted: boolean }

export default function LevelsPage() {
  const { data, isPending, error } = useLevels()
  const save = useSaveLevel()
  const [lv, setLv] = useState<number | null>(null)
  const [draft, setDraft] = useState<LevelInput | null>(null)

  const errors = draft ? validateLevel(draft) : {}
  const invalid = Object.keys(errors).length > 0
  /*
    ⚠️ **저장될 표를 그대로 만들어 보여 준다.** 경험치를 고치면 **아래 모든 행의 누적**이
       움직이는데, 입력 칸만 바꿔 두면 그 사실이 화면에 안 나타난다 — 운영자는 한 칸을
       고쳤다고 생각하고 저장한다. 화면이 따로 계산하면 저장 결과와 갈리므로 도메인의
       같은 함수를 쓴다 (§24.1.2).
  */
  const shown =
    lv !== null && draft && !invalid
      ? applyLevelEdit(data?.levels ?? [], lv, draft)
      : data?.levels
  const summary = shown ? summarizeLevels(shown) : data?.summary

  const start = (l: Level) => {
    setLv(l.lv)
    setDraft(levelInputOf(l))
    save.reset()
  }

  const cancel = () => {
    setLv(null)
    setDraft(null)
    save.reset()
  }

  const commit = () => {
    if (lv === null || !draft || invalid) return
    save.mutate({ lv, input: draft }, { onSuccess: cancel })
  }

  return (
    <>
      <PageHeader
        title="레벨 테이블"
        sub="레벨별 필요 경험치와 보상입니다. 고치면 그 행은 검수 대기로 내려갑니다."
        actions={
          <>
            {/* TODO(밸런스 상수 업로드 API 가 생기면): 시즌 개편처럼 통째로 바꿀 때 쓴다 (§18.8) */}
            <Button disabled>CSV 가져오기 · 준비 중</Button>
          </>
        }
      />

      {save.error && <ErrorBanner message={save.error.message} />}

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <>
          <SkeletonStats count={4} min={150} className={css({ mb: '16px' })} />
          <SkeletonRows rows={8} silent />
        </>
      ) : error || !data || !shown || !summary ? (
        <ErrorBanner message={error?.message ?? '레벨 테이블을 불러오지 못했습니다.'} />
      ) : (
        <>
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              mb: '16px',
            })}
          >
            <StatTile label="만렙" value={`Lv ${num(summary.maxLv)}`} />
            <StatTile label="만렙까지 경험치" value={num(summary.totalExp)} />
            <StatTile label="만렙까지 젬" value={num(summary.totalGem)} />
            <StatTile
              label="검수 중"
              value={num(summary.reviewing)}
              alert={summary.reviewing > 0}
            />
          </div>

          <Table
            columns={columnsWith({ lv, draft, errors, setDraft, start, cancel, commit, save })}
            rows={toRows(shown, data.levels, lv)}
            minWidth={860}
            rowKey={(r) => String(r.level.lv)}
          />

          <p className={css({ m: '14px 0 0', textStyle: 'caption', color: 'faint' })}>
            「누적」 은 Lv 1 부터 그 레벨을 마치기까지 쌓인 합입니다 — 「필요 경험치」 를 더한
            값입니다. 고치는 행보다 **아래는 누적이 함께 움직입니다.**
          </p>
        </>
      )}
    </>
  )
}

/**
 * 보여 줄 표.
 *
 * `shifted` 는 **편집 때문에 누적이 움직인 행**이다 — 고친 행보다 아래가 전부 해당한다.
 * 표시해 주지 않으면 「한 칸만 고쳤다」 고 읽는다.
 */
function toRows(shown: Level[], original: Level[], editingLv: number | null): Row[] {
  return shown.map((level, i) => ({
    level,
    editing: level.lv === editingLv,
    shifted: editingLv !== null && level.total !== original[i]?.total,
  }))
}

type Wiring = {
  lv: number | null
  draft: LevelInput | null
  errors: ReturnType<typeof validateLevel>
  setDraft: (v: LevelInput) => void
  start: (l: Level) => void
  cancel: () => void
  commit: () => void
  save: ReturnType<typeof useSaveLevel>
}

/** 열 정의. **편집 상태를 알아야 해서** 상수가 아니라 함수다 */
function columnsWith(w: Wiring): Column<Row>[] {
  const busy = w.save.isPending
  const invalid = Object.keys(w.errors).length > 0

  return [
    {
      key: 'lv',
      label: 'Lv',
      width: '58px',
      align: 'right',
      strong: true,
      render: (r) => r.level.lv,
    },
    {
      key: 'need',
      label: '필요 경험치',
      width: '130px',
      align: 'right',
      render: (r) =>
        r.editing && w.draft ? (
          <Input
            /* ⚠️ 표 안의 입력은 **행마다 이름이 달라야** 어느 줄인지 알 수 있다 (§37) */
            aria-label={`Lv ${r.level.lv} 필요 경험치`}
            type="number"
            min={1}
            value={String(w.draft.need)}
            error={w.errors.need}
            disabled={busy}
            onChange={(v) => w.setDraft({ ...w.draft!, need: Number(v) })}
          />
        ) : (
          num(r.level.need)
        ),
    },
    {
      key: 'total',
      label: '누적',
      width: '130px',
      align: 'right',
      // 앞 행들의 필요 경험치 합이다. 회색으로 낮춰 「필요 경험치」 와 헷갈리지 않게 한다.
      render: (r) => (
        <span
          className={css({
            color: r.shifted ? 'priD' : 'sub',
            fontWeight: r.shifted ? '700' : undefined,
          })}
        >
          {num(r.level.total)}
          {r.shifted && <span className={css({ ml: '3px' })}>↕</span>}
        </span>
      ),
    },
    {
      key: 'gem',
      label: '젬 보상',
      width: '110px',
      align: 'right',
      render: (r) =>
        r.editing && w.draft ? (
          <Input
            /* ⚠️ 표 안의 입력은 **행마다 이름이 달라야** 어느 줄인지 알 수 있다 (§37) */
            aria-label={`Lv ${r.level.lv} 젬 보상`}
            type="number"
            min={0}
            value={String(w.draft.gem)}
            error={w.errors.gem}
            disabled={busy}
            onChange={(v) => w.setDraft({ ...w.draft!, gem: Number(v) })}
          />
        ) : (
          num(r.level.gem)
        ),
    },
    {
      key: 'unlock',
      label: '해금',
      truncate: true,
      render: (r) =>
        r.editing && w.draft ? (
          <Input
            aria-label={`Lv ${r.level.lv} 해금`}
            value={w.draft.unlock}
            error={w.errors.unlock}
            disabled={busy}
            onChange={(v) => w.setDraft({ ...w.draft!, unlock: v })}
          />
        ) : (
          r.level.unlock
        ),
    },
    {
      key: 'status',
      label: '상태',
      width: '90px',
      align: 'center',
      render: (r) => <Badge tone={LEVEL_STATUS_TONE[r.level.status]}>{r.level.status}</Badge>,
    },
    {
      // 화면에는 제목이 군더더기지만 **비우면 이 열의 칸들이 헤더를 잃는다** (§38).
      key: 'edit',
      label: '편집',
      labelHidden: true,
      width: '128px',
      align: 'center',
      render: (r) =>
        r.editing ? (
          <div className={css({ display: 'flex', gap: '6px', justifyContent: 'center' })}>
            <Button onClick={w.cancel} disabled={busy}>
              취소
            </Button>
            <Button variant="primary" onClick={w.commit} disabled={busy || invalid}>
              저장
            </Button>
          </div>
        ) : (
          /*
            ⚠️ **행마다 이름이 달라야 한다.** 「수정」 만 열네 개면 스크린리더로 훑을 때
               어느 행의 것인지 알 수 없다 (§37).
          */
          <Button
            onClick={() => w.start(r.level)}
            disabled={w.lv !== null}
            aria-label={`Lv ${r.level.lv} 수정`}
          >
            수정
          </Button>
        ),
    },
  ]
}
