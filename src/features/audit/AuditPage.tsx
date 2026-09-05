/**
 * 감사 로그 — 추가만 되는 기록.
 *
 * ⚠️ **선택은 필터를 따라간다.** 원본은 고른 기록을 배열 번호로 들고 있어서, 필터로
 *    목록에서 사라진 기록의 상세가 옆에 그대로 남았다 (docs/ARCHITECTURE.md §32.6).
 */
import { Link, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { toCsv, type CsvColumn } from '@/shared/lib/csv'
import { downloadCsv } from '@/shared/lib/download'
import { num } from '@/shared/lib/format'
import { today } from '@/shared/lib/today'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { SkeletonRows, SkeletonStats } from '@/shared/ui/Skeleton'
import { StatTile } from '@/shared/ui/StatTile'
import { Switch } from '@/shared/ui/Switch'
import { Table, type Column } from '@/shared/ui/Table'

import {
  AUDIT_CATEGORIES,
  AUDIT_KEEP_YEARS,
  AUDIT_KIND_TONE,
  isUnchanged,
  type AuditCategory,
  type AuditFilter,
  type AuditLog,
} from '@/domain/audit'
import { SCREENS } from '@/domain/screens'

import { useAuditLogs } from '@/api/audit'

const ALL = '전체'

const CATEGORY_OPTIONS = [ALL, ...AUDIT_CATEGORIES]

const isCategory = (v: string | null): v is AuditCategory =>
  AUDIT_CATEGORIES.some((c) => c === v)

/** 훅이 이 값을 인자로 받으므로 모듈 함수로 둔다 (§14.2) */
const filterOf = (p: URLSearchParams): AuditFilter => {
  const category = p.get('cat')
  return {
    q: p.get('q') ?? undefined,
    by: p.get('by') ?? undefined,
    category: isCategory(category) ? category : undefined,
    riskyOnly: p.get('risky') === '1',
  }
}

export default function AuditPage() {
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useAuditLogs(filterOf(params))

  const f = filterOf(params)
  const logs = data?.logs ?? []
  // 고른 기록이 필터 밖으로 나가면 **첫 줄로 옮긴다.** 안 보이는 기록의 상세를 옆에
  // 띄워 두면 「지금 보고 있는 것이 목록에 없다」 는 상태가 되고, 그건 조사 화면에서
  // 제일 나쁜 거짓말이다.
  const at = logs.findIndex((l) => l.logId === params.get('log'))
  const selectedIndex = at >= 0 ? at : 0
  const selected = logs[selectedIndex]

  const patch = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v == null || v === '' || v === ALL) next.delete(k)
    else next.set(k, v)
    // 필터가 바뀌면 고른 기록도 버린다 — 새 목록의 첫 줄이 잡힌다.
    if (k !== 'log') next.delete('log')
    setParams(next, { replace: true })
  }

  const exportCsv = () => {
    if (!data) return
    downloadCsv(`riruti-audit-${today()}.csv`, toCsv(data.logs, CSV_COLUMNS))
  }

  return (
    <>
      <PageHeader
        title="감사 로그"
        sub="관리자가 한 모든 조작이 남습니다. 수정과 삭제는 할 수 없습니다."
        actions={
          <>
            <Button disabled={!data} onClick={exportCsv}>
              CSV 내려받기
            </Button>
          </>
        }
      />

      <div
        className={css({
          display: 'flex',
          gap: '9px',
          p: '12px 14px',
          mb: '16px',
          bg: 'soft',
          border: '1px solid token(colors.liveBd)',
          borderRadius: 'lg',
          textStyle: 'caption',
          color: 'priD',
        })}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={css({ flex: 'none', mt: '1px' })}
        >
          <rect
            x="3.4"
            y="7"
            width="9.2"
            height="6.6"
            rx="1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5.6,7 V5.2 A2.4,2.4 0 0 1 10.4,5.2 V7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <span>
          추가만 되는 기록입니다. 화면에서도 서버에서도 지우거나 고칠 수 없고, 재화 지급 · 환불
          · 제재 · 숨김 처리 · 권한 변경이 자동으로 쌓입니다.
        </span>
      </div>

      {data ? (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            mb: '16px',
          })}
        >
          {/* ⚠️ 앞 둘은 **기간이 다르다.** 라벨에 적어 둔다 (§32.1) */}
          <StatTile label="오늘 기록" value={num(data.summary.today)} />
          <StatTile
            label="민감 조작 · 전체"
            value={num(data.summary.risky)}
            alert={data.summary.risky > 0}
          />
          <StatTile label="활동 관리자" value={num(data.summary.actors)} />
          <StatTile label="보관 기간" value={`${AUDIT_KEEP_YEARS}년`} />
        </div>
      ) : isPending ? (
        <SkeletonStats count={4} min={150} silent className={css({ mb: '16px' })} />
      ) : null}

      <Card className={css({ p: '14px 16px', mb: '14px' })}>
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
          })}
        >
          <Input
            value={f.q ?? ''}
            onChange={(v) => patch('q', v)}
            placeholder="관리자 · 대상 · 사유 검색"
            aria-label="감사 로그 검색"
            className={css({ flex: '1 1 220px', minWidth: '0' })}
          />
          <Select
            value={f.by ?? ''}
            onChange={(v) => patch('by', v)}
            options={data?.actors ?? []}
            placeholder="전체 관리자"
            aria-label="관리자"
            className={css({ flex: '0 1 170px' })}
          />
          <Segmented
            value={f.category ?? ALL}
            onChange={(v) => patch('cat', v)}
            options={CATEGORY_OPTIONS}
            aria-label="분류"
          />
          <div className={css({ flex: '1' })} />
          <Switch
            checked={f.riskyOnly ?? false}
            onChange={(v) => patch('risky', v ? '1' : null)}
            label="민감 조작만"
          />
        </div>
      </Card>

      {isPending ? (
        <SkeletonRows rows={8} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '18px',
            alignItems: 'flex-start',
          })}
        >
          {/*
            ⚠️ **기준 폭은 표가 열을 다 보여 주는 데 필요한 폭(920px)이다.** 원본처럼
            560px 로 두면 좁은 화면에서도 옆 패널과 나란히 서려다가 **표가 눌려 「사유」
            열이 스크롤 밖으로 나간다** — 목록에서 제일 많이 읽는 열이다.
            여기 두면 자리가 모자랄 때 패널이 아래로 내려가고 표가 온전히 보인다.
          */}
          <div className={css({ flex: '3 1 920px', minWidth: '0' })}>
            {logs.length > 0 ? (
              <Table
                columns={COLUMNS}
                rows={logs}
                minWidth={920}
                onRowClick={(l) => patch('log', l.logId)}
                rowKey={(l) => l.logId}
                selectedIndex={selectedIndex}
              />
            ) : (
              <EmptyState
                title="조건에 맞는 기록이 없습니다"
                body="검색어나 분류를 바꿔 보세요."
              />
            )}
          </div>

          <div className={css({ flex: '1 1 320px', minWidth: '280px' })}>
            {selected ? <Detail log={selected} /> : null}
          </div>
        </div>
      )}
    </>
  )
}

