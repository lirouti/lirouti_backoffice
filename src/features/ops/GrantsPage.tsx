/**
 * 지급 · 회수 — 되돌릴 수 없는 화면.
 *
 * **실행 전에 대상 수를 세어 보여 준다.** 오타 난 회원 ID 를 조용히 넘기거나
 * 전체 대상을 잘못 잡으면 24,180명에게 나간다 (docs/ARCHITECTURE.md §25.3).
 */
import { useState } from 'react'

import { useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Table, type Column } from '@/shared/ui/Table'
import { Textarea } from '@/shared/ui/Textarea'

import {
  GRANT_KIND_TONE,
  isCoin,
  validateGrant,
  type GrantAsset,
  type GrantInput,
  type GrantKind,
  type GrantLog,
  type GrantTarget,
} from '@/domain/ops'

import { useCheckTargets, useGrants, useRunGrant } from '@/api/ops'

import { useViewer } from '@/stores/viewerStore'

import { grantWhoFrom } from './query'

const KINDS: GrantKind[] = ['지급', '회수']
/** ⚠️ 「등급」 은 뺐다 — 회원 등급이 아직 없어서 고를 것이 없다 (§25.3) */
const TARGETS: GrantTarget[] = ['개별', '전체']
const ASSETS: GrantAsset[] = ['파란보석', '노란보석', '아이템']

const EMPTY: GrantInput = {
  kind: '지급',
  target: '개별',
  who: '',
  asset: '파란보석',
  qty: 100,
  itemKey: null,
  why: '',
}

const COLUMNS: Column<GrantLog>[] = [
  { key: 'at', label: '일시', width: '140px', nowrap: true },
  {
    key: 'kind',
    label: '유형',
    width: '74px',
    render: (g) => <Badge tone={GRANT_KIND_TONE[g.kind]}>{g.kind}</Badge>,
  },
  { key: 'what', label: '항목', width: '120px', truncate: true },
  { key: 'qty', label: '수량', width: '84px', align: 'right', render: (g) => num(g.qty) },
  { key: 'who', label: '대상', width: '150px', truncate: true },
  { key: 'why', label: '사유', truncate: true },
  { key: 'by', label: '처리자', width: '84px' },
]

