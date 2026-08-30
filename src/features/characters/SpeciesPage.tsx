import { useNavigate, useSearchParams } from 'react-router'

import { css } from 'styled-system/css'

import { num } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Table, type Column } from '@/shared/ui/Table'

import { SCREENS } from '@/domain/screens'
import {
  appearanceLabel,
  appearanceTone,
  RARITIES,
  RARITY_TONE,
  speciesTint,
  type Species,
} from '@/domain/species'

import { useSpeciesList } from '@/api/species'

/** 「전체」 + 희귀도 넷. 원본의 탭 그대로다 */
const TABS = ['전체', ...RARITIES] as const
type Tab = (typeof TABS)[number]

const VIEWS = [
  { value: 'grid' as const, label: '격자' },
  { value: 'list' as const, label: '목록' },
]

const isTab = (v: string | null): v is Tab => v != null && (TABS as readonly string[]).includes(v)

/**
 * 캐릭터 종류 — 13종.
 *
 * **쪽을 자르지 않는다.** 13개뿐이라 페이지 바가 화면만 차지한다(원본에도 없다).
 * 대신 희귀도 탭과 격자/목록 전환이 있고, **둘 다 주소에 실린다** — 링크로 공유하거나
 * 새로고침해도 보던 화면이 그대로여야 한다 (docs/ARCHITECTURE.md §18.1).
 */
export default function SpeciesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, isPending, error } = useSpeciesList()

  const raw = params.get('rarity')
  const tab: Tab = isTab(raw) ? raw : '전체'
  const view = params.get('view') === 'list' ? 'list' : 'grid'
  const shown = (data ?? []).filter((s) => tab === '전체' || s.rarity === tab)

  // 모르는 값은 조용히 버린다 — 주소는 남이 고칠 수 있다(§18.1).
  const patch = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v === '전체' || v === 'grid') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  const open = (sp: Species) =>
    navigate(SCREENS.speciesdet.path.replace(':speciesId', String(sp.key)))

  return (
    <>
      <PageHeader
        title="캐릭터 종류"
        sub="아트는 캐릭터팀이 관리합니다. 여기서는 종별 슬롯 기본값과 출현 설정을 봅니다."
        actions={
          <Button variant="primary" onClick={() => navigate(SCREENS.speciesnew.path)}>
            종 등록
          </Button>
        }
      />

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', mb: '14px' })}>
        <Segmented
          value={tab}
          onChange={(v) => patch('rarity', v)}
          options={[...TABS]}
          aria-label="희귀도"
        />
        <div className={css({ ml: 'auto' })}>
          <Segmented value={view} onChange={(v) => patch('view', v)} options={VIEWS} aria-label="보기 방식" />
        </div>
      </div>

      {isPending ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : view === 'list' ? (
        <Table columns={COLUMNS} rows={shown} minWidth={880} onRowClick={open} />
      ) : (
        <ul
          className={css({
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(178px, 1fr))',
            gap: '14px',
            listStyle: 'none',
            m: '0',
            p: '0',
          })}
        >
          {shown.map((sp) => (
            <li key={sp.key}>
              <Tile species={sp} onOpen={() => open(sp)} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

const COLUMNS: Column<Species>[] = [
  {
    key: 'name',
    label: '종',
    minWidth: '190px',
    render: (sp) => (
      <div className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}>
        <SpeciesThumb species={sp} size={34} />
        <span className={css({ fontWeight: '700' })}>{sp.name}</span>
      </div>
    ),
  },
  { key: 'code', label: '코드', width: '110px', render: (sp) => <Code>{sp.code}</Code> },
  {
    key: 'rarity',
    label: '희귀도',
    width: '96px',
    render: (sp) => <Badge tone={RARITY_TONE[sp.rarity]}>{sp.rarity}</Badge>,
  },
  { key: 'note', label: '슬롯 기본값', width: '150px', truncate: true },
  { key: 'weight', label: '출현 가중치', width: '110px', align: 'right', strong: true },
  {
    key: 'owners',
    label: '보유 유저',
    width: '100px',
    align: 'right',
    // `count` 는 「건」 을 붙인다 — 사람 수라 숫자만 쓴다.
    render: (sp) => num(sp.owners),
  },
  {
    key: 'status',
    label: '상태',
    width: '96px',
    render: (sp) => <Badge tone={appearanceTone(sp.hidden)}>{appearanceLabel(sp.hidden)}</Badge>,
  },
]

/**
 * 종 미리보기.
 *
 * ⚠️ **13종이 같은 그림을 쓴다.** 종을 가르는 것은 대표 색으로 만든 배경뿐이라,
 *    타일을 그릴 때 `tint` 를 빠뜨리면 열세 칸이 전부 똑같아 보인다.
 */
function SpeciesThumb({ species, size }: { species: Species; size?: number }) {
  return (
    <div
      className={css({ flex: 'none', borderRadius: 'md', overflow: 'hidden', border: '1px solid token(colors.ln)' })}
      style={{ background: speciesTint(species.tone), width: size, height: size }}
    >
      <AssetThumb
        assetId="rg"
        fluid
        alt=""
        className={css({ bg: 'transparent!' })}
      />
    </div>
  )
}

function Tile({ species, onOpen }: { species: Species; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={css({
        width: 'full',
        display: 'block',
        p: '0',
        overflow: 'hidden',
        textAlign: 'left',
        cursor: 'pointer',
        appearance: 'none',
        font: 'inherit',
        bg: 'surf',
        border: '1px solid token(colors.bd)',
        borderRadius: 'xl',
        _hover: { borderColor: 'faint2' },
        _focusVisible: { outline: 'none', boxShadow: '0 0 0 3px token(colors.ring)' },
      })}
    >
      <div
        className={css({ borderBottom: '1px solid token(colors.ln)' })}
        style={{ background: speciesTint(species.tone) }}
      >
        <AssetThumb assetId="rg" fluid alt="" className={css({ bg: 'transparent!' })} />
      </div>
      <div className={css({ p: '11px 13px 13px' })}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' })}>
          <span
            aria-hidden="true"
            className={css({ width: '10px', height: '10px', flex: 'none', borderRadius: 'xs', border: '1px solid token(colors.ln)' })}
            style={{ background: species.tone }}
          />
          <span className={css({ textStyle: 'body', fontWeight: '700', color: 'ink' })}>{species.name}</span>
        </div>
        <Code className={css({ display: 'block', mt: '3px' })}>{species.code}</Code>
        <div className={css({ mt: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' })}>
          <Badge tone={RARITY_TONE[species.rarity]}>{species.rarity}</Badge>
          <Badge tone={appearanceTone(species.hidden)}>{appearanceLabel(species.hidden)}</Badge>
        </div>
      </div>
    </button>
  )
}

/** 코드는 **등폭**으로. 한 글자씩 옮겨 적는 값이라 자리를 셀 수 있어야 한다 */
function Code({ children, className }: { children: string; className?: string }) {
  return (
    <span className={`${css({ fontFamily: 'mono', textStyle: 'caption', color: 'faint' })} ${className ?? ''}`}>
      {children}
    </span>
  )
}
