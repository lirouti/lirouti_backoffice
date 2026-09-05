/** 재화 · 상점 규칙. */
import type { GemProduct, GemProductInput, GemStatus } from './types'

/**
 * 상품별 판매 비중 (%). `key` → 정수 %. **건수 기준이지 매출 기준이 아니다.**
 *
 * ⚠️ **파는 것만 분모에 넣는다.** 중단·예약 상품의 지난 건수까지 세면 지금 팔리는
 *    상품들의 비중 합이 100 에 못 미쳐, 표를 세로로 더한 운영자가 숫자를 의심한다.
 *
 * ⚠️ **행마다 따로 반올림하면 합이 100 이 아니다.** 각자 `Math.round` 하면 건수가
 *    고를 때 오차가 같은 방향으로 쌓인다 — 건수 `[1,1,1]` 은 99, `[1,1,1,1,1,1]` 은
 *    **102** 가 된다. 그래서 **최대 나머지 방식**으로 배분한다: 전부 내림한 뒤 남은
 *    %P 를 소수부가 큰 것부터 1 씩 준다 (docs/ARCHITECTURE.md §24.2).
 *
 * 목록 전체를 한 번에 받는 이유가 이것이다 — 한 행만 보고는 배분할 수 없다.
 */
export function orderShares(list: GemProduct[]): Record<number, number> {
  const out: Record<number, number> = {}
  for (const p of list) out[p.key] = 0

  const sold = list.filter((p) => p.status === '판매중')
  const total = sold.reduce((sum, p) => sum + p.orders, 0)
  if (total === 0) return out

  const exact = sold.map((p) => ({
    key: p.key,
    orders: p.orders,
    pct: (p.orders / total) * 100,
  }))
  let left = 100
  for (const e of exact) {
    out[e.key] = Math.floor(e.pct)
    left -= Math.floor(e.pct)
  }

  // 소수부가 큰 것부터. 동률이면 건수가 많은 쪽, 그래도 같으면 key 순 —
  // **새로고침할 때마다 다른 상품이 1%P 를 받으면 안 된다.**
  const order = [...exact].sort(
    (a, b) => (b.pct % 1) - (a.pct % 1) || b.orders - a.orders || a.key - b.key,
  )
  for (let i = 0; i < left; i += 1) out[order[i]!.key] += 1
  return out
}

/**
 * 젬 하나당 원. **보너스를 포함해 나눈다** — 회원이 받는 것이 그 합이다.
 *
 * 저장된 상품과 **폼이 들고 있는 값**을 같은 자로 재야 해서 세 칸만 받는다.
 */
export const pricePerGem = (p: Pick<GemProduct, 'gem' | 'bonus' | 'price'>): number => {
  const total = p.gem + p.bonus
  return total === 0 ? 0 : p.price / total
}

/** 목록 위 지표 */
export type GemSummary = {
  /** 지금 파는 상품 수 */
  selling: number
  /** 최근 7일 매출 합(원). **파는 것만** */
  revenue: number
  /** 최근 7일 결제 건수 합 */
  orders: number
}

export function summarizeGems(list: GemProduct[]): GemSummary {
  const sold = list.filter((p) => p.status === '판매중')
  return {
    selling: sold.length,
    revenue: sold.reduce((sum, p) => sum + p.revenue, 0),
    orders: sold.reduce((sum, p) => sum + p.orders, 0),
  }
}

export const GEM_STATUSES: GemStatus[] = ['판매중', '예약', '중단']

/** 어느 칸이 왜 막혔는가. 비어 있으면 저장할 수 있다. */
export type GemProductInputErrors = Partial<Record<keyof GemProductInput, string>>

/**
 * 등록·수정 폼의 검증.
 *
 * ⚠️ **화면의 체크리스트도 이걸 쓴다.** 따로 계산하면 **체크는 초록인데 저장이 막히는**
 *    화면이 만들어진다 (§18.7 과 같은 규칙).
 *
 * @param taken 이미 쓰고 있는 이름. 수정이면 **자기 것을 뺀** 목록이다
 */
