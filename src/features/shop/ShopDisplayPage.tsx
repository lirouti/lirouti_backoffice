/**
 * 상점 진열 — 첫 화면 노출 순서.
 *
 * **순서를 바꿔도 바로 저장하지 않는다.** 위아래로 몇 번 옮기는 동안 매번 서버에
 * 쓰면 중간 상태가 그대로 나간다 — 「진열 저장」 을 눌러야 반영된다 (docs/ARCHITECTURE.md §24.3).
 */
import { useState } from 'react'

import { css } from 'styled-system/css'

import { moveSlot } from '@/shared/lib/array'
import { num } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonBlock } from '@/shared/ui/Skeleton'

import { SLOT_LABEL, TIER_LABEL, type Item } from '@/domain/item'

import { useResetShop, useSaveShop, useShopSlots, type ShopEntry } from '@/api/shop'

import { useUnsavedGuard } from '@/stores/dirtyStore'

/** 상점 미리보기에 보이는 칸 수. 첫 화면에 실제로 들어가는 만큼만 */
const PREVIEW = 6

const priceLabel = (it: Item): string => (it.price > 0 ? `${num(it.price)}젬` : '무료')

export default function ShopDisplayPage() {
  const { data, isPending, error } = useShopSlots()
  const save = useSaveShop()
  const reset = useResetShop()
  const [draft, setDraft] = useState<ShopEntry[] | null>(null)
  // 초안이 있다는 것이 곧 미저장이다. 파생값을 거치면 획득 훅이 뒤로 밀린다(§14).
  const markSaved = useUnsavedGuard(draft !== null)

  // 아직 손대지 않았으면 서버가 준 순서를 그대로 보여 준다.
  const rows = draft ?? data ?? []
  const dirty = draft !== null

  const move = (from: number, to: number) => setDraft(moveSlot(rows, from, to))

  const commit = () =>
    save.mutate(
      rows.map((r) => r.slot),
      {
        onSuccess: () => {
          setDraft(null)
          markSaved()
        },
      },
    )

  const revert = () =>
    reset.mutate(undefined, {
      onSuccess: () => {
        setDraft(null)
        markSaved()
      },
    })

  // ⚠️ **데이터가 오기 전에는 아무 버튼도 눌리면 안 된다.** 「순서 초기화」 가 `busy` 만
  //    보고 있어서 로딩 중에도 눌렸는데, 그때 실패해도 `reset.error` 는 성공 분기 안에서만
  //    그려져 **실패를 알 수 없었다.** 없는 순서를 되돌릴 수도 없으니 잠그는 쪽이 맞다.
  const busy = save.isPending || reset.isPending || !data

  return (
    <>
      <PageHeader
        title="상점 진열"
        sub="상점 첫 화면 진열 순서입니다. 위에서부터 노출됩니다."
        actions={
          <>
            <Button onClick={revert} disabled={busy}>
              순서 초기화
            </Button>
            <Button variant="primary" onClick={commit} disabled={busy || !dirty}>
              {dirty ? '진열 저장' : '저장됨'}
            </Button>
          </>
        }
      />

      {/*
        ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제는 데이터를 안 쓴다 (§43.2).
           버튼은 그리되 **잠근다** — 지울 수 없는 자리(헤더 우측)라 빼면 헤더가 튄다.
      */}
      {isPending ? (
        <div
          className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}
        >
          {/* 좌측 진열 목록 + 우측 미리보기 2단. 한 줄 격자로 그렸더니 326px 이 밀렸다 */}
          <SkeletonBlock height={516} className={css({ flex: '2 1 420px', minWidth: '0' })} />
          <SkeletonBlock height={314} silent className={css({ flex: '1 1 280px', minWidth: '0' })} />
        </div>
      ) : error || !data ? (
        <ErrorBanner message={error?.message ?? '진열을 불러오지 못했습니다.'} />
      ) : (
        <>
          {(save.error || reset.error) && (
            <ErrorBanner message={(save.error ?? reset.error)!.message} />
          )}

          <div
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '18px',
              alignItems: 'flex-start',
            })}
          >
            <Card className={css({ flex: '2 1 420px', minWidth: '0', p: '15px 17px' })}>
              <CardTitle
                title="진열 목록"
                sub={`${num(rows.length)}개 · 위에서부터 노출됩니다.`}
              />
              <ol className={css({ listStyle: 'none', m: '13px 0 0', p: '0' })}>
                {rows.map((r, i) => (
                  <SlotRow
                    key={r.slot.itemKey}
                    entry={r}
                    n={i + 1}
                    cut={i === PREVIEW - 1}
                    onUp={i === 0 ? undefined : () => move(i, i - 1)}
                    onDown={i === rows.length - 1 ? undefined : () => move(i, i + 1)}
                    disabled={busy}
                  />
                ))}
              </ol>
            </Card>

            <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px 17px' })}>
              <CardTitle title="상점 미리보기" sub={`첫 화면에 보이는 ${PREVIEW}칸입니다.`} />
              <div
                className={css({
                  mt: '13px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                  gap: '10px',
                })}
              >
                {rows.slice(0, PREVIEW).map((r) => (
                  <div
                    key={r.slot.itemKey}
                    className={css({
                      border: '1px solid token(colors.bd)',
                      borderRadius: 'lg',
                      p: '9px',
                      bg: 'prev2',
                    })}
                  >
                    <AssetThumb assetId={r.item.assetId} alt={r.item.name} size={64} />
                    <div
                      className={css({
                        mt: '6px',
                        textStyle: 'micro',
                        fontWeight: '600',
                        color: 'ink',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      })}
                    >
                      {r.item.name}
                    </div>
                    <div className={css({ textStyle: 'micro', color: 'faint' })}>
                      {priceLabel(r.item)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

function SlotRow({
  entry: { item },
  n,
  cut,
  onUp,
  onDown,
  disabled,
}: {
  entry: ShopEntry
  n: number
  /** 이 행 아래가 첫 화면 밖이다 */
  cut: boolean
  onUp?: () => void
  onDown?: () => void
  disabled: boolean
}) {
  return (
    <li
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        p: '9px 0',
        borderBottom: '1px solid',
        // 첫 화면에 들어가는 경계를 선으로 긋는다 — 순서를 바꿀 때 무엇이 밀려나는지 보여야 한다.
        borderBottomColor: cut ? 'pri' : 'ln',
      })}
    >
      <span className={css({ flex: 'none', width: '22px', textStyle: 'caption', color: 'faint', textAlign: 'right' })}>
        {n}
      </span>
      <AssetThumb assetId={item.assetId} alt={item.name} size={36} />
      <span className={css({ flex: '1', minWidth: '0' })}>
        <span className={css({ display: 'block', textStyle: 'label', fontWeight: '600', color: 'ink', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
          {item.name}
        </span>
        <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>
          {SLOT_LABEL[item.slot]} · {priceLabel(item)}
        </span>
      </span>
      <Badge size="sm" tone={item.tier === 'PAID' ? 'gold' : 'neutral'}>
        {TIER_LABEL[item.tier]}
      </Badge>
      <span className={css({ display: 'flex', gap: '4px' })}>
        {/* 끝에서는 버튼을 아예 잠근다 — 눌러도 안 움직이는 버튼은 고장으로 읽힌다 */}
        <Button onClick={onUp} disabled={disabled || !onUp} aria-label={`${item.name} 위로`}>
          ↑
        </Button>
        <Button onClick={onDown} disabled={disabled || !onDown} aria-label={`${item.name} 아래로`}>
          ↓
        </Button>
      </span>
    </li>
  )
}
