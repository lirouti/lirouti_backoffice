/**
 * 배경 목록 — 카드 격자만.
 *
 * **필터도 검색도 페이지 바도 없다.** 20건이라 한 화면에 다 들어가고, 원본에도 없다.
 * 아이템 목록(docs/ARCHITECTURE.md §18)과 갈리는 지점이다 (§41).
 */
import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonCards } from '@/shared/ui/Skeleton'

import { backgroundMeta, type Background } from '@/domain/background'
import { TIER_LABEL } from '@/domain/item'
import { SCREENS } from '@/domain/screens'

import { useBackgrounds } from '@/api/backgrounds'

export default function BackgroundsPage() {
  const navigate = useNavigate()
  const { data, isPending, error } = useBackgrounds()

  return (
    <>
      <PageHeader
        title="배경"
        sub="장소를 정하는 슬롯입니다. 둥지와 독립이라 조합해서 씁니다."
        actions={
          <Button variant="primary" onClick={() => navigate(SCREENS.bgnew.path)}>
            배경 등록
          </Button>
        }
      />

      {error ? (
        <ErrorBanner message={error.message} />
      ) : isPending ? (
        <SkeletonCards count={8} min={190} />
      ) : (
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '13px',
          })}
        >
          {data.map((b) => (
            <BackgroundCard
              key={b.key}
              background={b}
              onOpen={() => navigate(SCREENS.bgedit.path.replace(':bgId', String(b.key)))}
            />
          ))}
        </div>
      )}
    </>
  )
}

/**
 * 배경 한 장.
 *
 * ⚠️ **누를 수 있다** — 업적 카드(§40.1)와 반대다. 배경 화면에는 표가 없어서 카드가
 *    수정으로 가는 **유일한** 길이다. 통로가 하나뿐이면 예측할 수 없는 문제도 없다.
 */
function BackgroundCard({ background: b, onOpen }: { background: Background; onOpen: () => void }) {
  const paid = b.tier === 'PAID'

  return (
    <Card className={css({ p: '0', overflow: 'hidden' })}>
      <button
        type="button"
        onClick={onOpen}
        className={css({
          display: 'block',
          width: 'full',
          textAlign: 'left',
          bg: 'transparent',
          border: '0',
          p: '0',
          cursor: 'pointer',
          _focusVisible: { outline: '2px solid token(colors.pri)', outlineOffset: '-2px' },
        })}
      >
        <div className={css({ position: 'relative' })}>
          {/* 유료는 타일 배경이 어두워진다 — 원본의 `tileBg` 규칙 그대로다 */}
          <AssetThumb assetId={b.assetId} src={b.assetSrc} alt={b.name} fluid paid={paid} />
          <span
            className={css({
              position: 'absolute',
              top: '7px',
              left: '7px',
              textStyle: 'micro',
              fontWeight: '700',
              p: '2px 7px',
              borderRadius: 'md',
              bg: paid ? 'goldBg' : 'nBg',
              color: paid ? 'goldFg' : 'sub',
            })}
          >
            {TIER_LABEL[b.tier]}
          </span>
        </div>
        <div className={css({ p: '10px 12px 12px', borderTop: '1px solid token(colors.ln)' })}>
          <div className={css({ textStyle: 'label', fontWeight: '700', color: 'ink' })}>{b.name}</div>
          <div className={css({ mt: '3px', display: 'flex', alignItems: 'center', gap: '6px' })}>
            <span className={css({ textStyle: 'micro', color: 'faint' })}>{backgroundMeta(b)}</span>
            <span
              className={css({
                ml: 'auto',
                textStyle: 'micro',
                fontWeight: '700',
                color: paid ? 'priD' : 'faint',
              })}
            >
              {paid ? `${num(b.price)} 젬` : '무료'}
            </span>
          </div>
        </div>
      </button>
    </Card>
  )
}