export function validateGemProduct(
  input: GemProductInput,
  taken: string[] = [],
): GemProductInputErrors {
  const errors: GemProductInputErrors = {}

  const name = input.name.trim()
  if (!name) errors.name = '상품명을 입력하세요.'
  // 표에 이름 말고 상품을 가리키는 열이 없다. 같은 이름이 둘이면 **어느 쪽을 고쳤는지
  // 알 수 없고**, 판매 비중 표도 두 줄이 같은 이름으로 선다.
  else if (taken.some((t) => t.trim() === name)) errors.name = '이미 쓰고 있는 상품명입니다.'

  // 0 젬이면 **돈만 받고 아무것도 주지 않는 상품**이 만들어진다.
  if (!isCount(input.gem) || input.gem < 1) errors.gem = '젬은 1 이상이어야 합니다.'

  // 보너스는 없을 수 있다(0). 음수는 **받은 젬을 도로 빼앗는** 뜻이 된다.
  if (!isCount(input.bonus)) errors.bonus = '보너스는 0 이상이어야 합니다.'

  // 0 원은 결제가 성립하지 않는다 — 젬을 그냥 주려면 상품이 아니라 쿠폰이다(§28).
  if (!isCount(input.price) || input.price < 1) errors.price = '가격은 1원 이상이어야 합니다.'

  // ⚠️ **아는 상태인지 여기서 본다.** 목록이 값이라 타입이 못 막는다 — 초안(§33.1)이나
  //    손으로 고친 값이 들어오면 목록에서 배지 색을 찾지 못해 화면이 깨진다.
  if (!GEM_STATUSES.includes(input.status)) errors.status = '없는 상태입니다.'

  return errors
}

/** 젬·원은 소수도 음수도 없다. `NaN`·`Infinity` 도 여기서 걸린다 */
const isCount = (n: number): boolean => Number.isSafeInteger(n) && n >= 0

/**
 * ⚠️ **더 싼 상품이 젬당 더 유리하면 이 상품은 팔리지 않는다.**
 *
 * 지금 다섯은 클수록 젬당 싸다(11.0 → 10.3 → 9.5 → 8.5 → 8.1). 이 순서가 뒤집힌 상품은
 * **등록은 되지만 아무도 사지 않는다** — 같은 돈으로 더 많이 주는 팩이 바로 위에 있다.
 *
 * 막지는 않는다. 기간 한정 구성처럼 **일부러 그렇게 두는 경우**가 있고, 우리는 그 의도를
 * 모른다. 대신 저장 전에 보여 준다 (§59.2).
 *
 * @param others 비교 대상. **파는 것만** 넘긴다 — 중단된 상품과의 역전은 뜻이 없다
 * @returns 역전을 일으킨 상품. 없으면 `null`
 */
export function cheaperBetterDeal(
  input: GemProductInput,
  others: GemProduct[],
): GemProduct | null {
  const per = pricePerGem(input)
  if (per === 0) return null

  const found = others.filter((o) => o.status === '판매중' && o.price < input.price)
  // 젬당이 가장 유리한 것을 고른다 — 여럿이면 **가장 크게 어긋난 것**을 보여 준다.
  let worst: GemProduct | null = null
  for (const o of found) {
    if (pricePerGem(o) >= per) continue
    if (!worst || pricePerGem(o) < pricePerGem(worst)) worst = o
  }
  return worst
}

/**
 * **새 상품이 실제로 저장될 모습** — 상태를 「예약」 으로 **덮어쓴다.**
 *
 * ⚠️ **화면이 상태 칸을 안 그리는 것만으로는 못 막는다.** 등록 폼의 값은
 *    `sessionStorage` 초안에서도 온다(§33.1). 모양 검사는 타입만 보므로
 *    `status: '판매중'` 이 든 초안이 그대로 폼에 들어가고, `GEM_STATUSES` 에 있는 값이라
 *    검증도 통과한다 — **스토어에 없는 상품이 판매중으로 등록된다.**
 *    불변식은 그것을 아는 자리(파사드)에서 강제한다 (docs/ARCHITECTURE.md §59.1).
 */
export const asNewGemProduct = (input: GemProductInput): GemProductInput => ({
  ...input,
  status: '예약',
})

/** 등록 화면의 초기값. **「예약」 으로 시작한다** — 스토어 심사 전이다 (§59.1) */
export function emptyGemProductInput(): GemProductInput {
  return { name: '', gem: 0, bonus: 0, price: 0, status: '예약' }
}

/** `GemProduct` 에서 폼이 편집하는 부분만 떼어낸다 (수정 화면의 초기값). */
export function toGemProductInput(p: GemProduct): GemProductInput {
  const { name, gem, bonus, price, status } = p
  return { name, gem, bonus, price, status }
}