function Detail({ log }: { log: AuditLog }) {
  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: '14px' })}>
      <Card className={css({ p: '18px 20px' })}>
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            mb: '13px',
            flexWrap: 'wrap',
          })}
        >
          <CardTitle title="기록 상세" />
          <Badge tone={AUDIT_KIND_TONE[log.kind]}>{log.kind}</Badge>
        </div>
        <dl className={css({ m: '0' })}>
          <Row k="기록 번호" v={log.logId} mono />
          <Row k="시각" v={log.at} />
          <Row k="관리자" v={`${log.by} · ${log.role}`} />
          <Row k="대상" v={log.target} />
          <Row k="IP" v={log.ip} mono />
        </dl>
        <div className={css({ pt: '13px' })}>
          <div
            className={css({
              textStyle: 'caption',
              fontWeight: '700',
              color: 'sub',
              mb: '6px',
            })}
          >
            사유
          </div>
          <p
            className={css({
              m: '0',
              p: '11px 13px',
              bg: 'surf2',
              border: '1px solid token(colors.ln)',
              borderRadius: 'md',
              textStyle: 'label',
              color: 'ink',
            })}
          >
            {log.why}
          </p>
        </div>
      </Card>

      <Card className={css({ p: '18px 20px' })}>
        <CardTitle title="변경 전 · 후" />
        <div className={css({ mt: '12px' })}>
          <div className={css({ textStyle: 'micro', color: 'sub', mb: '5px' })}>
            {log.field}
          </div>
          {/*
            ⚠️ 앞뒤가 같으면 화살표를 그리지 않는다. 「숨김 유지」 는 살펴보고 **그대로
            두기로 한** 조작인데, 빨강 → 초록으로 그리면 바뀐 것처럼 읽힌다 (§32.4).
          */}
          {isUnchanged(log) ? (
            <div
              className={css({
                p: '8px 10px',
                borderRadius: 'md',
                bg: 'nBg',
                border: '1px solid token(colors.ln)',
                textStyle: 'label',
                fontWeight: '700',
                color: 'sub',
                textAlign: 'center',
              })}
            >
              {log.to} · 그대로 유지
            </div>
          ) : (
            <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
              <Side value={log.from} tone="from" />
              <svg
                width="13"
                height="13"
                viewBox="0 0 12 12"
                aria-hidden="true"
                className={css({ flex: 'none', color: 'faint' })}
              >
                <path
                  d="M2,6 H10 M7,3 L10,6 L7,9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <Side value={log.to} tone="to" />
            </div>
          )}
        </div>

        <Link
          to={SCREENS[log.screen].path}
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            mt: '14px',
            p: '10px 12px',
            border: '1px solid token(colors.ln)',
            borderRadius: 'md',
            textDecoration: 'none',
            _hover: { bg: 'hov' },
          })}
        >
          <span
            className={css({ flex: '1', textStyle: 'label', fontWeight: '600', color: 'ink' })}
          >
            {SCREENS[log.screen].label} 화면으로 이동
          </span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            aria-hidden="true"
            className={css({ flex: 'none', color: 'faint' })}
          >
            <path
              d="M4.5,2 L8.5,6 L4.5,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </Card>
    </div>
  )
}

