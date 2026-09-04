/**
 * 인기 아이템 TOP 5 카드.
 *
 * 정렬 규칙은 `domain/item` 의 `topSelling` 이 갖는다 — 화면은 고르지 않고 그린다.
 */
import { Link } from 'react-router'

import { css } from 'styled-system/css'

import { count, pct } from '@/shared/lib/format'
import { AssetThumb } from '@/shared/ui/AssetThumb'
import { Card, CardTitle } from '@/shared/ui/Card'

import { SLOT_LABEL, TIER_LABEL, type Item } from '@/domain/item'
import { SCREENS } from '@/domain/screens'

export function TopItemsCard({ items }: { items: Item[] }) {
  return (
    <Card className={css({ flex: '1 1 340px', p: '17px 19px 19px' })}>
      <CardTitle title="인기 아이템 TOP 5" />
      <div
        className={css({ display: 'flex', flexDirection: 'column', gap: '9px', mt: '13px' })}
      >
        {items.map((it) => (
          <Link
            key={it.key}
            to={SCREENS.item.path.replace(':itemId', String(it.key))}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              p: '7px',
              borderRadius: 'lg',
              color: 'ink',
              _hover: { bg: 'prev2', color: 'ink' },
            })}
          >
            <AssetThumb assetId={it.assetId} paid={it.tier === 'PAID'} alt={it.name} />
            <div className={css({ flex: '1', minWidth: '0' })}>
              <div className={css({ textStyle: 'body', fontWeight: '700', color: 'ink' })}>
                {it.name}
              </div>
              <div className={css({ textStyle: 'caption', color: 'faint' })}>
                {SLOT_LABEL[it.slot]} · {TIER_LABEL[it.tier]}
              </div>
            </div>
            <div className={css({ textAlign: 'right', flex: 'none' })}>
              <div
                className={css({
                  textStyle: 'body',
                  fontWeight: '700',
                  color: 'ink',
                  whiteSpace: 'nowrap',
                })}
              >
                {count(it.sold)}
              </div>
              <div className={css({ textStyle: 'caption', color: 'faint' })}>
                보유율 {pct(it.own)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  )
}
