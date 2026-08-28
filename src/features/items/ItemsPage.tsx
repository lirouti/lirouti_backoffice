/**
 * 아이템 목록 화면. **첫 목록 화면이라 나머지 목록 화면의 본이 된다.**
 *
 * 규칙은 `ItemsPage` 의 JSDoc 과 docs/ARCHITECTURE.md §18 에 있다.
 * 열 정의(`COLUMNS`)가 길어 파일 머리말을 따로 둔다 — 컴포넌트 주석이 30줄 밖이다.
 */
import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { count, gem, num, pct } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { EmptyState, Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Icon } from '@/shared/ui/Icon'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Pagination } from '@/shared/ui/Pagination'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { Segmented } from '@/shared/ui/Segmented'
import { Table, type Column } from '@/shared/ui/Table'

import {
  ITEM_SOURCE_LABEL,
  ITEM_STATUS_LABEL,
  ITEM_STATUS_TONE,
  SLOT_LABEL,
  SLOT_ORDER,
  TIER_LABEL,
  TIER_TONE,
  type Item,
  type Slot,
  type Tier,
} from '@/domain/item'
import { SCREENS } from '@/domain/screens'

import { useItems } from '@/api/items'

import { ItemGrid } from './ItemGrid'
import { DEFAULT_QUERY, hasFilter, type ItemsView } from './query'
import { useItemsQuery } from './useItemsQuery'

/** 한 쪽에 보여줄 개수. 디자인 원본의 `PER = 12` 를 그대로 쓴다. */
const PER_PAGE = 12

/** `''` 는 "조건 없음"이다. 유니온을 적어 두지 않으면 `string` 으로 넓어져 필터 타입이 풀린다. */
const SLOT_OPTIONS: { value: Slot | ''; label: string }[] = [
  { value: '', label: '전체' },
  ...SLOT_ORDER.map((s) => ({ value: s, label: SLOT_LABEL[s] })),
]

const TIER_OPTIONS: { value: Tier | ''; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'FREE', label: TIER_LABEL.FREE },
  { value: 'PAID', label: TIER_LABEL.PAID },
]

const VIEW_OPTIONS: { value: ItemsView; label: string }[] = [
  { value: 'list', label: '목록' },
  { value: 'grid', label: '그리드' },
]

const COLUMNS: Column<Item>[] = [
  {
    key: 'assetId',
    label: '에셋',
    width: '60px',
    // 이름 열이 바로 옆에서 같은 것을 말한다. 여기서 또 읽으면 두 번 들린다.
    render: (it) => <AssetThumb assetId={it.assetId} size={36} paid={it.tier === 'PAID'} />,
  },
  { key: 'name', label: '아이템명', minWidth: '180px', truncate: true, strong: true },
  { key: 'slot', label: '슬롯', width: '80px', render: (it) => SLOT_LABEL[it.slot] },
  {
    key: 'tier',
    label: '등급',
    width: '70px',
    render: (it) => <Badge tone={TIER_TONE[it.tier]}>{TIER_LABEL[it.tier]}</Badge>,
  },
  { key: 'price', label: '가격', width: '96px', render: (it) => gem(it.price) },
  { key: 'source', label: '획득 경로', width: '110px', render: (it) => ITEM_SOURCE_LABEL[it.source] },
  { key: 'sold', label: '판매', width: '96px', align: 'right', render: (it) => num(it.sold) },
  {
    key: 'own',
    label: '보유율',
    width: '120px',
    render: (it) => (
      <div className={css({ display: 'flex', alignItems: 'center', gap: '7px' })}>
        <div className={css({ flex: '1', minWidth: '0' })}>
          <ProgressBar rate={it.own} label={`${it.name} 보유율`} />
        </div>
        <span className={css({ textStyle: 'micro', fontWeight: '700', color: 'sub' })}>
          {pct(it.own)}
        </span>
      </div>
    ),
  },
  {
    key: 'status',
    label: '상태',
    width: '84px',
    render: (it) => <Badge tone={ITEM_STATUS_TONE[it.status]}>{ITEM_STATUS_LABEL[it.status]}</Badge>,
  },
]