const COLUMNS: Column<AuditLog>[] = [
  { key: 'at', label: '시각', width: '150px', nowrap: true },
  { key: 'by', label: '관리자', width: '110px', strong: true },
  {
    key: 'kind',
    label: '조작',
    width: '126px',
    render: (l) => <Badge tone={AUDIT_KIND_TONE[l.kind]}>{l.kind}</Badge>,
  },
  { key: 'target', label: '대상', minWidth: '180px', truncate: true },
  {
    key: 'delta',
    label: '변경',
    width: '112px',
    nowrap: true,
    // `''` 는 「수치로 잴 것이 없다」 — 0 이 아니다. 그래서 회색 `—` 로 둔다.
    render: (l) =>
      l.delta === '' ? (
        <span className={css({ color: 'faint' })}>—</span>
      ) : (
        <span
          className={css({ fontWeight: '700', color: l.delta.startsWith('-') ? 'rFg' : 'gFg' })}
        >
          {l.delta}
        </span>
      ),
  },
  { key: 'why', label: '사유', minWidth: '240px', truncate: true },
]

function Side({ value, tone }: { value: string; tone: 'from' | 'to' }) {
  return (
    <span
      className={css({
        flex: '1',
        minWidth: '0',
        p: '8px 10px',
        borderRadius: 'md',
        border: '1px solid',
        textStyle: 'label',
        fontWeight: '700',
        textAlign: 'center',
        borderColor: tone === 'from' ? 'rBd' : 'gFg',
        bg: tone === 'from' ? 'rBg' : 'gBg',
        color: tone === 'from' ? 'rFg' : 'gFg',
      })}
    >
      {value}
    </span>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'baseline',
        gap: '12px',
        p: '9px 0',
        borderBottom: '1px solid token(colors.ln)',
      })}
    >
      <dt className={css({ w: '92px', flex: 'none', textStyle: 'caption', color: 'sub' })}>
        {k}
      </dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
          fontFamily: mono ? 'mono' : undefined,
        })}
      >
        {v}
      </dd>
    </div>
  )
}

/**
 * 내보내는 값.
 *
 * ⚠️ **`from`·`to`·`ip` 까지 넣는다.** 감사 로그는 「무슨 일이 있었나」를 나중에 따지는
 *    기록이라, 화면이 줄여 보여 주는 것과 파일에 남길 것이 다르다 (§56.1).
 */
const CSV_COLUMNS: CsvColumn<AuditLog>[] = [
  { header: '일시', value: (l) => l.at },
  { header: '로그 id', value: (l) => l.logId },
  { header: '처리자', value: (l) => l.by },
  { header: '당시 역할', value: (l) => l.role },
  { header: '구분', value: (l) => l.kind },
  { header: '대상', value: (l) => l.target },
  { header: '바뀐 것', value: (l) => l.field },
  { header: '이전', value: (l) => l.from },
  { header: '이후', value: (l) => l.to },
  { header: '증감', value: (l) => l.delta },
  { header: '사유', value: (l) => l.why },
  { header: 'IP', value: (l) => l.ip },
]
