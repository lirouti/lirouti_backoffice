/**
 * 챌린지 목록 — 주기 탭으로 거른다.
 *
 * **쪽을 자르지 않는다** (docs/ARCHITECTURE.md §20). 18개뿐이라 페이지 바가 화면만 차지한다.
 */
import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num, pct } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonRows } from '@/shared/ui/Skeleton'
import { Table, type Column } from '@/shared/ui/Table'

import {
  CHALLENGE_KIND_LABEL,
  CHALLENGE_KIND_TONE,
  CHALLENGE_KINDS,
  CHALLENGE_STATUS_LABEL,
  CHALLENGE_STATUS_TONE,
  periodLabel,
  rewardLabel,
  type Challenge,
  type ChallengeKind,
} from '@/domain/challenge'
import { SCREENS } from '@/domain/screens'

import { useChallenges } from '@/api/challenges'

/** 「전체」 + 주기 셋. 값은 코드값이고 보이는 것은 한글이다 */
const TABS = [
  { value: '전체', label: '전체' },
  ...CHALLENGE_KINDS.map((k) => ({ value: k, label: CHALLENGE_KIND_LABEL[k] })),
]

const isKind = (v: string | null): v is ChallengeKind =>
  v != null && (CHALLENGE_KINDS as string[]).includes(v)

/**
 * 주소에서 주기를 읽는다. 모르는 값은 조용히 버린다 — 주소는 남이 고칠 수 있다 (§18.1).
 *
 * 모듈 함수로 둔 이유는 **훅이 이 값을 인자로 받기** 때문이다. 컴포넌트 안에서
 * 파생값으로 만들면 그 뒤에 훅이 오게 되어 "훅을 먼저 모은다" 규약과 부딪힌다 (§14.2).
 */
const kindOf = (p: URLSearchParams): ChallengeKind | undefined => {
  const v = p.get('kind')
  return isKind(v) ? v : undefined
}

export default function ChallengesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const { data, isPending, error } = useChallenges(kindOf(params))

  const kind = kindOf(params)
  const rows = data ?? []
  const live = rows.filter((c) => c.status === 'ACTIVE').length

  const pick = (v: string) => {
    const next = new URLSearchParams(params)
    if (v === '전체') next.delete('kind')
    else next.set('kind', v)
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="챌린지"
        sub="일상·주간·시즌 세 주기로 운영합니다. 달성률이 낮으면 목표치를 조정합니다."
        actions={
          <>
            {/*
              달성률 리포트는 집계 API 가 있어야 한다 — 지금 화면이 가진 것은 목록의
              `rate` 뿐이라 눌러도 지금 보이는 것 이상을 못 준다 (§18.8).
              TODO(집계 API 가 생기면): 달성률 리포트
            */}
            <Button disabled>달성률 리포트 · 준비 중</Button>
            <Button variant="primary" onClick={() => navigate(SCREENS.chalnew.path)}>
              챌린지 등록
            </Button>
          </>
        }
      />

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', mb: '14px' })}>
        <Segmented value={kind ?? '전체'} onChange={pick} options={TABS} aria-label="주기" />
        <span className={css({ textStyle: 'caption', color: 'faint' })}>
          총 {num(rows.length)}개 · 진행 중 {num(live)}개
        </span>
      </div>

      {isPending ? (
        <SkeletonRows rows={6} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <Table
          columns={COLUMNS}
          rows={rows}
          minWidth={1040}
          onRowClick={(c) => navigate(SCREENS.chaldet.path.replace(':chalId', String(c.key)))}
        />
      )}
    </>
  )
}

const COLUMNS: Column<Challenge>[] = [
  {
    key: 'kind',
    label: '주기',
    width: '84px',
    render: (c) => <Badge tone={CHALLENGE_KIND_TONE[c.kind]}>{CHALLENGE_KIND_LABEL[c.kind]}</Badge>,
  },
  { key: 'title', label: '챌린지', minWidth: '180px', strong: true },
  { key: 'cond', label: '조건', width: '120px' },
  { key: 'goal', label: '목표', width: '80px', align: 'right', render: (c) => num(c.goal) },
  {
    key: 'reward',
    label: '보상',
    width: '150px',
    render: (c) => (
      <span className={css({ display: 'flex', alignItems: 'center', gap: '7px' })}>
        {/* 아이템 보상이 붙으면 그림까지 보여야 무엇을 주는지 한눈에 읽힌다 */}
        {c.rewardItem && (
          <AssetThumb
            assetId={c.rewardItem.assetId}
            src={c.rewardItem.assetSrc}
            size={22}
            alt={c.rewardItem.name}
          />
        )}
        <span>{rewardLabel(c)}</span>
      </span>
    ),
  },
  { key: 'period', label: '기간', width: '190px', nowrap: true, render: (c) => periodLabel(c) },
  {
    key: 'rate',
    label: '달성률',
    width: '130px',
    render: (c) => (
      <span className={css({ display: 'flex', alignItems: 'center', gap: '7px' })}>
        <span className={css({ flex: '1' })}>
          <ProgressBar rate={c.rate} label={`${c.title} 달성률`} />
        </span>
        <span className={css({ textStyle: 'micro', fontWeight: '700', color: 'sub', width: '34px', textAlign: 'right' })}>
          {pct(c.rate)}
        </span>
      </span>
    ),
  },
  {
    key: 'status',
    label: '상태',
    width: '84px',
    render: (c) => (
      <Badge tone={CHALLENGE_STATUS_TONE[c.status]}>{CHALLENGE_STATUS_LABEL[c.status]}</Badge>
    ),
  },
]