/**
 * 아이템 목록.
 *
 * **첫 목록 화면이라 여기서 정한 것이 나머지 목록 화면의 본이 된다** —
 * 정리한 규칙은 docs/ARCHITECTURE.md §18 에 있다. 요약하면 넷이다.
 *
 * 1. **주소가 원본이다.** 필터·쪽·뷰가 전부 URL 에 있다. keep-alive 가 화면을
 *    살려 두지만 새로고침과 링크 공유는 URL 만 살린다 (§6.3).
 * 2. **쪽은 파사드가 자른다.** 화면은 `slice` 하지 않는다 — 실서버는 한 쪽만 준다.
 * 3. **필터를 바꾸면 1쪽으로.** `patchQuery` 가 한다.
 * 4. **`Table` 을 `Card` 로 감싸지 않는다.** 표가 이미 카드 테두리를 갖고 있다.
 */
export default function ItemsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useItemsQuery()
  const { data, isPending, error } = useItems({
    q: query.q,
    slot: query.slot,
    tier: query.tier,
    page: query.page,
    perPage: PER_PAGE,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const open = (it: Item) => navigate(SCREENS.item.path.replace(':itemId', String(it.key)))
  const reset = () => setQuery(DEFAULT_QUERY)

  return (
    <>
      <PageHeader
        title="아이템"
        sub="머리·몸·손·얼굴 슬롯의 착용 아이템입니다. 슬롯이 독립이라 어느 캐릭터에나 그대로 적용됩니다."
        actions={
          <>
            {/*
              내보낼 것은 지금 쪽이 아니라 **필터에 걸린 전체**여야 하는데, 그건
              서버가 잘라 주기 시작하면 전용 엔드포인트 없이는 만들 수 없다.
              눌러도 반쪽만 나오는 버튼보다 잠긴 버튼이 낫다 (지표 화면과 같은 처리).

              TODO(내보내기 엔드포인트가 생기면): CSV 내보내기
            */}
            <Button disabled title="준비 중">
              CSV 내보내기
            </Button>
            <Button variant="primary" onClick={() => navigate(SCREENS.itemnew.path)}>
              아이템 등록
            </Button>
          </>
        }
      />

      <Card className={css({ p: '13px 15px', mb: '13px' })}>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' })}>
          <Input
            value={query.q}
            onChange={(q) => setQuery({ q })}
            aria-label="아이템명 검색"
            placeholder="아이템명 검색"
            prefixIcon={
              <svg width="14" height="14" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <path d="M10.4,10.4 L13.5,13.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            }
            className={css({ width: '250px' })}
          />

          <Segmented
            value={query.slot ?? ''}
            onChange={(v) => setQuery({ slot: v || undefined })}
            options={SLOT_OPTIONS}
            aria-label="슬롯 필터"
          />
          <Segmented
            value={query.tier ?? ''}
            onChange={(v) => setQuery({ tier: v || undefined })}
            options={TIER_OPTIONS}
            aria-label="등급 필터"
          />

          <div className={css({ flex: '1' })} />

          {/* 걸러진 전체 건수. 페이지 바의 `384건 중 61–80` 과 달리 필터의 결과를 말한다 */}
          <span className={css({ textStyle: 'caption', color: 'sub' })}>
            총 <b className={css({ color: 'ink' })}>{count(total)}</b>
          </span>

          <Segmented
            value={query.view}
            onChange={(view) => setQuery({ view })}
            options={VIEW_OPTIONS}
            aria-label="보기 방식"
          />
        </div>
      </Card>

      {error && <ErrorBanner message={error.message} />}

      {isPending ? (
        <Skeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Icon name="ic_shirt" size={22} />}
          title="조건에 맞는 아이템이 없습니다"
          body="검색어나 필터를 바꿔보세요."
          action={hasFilter(query) ? <Button onClick={reset}>필터 초기화</Button> : undefined}
        />
      ) : query.view === 'grid' ? (
        <ItemGrid items={items} onOpen={open} />
      ) : (
        <Table columns={COLUMNS} rows={items} rowKey={(it) => it.code} onRowClick={open} />
      )}

      <Pagination
        page={query.page}
        perPage={PER_PAGE}
        totalItems={total}
        onChange={(page) => setQuery({ page })}
        className={css({ mt: '16px' })}
      />
    </>
  )
}
