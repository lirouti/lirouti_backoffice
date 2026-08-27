/**
 * 아이템 목 데이터. 디자인 원본 `build()` 의 생성 규칙을 그대로 옮겼다.
 * 시드 RNG 라서 결과가 항상 같다 — 새로고침해도 숫자가 튀지 않는다.
 */
import { rng } from '@/shared/lib/rng'

import { SLOT_ORDER, type Item, type ItemSource } from '@/domain/item'

import { ASSETS } from './assetTable'

const PAID_PRICES = [480, 720, 960, 1200]
const FREE_SOURCES: ItemSource[] = ['CHALLENGE', 'ACHIEVEMENT', 'LEVEL', 'SEASON_PASS']

let cache: Item[] | null = null

export function allItems(): Item[] {
  if (cache) return cache

  const out: Item[] = []
  for (const slot of SLOT_ORDER) {
    ASSETS[slot].forEach((row, i) => {
      const key = out.length
      const r = rng(key + 7)
      // 원본 규칙: 8% 미노출, 그 다음 8% 예약, 나머지 노출
      const status = r() < 0.08 ? 'HIDDEN' : r() < 0.08 ? 'SCHEDULED' : 'VISIBLE'

      out.push({
        key,
        code: `IT-${1001 + key}`,
        assetId: row.assetId,
        name: row.name,
        sub: row.sub,
        slot,
        tier: row.paid ? 'PAID' : 'FREE',
        price: row.paid ? PAID_PRICES[i % 4]! : 0,
        source: row.paid ? 'SHOP' : FREE_SOURCES[i % 4]!,
        sold: Math.round(240 + r() * 3400),
        own: Math.round(4 + r() * 74),
        status,
        season: row.paid ? `시즌 ${2 + (i % 2)}` : '상시',
        madeAt: `2026-0${4 + (i % 4)}-1${i % 9}`,
      })
    })
  }

  cache = out
  return out
}
