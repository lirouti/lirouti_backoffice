/**
 * 코드 그룹 상세 — 값 순서 · 노출 · 사용처.
 *
 * ⚠️ **쓰이는 값은 지울 수 없다.** 412건이 그 코드를 들고 있는데 지우면 그 데이터가
 *    무엇인지 알 수 없게 된다 — 감추기가 그 자리다 (docs/ARCHITECTURE.md §29.1).
 */
import { useState } from 'react'

import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { moveSlot } from '@/shared/lib/array'
import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonHeader, SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Switch } from '@/shared/ui/Switch'
import { Table, type Column } from '@/shared/ui/Table'

import { canDeleteValue, CODE_LOG_TONE, CODE_TONE_BADGE, type CodeLog, type CodeValue } from '@/domain/code'
import { SCREENS } from '@/domain/screens'

import { useCodeGroup, useSaveCodeValues, type CodeGroupDetail } from '@/api/codes'

import { useUnsavedGuard } from '@/stores/dirtyStore'

const LOG_COLUMNS: Column<CodeLog>[] = [
  { key: 'at', label: '일시', width: '140px', nowrap: true },
  {
    key: 'kind',
    label: '구분',
    width: '96px',
    render: (l) => <Badge tone={CODE_LOG_TONE[l.kind]}>{l.kind}</Badge>,
  },
  { key: 'what', label: '변경 내용', truncate: true },
  { key: 'by', label: '처리자', width: '84px' },
]

export default function CodeDetailPage() {
  const { codeId = '' } = useParams()
  const { data, isPending, error } = useCodeGroup(codeId)

  if (isPending) {
    // ⚠️ **제목을 그릴 수 없다** — 상세 화면의 제목은 불러온 값이다(「소이」 · 「첫 알」).
    //    그래서 헤더도 자리만 잡는다. 아는 것과 모르는 것을 섞지 않는다 (docs/ARCHITECTURE.md §43.2).

    return (
      <>
        <SkeletonHeader />
        <SkeletonStats count={3} min={150} silent />

        <SkeletonRows rows={5} silent />
      </>
    )
  }
  if (error || !data)
    return <ErrorBanner message={error?.message ?? '코드 그룹을 불러오지 못했습니다.'} />

  return <Detail detail={data} />
}

