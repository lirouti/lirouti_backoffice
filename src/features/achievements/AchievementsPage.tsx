/**
 * 업적 목록 — 카드 격자 + 표.
 *
 * **둘이 같은 데이터를 두 번 그리는 게 아니다.** 카드는 「무엇으로 그렸는가」(조형)를,
 * 표는 「어떻게 따고 무엇을 받는가」(조건·보상·달성)를 말한다. 원본이 그렇게 나눠 놓은 것은
 * 업적이 **규격만 공유하고 조형은 전부 다르기** 때문이다 — 수집함에서 형태만으로 구분된다
 * (docs/ARCHITECTURE.md §40).
 */
import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { SkeletonCards, SkeletonRows } from '@/shared/ui/Skeleton'
import { Table, type Column } from '@/shared/ui/Table'

import type { Achievement } from '@/domain/achievement'
import { SCREENS } from '@/domain/screens'

import { useAchievements } from '@/api/achievements'

export default function AchievementsPage() {
  const navigate = useNavigate()
  const { data, isPending, error } = useAchievements()

  const edit = (a: Achievement) => navigate(SCREENS.achedit.path.replace(':achId', String(a.key)))

  return (
    <>
      <PageHeader
        title="업적"
        sub="업적은 규격만 공유하고 조형은 전부 다릅니다. 수집함에서 형태만으로 구분됩니다."
        actions={
          <Button variant="primary" onClick={() => navigate(SCREENS.achnew.path)}>
            업적 등록
          </Button>
        }
      />

      {error ? (
        <ErrorBanner message={error.message} />
      ) : isPending ? (
        <>
          <SkeletonCards count={8} min={200} className={css({ mb: '18px' })} />
          <SkeletonRows rows={6} silent />
        </>
      ) : (
        <>
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '13px',
              mb: '18px',
            })}
          >
            {data.map((a) => (
              <AchievementCard key={a.key} achievement={a} />
            ))}
          </div>

          <Table columns={COLUMNS} rows={data} rowKey={(a) => String(a.key)} minWidth={720} onRowClick={edit} />
        </>
      )}
    </>
  )
}

/**
 * 조형 카드.
 *
 * ⚠️ **누를 수 없다.** 표의 행이 수정으로 가는 유일한 길이다 — 같은 것을 여는 통로가
 *    둘이면 어느 쪽이 무엇을 하는지 예측할 수 없고, 원본에서도 카드는 보여 주기만 한다.
 *
 * ⚠️ **타일 배경을 씌우지 않는다**(`paid` 를 쓰지 않는다). 업적 뱃지는 원본이
 *    「배경판 없이 오브젝트 자체로 선다」 고 정한 것이라, 판을 깔면 12종이 한 세트로
 *    보이던 게 깨진다.
 */
function AchievementCard({ achievement: a }: { achievement: Achievement }) {
  return (
    <Card className={css({ p: '15px 13px 14px', textAlign: 'center' })}>
      <div className={css({ width: '74px', m: '0 auto' })}>
        <AssetThumb assetId={a.assetId} src={a.assetSrc} alt={a.name} fluid plate={false} />
      </div>
      <div className={css({ mt: '11px', textStyle: 'label', fontWeight: '700', color: 'ink' })}>{a.name}</div>
      <div className={css({ mt: '3px', textStyle: 'micro', color: 'faint' })}>{a.sub}</div>
      <div
        className={css({
          mt: '9px',
          pt: '9px',
          borderTop: '1px solid token(colors.ln)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        })}
      >
        <span className={css({ textStyle: 'micro', fontWeight: '700', color: 'priD' })}>{a.rate}%</span>
        <span className={css({ textStyle: 'micro', color: 'faint' })}>달성</span>
      </div>
    </Card>
  )
}

const COLUMNS: Column<Achievement>[] = [
  { key: 'name', label: '업적', width: '170px', strong: true },
  { key: 'cond', label: '조건' },
  {
    key: 'reward',
    label: '보상',
    width: '130px',
    // 보상은 젬과 아이템이 섞여 있어 눈에 띄어야 한다 — 운영자가 이 열만 훑는다.
    render: (a) => <span className={css({ fontWeight: '600', color: 'priD' })}>{a.reward}</span>,
  },
  { key: 'earned', label: '달성자', width: '100px', align: 'right', render: (a) => num(a.earned) },
  {
    key: 'rate',
    label: '달성률',
    width: '130px',
    // ⚠️ **`plain` 이다.** 신호등 색은 「낮으면 손봐야 한다」 는 뜻인데, 업적의 낮은
    //    달성률은 **의도된 희귀도**다 — 「전 업적 달성」 1% 를 주황으로 칠하면 고쳐야 할
    //    문제로 읽힌다. 원본 막대도 단색(`--pFg`)이다.
    render: (a) => (
      <div className={css({ display: 'flex', alignItems: 'center', gap: '7px' })}>
        <div className={css({ flex: '1', minWidth: '0' })}>
          <ProgressBar rate={a.rate} label={`${a.name} 달성률`} tone="plain" />
        </div>
        <span className={css({ textStyle: 'micro', fontWeight: '700', color: 'sub', width: '32px', textAlign: 'right' })}>
          {a.rate}%
        </span>
      </div>
    ),
  },
]
