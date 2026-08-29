/**
 * 아이템 목 데이터. 디자인 원본 `build()` 의 생성 규칙을 그대로 옮겼다.
 * 시드 RNG 라서 결과가 항상 같다 — 새로고침해도 숫자가 튀지 않는다.
 */
import { rng } from '@/shared/lib/rng'

import { SLOT_ORDER, statusOf, type Item, type ItemInput, type ItemSource } from '@/domain/item'

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
      // 원본 규칙을 그대로 옮긴 것이다 (`r() < .08 ? '미노출' : (r() < .08 ? '예약' : '노출')`).
      //
      // **두 번째 판정은 새 난수를 뽑는다.** 그래서 "전체의 8%씩"이 아니라
      // 미노출 8% / 예약 = 남은 92%의 8% ≈ 7.4% / 나머지 노출이다.
      // 한 번만 뽑아 구간을 나누는 것과 다르므로, 고치면 목 데이터가 통째로 바뀐다.
      // 디자인 대조가 목적이라 원본 동작을 유지한다.
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
        // 노출 기간은 대부분 비어 있다("제한 없음"). 예약 상태인 것만 시작일을 갖는다.
        visibleFrom: status === 'SCHEDULED' ? `2026-09-0${1 + (i % 8)}` : '',
        visibleTo: '',
        flags: { shop: row.paid, gacha: r() < 0.3, gift: r() < 0.7 },
      })
    })
  }

  cache = out
  return out
}

/**
 * 등록·수정을 목에 반영한다. **모듈 캐시를 직접 고친다.**
 *
 * 백엔드가 없는 퍼블리싱 단계라 저장이 메모리에서만 산다 — 새로고침하면 시드 RNG 가
 * 처음부터 다시 만든다. 그래도 등록한 것이 목록에 나타나고 수정한 것이 상세에 반영되므로
 * 데모에서 흐름이 끝까지 이어진다.
 *
 * @param key 있으면 수정, 없으면 등록
 */
export function upsertItem(input: ItemInput, key?: number): Item {
  const items = allItems()

  if (key != null) {
    const at = items.findIndex((it) => it.key === key)
    if (at < 0) throw new Error(`수정할 아이템이 없습니다: ${key}`)
    const prev = items[at]!
    // 노출 상태는 등록과 **같은 규칙**으로 다시 정한다 (`domain/item/rules.ts`).
    // 펼치기만 하면 예약 아이템의 노출 시작을 지워도 `SCHEDULED` 로 남는다.
    const next = { ...prev, ...input, status: statusOf(input, prev.status) }
    items[at] = next
    return next
  }

  // 새 번호는 **가장 큰 것 다음**이다. 길이로 잡으면 중간이 지워졌을 때 겹친다.
  const nextKey = items.reduce((max, it) => Math.max(max, it.key), -1) + 1
  const created: Item = {
    ...input,
    key: nextKey,
    code: `IT-${1001 + nextKey}`,
    sold: 0,
    own: 0,
    status: statusOf(input),
    madeAt: new Date().toISOString().slice(0, 10),
  }
  // 새것이 위에 오는 게 아니라 뒤에 붙는다 — 목록 정렬은 화면이 정한다.
  items.push(created)
  return created
}