function Detail({ detail: { group: g, logs } }: { detail: CodeGroupDetail }) {
  const navigate = useNavigate()
  const save = useSaveCodeValues()
  const [draft, setDraft] = useState<CodeValue[] | null>(null)
  const markSaved = useUnsavedGuard(draft !== null)

  const values = draft ?? g.values
  const dirty = draft !== null
  const hidden = values.filter((v) => !v.visible).length

  const move = (i: number, delta: number) => setDraft(moveSlot(values, i, i + delta))

  const setVisible = (code: string, visible: boolean) =>
    setDraft(values.map((v) => (v.code === code ? { ...v, visible } : v)))

  const remove = (code: string) => setDraft(values.filter((v) => v.code !== code))

  const commit = () =>
    save.mutate({ codeId: g.key, values }, { onSuccess: () => { setDraft(null); markSaved() } })

  return (
    <>
      <PageHeader
        title={g.name}
        sub={g.note}
        actions={
          <>
            <Button onClick={() => navigate(SCREENS.codes.path)}>목록</Button>
            <Button variant="primary" onClick={commit} disabled={!dirty || save.isPending}>
              {dirty ? '저장' : '저장됨'}
            </Button>
          </>
        }
      />

      {save.error && <ErrorBanner message={save.error.message} />}

      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px', flexWrap: 'wrap' })}>
        <Badge>{g.category}</Badge>
        <span className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })}>{g.codeKey}</span>
        <span className={css({ textStyle: 'caption', color: 'faint' })}>
          {g.updatedAt} · {g.updatedBy}
        </span>
      </div>

      {/*
        지우기 전에 무엇이 걸려 있는지 말한다. 「N개 화면이 참조한다」 가 이 화면의
        가장 중요한 문장이다 — 값 하나가 여러 화면을 동시에 바꾼다.
      */}
      {g.usages.length > 0 && (
        <p
          className={css({
            m: '0 0 16px',
            p: '11px 14px',
            borderRadius: 'lg',
            bg: 'aBg',
            border: '1px solid token(colors.warnBd)',
            textStyle: 'caption',
            color: 'warnFg',
          })}
        >
          <strong>{num(g.usages.length)}개 화면이 이 코드를 참조합니다.</strong> 쓰이는 값을 감추면 기존
          데이터는 남고 새로 고를 수만 없습니다. <strong>지우는 것은 되돌릴 수 없습니다.</strong>
        </p>
      )}

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          mb: '16px',
        })}
      >
        <StatTile label="코드 값" value={num(values.length)} />
        <StatTile label="감춘 값" value={num(hidden)} alert={hidden > 0} />
        <StatTile label="총 사용 건수" value={num(values.reduce((s, v) => s + v.uses, 0))} />
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <Card className={css({ flex: '2 1 460px', minWidth: '0', p: '15px 17px' })}>
          <CardTitle title="코드 값" sub="순서를 바꾸면 드롭다운 순서도 함께 바뀝니다." />
          <ol className={css({ listStyle: 'none', m: '13px 0 0', p: '0' })}>
            {values.map((v, i) => (
              <ValueRow
                key={v.code}
                value={v}
                n={i + 1}
                onUp={i === 0 ? undefined : () => move(i, -1)}
                onDown={i === values.length - 1 ? undefined : () => move(i, 1)}
                onToggle={(visible) => setVisible(v.code, visible)}
                onRemove={() => remove(v.code)}
                busy={save.isPending}
              />
            ))}
          </ol>
        </Card>

        <Card className={css({ flex: '1 1 260px', minWidth: '0', p: '15px' })}>
          <CardTitle title="사용처" sub="이 코드를 쓰는 화면입니다." />
          {g.usages.length === 0 ? (
            <p className={css({ m: '12px 0 0', textStyle: 'body', color: 'faint' })}>
              아직 어느 화면도 쓰지 않습니다.
            </p>
          ) : (
            <ul className={css({ listStyle: 'none', m: '12px 0 0', p: '0', display: 'flex', flexDirection: 'column', gap: '8px' })}>
              {g.usages.map((u) => (
                <li key={`${u.screen}-${u.where}`}>
                  <button
                    type="button"
                    onClick={() => navigate(SCREENS[u.screen].path)}
                    className={css({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      width: '100%',
                      textAlign: 'left',
                      p: '9px 11px',
                      borderRadius: 'lg',
                      border: '1px solid token(colors.bd)',
                      bg: 'surf',
                      cursor: 'pointer',
                      _hover: { bg: 'hov' },
                      _focusVisible: { outline: '2px solid token(colors.ringBd)', outlineOffset: '2px' },
                    })}
                  >
                    <span className={css({ flex: '1', minWidth: '0' })}>
                      <span className={css({ display: 'block', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
                        {SCREENS[u.screen].label}
                      </span>
                      <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>{u.where}</span>
                    </span>
                    <span aria-hidden="true" className={css({ flex: 'none', color: 'faint2' })}>
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className={css({ mt: '18px' })}>
        <Card className={css({ p: '15px 17px' })}>
          <CardTitle title="변경 이력" />
          <div className={css({ mt: '13px' })}>
            <Table columns={LOG_COLUMNS} rows={logs} minWidth={620} rowKey={(l) => `${l.at}-${l.kind}`} />
          </div>
        </Card>
      </div>
    </>
  )
}

function ValueRow({
  value: v,
  n,
  onUp,
  onDown,
  onToggle,
  onRemove,
  busy,
}: {
  value: CodeValue
  n: number
  onUp?: () => void
  onDown?: () => void
  onToggle: (visible: boolean) => void
  onRemove: () => void
  busy: boolean
}) {
  const deletable = canDeleteValue(v)

  return (
    <li
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        p: '10px 0',
        borderBottom: '1px solid token(colors.ln)',
      })}
    >
      <span className={css({ flex: 'none', width: '22px', textStyle: 'caption', color: 'faint', textAlign: 'right' })}>
        {n}
      </span>
      <span className={css({ flex: 'none', width: '120px', fontFamily: 'mono', textStyle: 'caption', color: 'ink' })}>
        {v.code}
      </span>
      <span className={css({ flex: '1', minWidth: '0' })}>
        <Badge tone={CODE_TONE_BADGE[v.tone]}>{v.label}</Badge>
      </span>
      <span className={css({ flex: 'none', width: '86px', textAlign: 'right', textStyle: 'caption', color: 'sub' })}>
        {num(v.uses)}건
      </span>
      <span className={css({ flex: 'none' })}>
        {/* 줄마다 스위치가 있으므로 이름은 다 적고 화면에서만 감춘다 (§27.2) */}
        <Switch checked={v.visible} onChange={onToggle} disabled={busy} label={`${v.label} 노출`} labelHidden />
      </span>
      <span className={css({ display: 'flex', gap: '4px' })}>
        <Button onClick={onUp} disabled={busy || !onUp} aria-label={`${v.label} 위로`}>
          ↑
        </Button>
        <Button onClick={onDown} disabled={busy || !onDown} aria-label={`${v.label} 아래로`}>
          ↓
        </Button>
        {/* ⚠️ 쓰이는 값은 지울 수 없다. 없애지 않고 잠가 이유를 라벨에 적는다 (§18.8) */}
        <Button variant="danger" onClick={onRemove} disabled={busy || !deletable}>
          {deletable ? '삭제' : '사용 중'}
        </Button>
      </span>
    </li>
  )
}