export default function GrantsPage() {
  const [params] = useSearchParams()
  const viewer = useViewer()
  const { data, isPending, error } = useGrants()
  const check = useCheckTargets()
  const run = useRunGrant()
  const [form, setForm] = useState<GrantInput>(() => ({ ...EMPTY, who: grantWhoFrom(params) }))
  const [asking, setAsking] = useState(false)
  // ⚠️ 누르기 전에는 빨갛게 하지 않는다 — 열자마자 혼난 기분이 든다(§18.7).
  const [tried, setTried] = useState(false)
  // 확인이 무효가 됐을 때 그 사실을 말한다. 아래 `set` 참고.
  const [stale, setStale] = useState(false)

  const errors = validateGrant(form)
  const coin = isCoin(form.asset)

  const set = <K extends keyof GrantInput>(k: K, v: GrantInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    // ⚠️ **확인해 둔 대상 수는 조건이 바뀌는 순간 거짓이 된다.** 버리되, 버렸다는 것을
    //    말한다 — 도는 중에 버리면 `onSuccess` 가 안 불려 **눌러도 아무 일이 없다**(§25.3.2).
    if (check.isPending || check.data) {
      check.reset()
      setStale(true)
    }
  }

  const ask = () => {
    setTried(true)
    setStale(false)
    if (Object.keys(errors).length > 0) return
    // 확인 창에 **몇 명인지** 적으려면 먼저 세야 한다.
    // 0명이면 확인할 것이 없으므로 창을 열지 않고 그 자리에서 말한다.
    check.mutate(form, { onSuccess: (res) => setAsking(res.count > 0) })
  }

  const commit = () => {
    // 확인한 그 입력으로 실행한다. 창이 떠 있는 동안은 배경이 inert 라 폼이 안 바뀌지만,
    // **보여 준 것과 보내는 것이 같다**는 것을 코드로 못박아 둔다.
    const checked = check.variables
    if (!checked || (check.data?.count ?? 0) === 0) return
    run.mutate(
      { input: checked, by: viewer.name },
      {
        onSuccess: () => {
          setAsking(false)
          setTried(false)
          setStale(false)
          setForm(EMPTY)
          check.reset()
        },
      },
    )
  }

  const shown = check.variables ?? form
  const count = check.data?.count ?? 0
  const missing = check.data?.missing ?? []

  return (
    <>
      <PageHeader
        title="지급 · 회수"
        sub="유저에게 재화나 아이템을 지급하거나 회수합니다. 모든 처리는 사유와 함께 기록됩니다."
      />

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <>
          <SkeletonStats count={4} min={140} className={css({ mb: '16px' })} />
          <SkeletonRows rows={8} silent />
        </>
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? '이력을 불러오지 못했습니다.'} />
      ) : (
        <>
          {(check.error || run.error) && (
            <ErrorBanner message={(check.error ?? run.error)!.message} />
          )}

          {/* 확인이 도는 사이에 입력을 바꾸면 그 확인은 버려진다. 조용히 넘기면 「눌러도 아무 일이 없다」 가 된다 */}
          {stale && (
            <ErrorBanner message="입력이 바뀌어 대상 확인이 취소됐습니다. 「대상 확인 후 실행」 을 다시 누르세요." />
          )}

          {/* 0명이면 확인할 것이 없다 — 창을 열지 않고 못 찾은 ID 를 그 자리에서 보여 준다 */}
          {check.data && count === 0 && (
            <ErrorBanner
              message={
                missing.length > 0
                  ? `대상 회원이 없습니다. 찾지 못한 ID — ${missing.join(', ')}`
                  : '대상 회원이 없습니다.'
              }
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
            <Card className={css({ flex: '1 1 340px', maxWidth: '440px', p: '15px 17px' })}>
              <CardTitle title="새 처리" sub="실행 전에 대상 수를 확인합니다." />

              <div
                className={css({
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '13px',
                  mt: '13px',
                })}
              >
                <Field label="처리 유형">
                  <Segmented
                    value={form.kind}
                    onChange={(v) => set('kind', v)}
                    options={KINDS}
                    aria-label="처리 유형"
                  />
                </Field>

                <Field label="대상" hint="회원 등급별 지급은 등급이 생기면 추가됩니다.">
                  <Segmented
                    value={form.target}
                    onChange={(v) => set('target', v)}
                    options={TARGETS}
                    aria-label="대상"
                  />
                </Field>

                {form.target === '개별' && (
                  <Input
                    value={form.who}
                    onChange={(v) => set('who', v)}
                    label="회원 ID"
                    placeholder="U-10240, U-10253"
                    hint="쉼표·줄바꿈으로 여러 명"
                    error={tried ? errors.who : undefined}
                    required
                  />
                )}

                <Field label="지급 항목">
                  <Segmented
                    value={form.asset}
                    onChange={(v) => set('asset', v)}
                    options={ASSETS}
                    aria-label="지급 항목"
                  />
                </Field>

                {coin ? (
                  <Input
                    value={String(form.qty)}
                    // 숫자만 받는다 — 문자를 넣으면 NaN 이 되어 검증이 통과해 버린다.
                    onChange={(v) => set('qty', Number(v.replace(/\D/g, '')) || 0)}
                    label="수량"
                    inputMode="numeric"
                    error={tried ? errors.qty : undefined}
                    required
                  />
                ) : (
                  <Select
                    value={form.itemKey === null ? '' : String(form.itemKey)}
                    onChange={(v) => set('itemKey', v === '' ? null : Number(v))}
                    label="아이템"
                    // 빈 값을 선택지로 두지 않는다 — `placeholder` 가 「아직 안 골랐음」 을 맡는다.
                    placeholder="고르세요"
                    options={data.itemOptions.map((it) => ({
                      value: String(it.key),
                      label: it.name,
                    }))}
                    error={tried ? errors.itemKey : undefined}
                    required
                  />
                )}

                <Textarea
                  value={form.why}
                  onChange={(v) => set('why', v)}
                  label="사유"
                  placeholder="예: 8/13 서버 점검 보상"
                  hint="감사 로그에 남습니다"
                  error={tried ? errors.why : undefined}
                  required
                  rows={2}
                />
              </div>

              <p
                className={css({
                  m: '14px 0 0',
                  p: '10px 13px',
                  borderRadius: 'lg',
                  bg: 'aBg',
                  border: '1px solid token(colors.warnBd)',
                  textStyle: 'caption',
                  color: 'warnFg',
                })}
              >
                <strong>되돌릴 수 없습니다.</strong> 관리자 지급분은 <strong>무상</strong>으로
                적립되어 환불 대상에서 빠집니다.
              </p>

              <div className={css({ display: 'flex', gap: '8px', mt: '13px' })}>
                <Button
                  variant="primary"
                  onClick={ask}
                  disabled={check.isPending || run.isPending}
                >
                  {check.isPending ? '대상 확인 중…' : '대상 확인 후 실행'}
                </Button>
              </div>
            </Card>

            <div className={css({ flex: '2 1 460px', minWidth: '0' })}>
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                  mb: '16px',
                })}
              >
                <StatTile label="지급" value={`${num(data.summary.granted)}건`} />
                <StatTile label="회수" value={`${num(data.summary.reclaimed)}건`} />
                <StatTile label="지급 재화" value={num(data.summary.coins)} />
                <StatTile label="전체 대상" value={`${num(data.allUserCount)}명`} />
              </div>

              <Table
                columns={COLUMNS}
                rows={data.logs}
                minWidth={880}
                rowKey={(g) => String(g.key)}
              />
            </div>
          </div>

          <Dialog
            open={asking}
            onCancel={() => setAsking(false)}
            onConfirm={commit}
            title={`${shown.kind} 실행`}
            tone="danger"
            confirmLabel={run.isPending ? '실행 중…' : `${count}명에게 ${shown.kind}`}
            body={
              <>
                <strong>{count}명</strong>
                에게{' '}
                {isCoin(shown.asset)
                  ? `${shown.asset} ${num(shown.qty)}개`
                  : (data.itemOptions.find((it) => it.key === shown.itemKey)?.name ?? '아이템')}
                를 {shown.kind}합니다. 되돌릴 수 없습니다.
                {missing.length > 0 && (
                  <span
                    className={css({
                      display: 'block',
                      mt: '9px',
                      color: 'rFg',
                      fontWeight: '600',
                    })}
                  >
                    {/* 못 찾은 id 를 숨기면 운영자는 전부 줬다고 믿는다 */}
                    찾지 못한 회원 {missing.length}명은 제외됩니다 — {missing.join(', ')}
                  </span>
                )}
              </>
            }
          />
        </>
      )}
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={css({ mb: '6px', textStyle: 'label', fontWeight: '600', color: 'ink' })}>{label}</div>
      {children}
      {hint && <p className={css({ m: '5px 0 0', textStyle: 'micro', color: 'faint' })}>{hint}</p>}
    </div>
  )
}
