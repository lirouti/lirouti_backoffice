/** 둥지 규칙. */
import type { Nest, NestBoundaries } from './types'

/** 첫 둥지는 1일차부터다. 가입 당일에 이미 하나는 있어야 발밑이 비지 않는다 */
export const FIRST_DAY = 1

/**
 * 해금 조건 표시.
 *
 * ⚠️ **저장하지 말 것.** 예전에는 같은 날짜가 카드(`sub`)와 표(`cond`) **두 칸에** 문자열로
 *    들어 있었다 — 경계를 고치면 둘 다 손대야 하고, 하나를 빠뜨리면 같은 화면이 서로 다른
 *    일수를 말한다 (docs/ARCHITECTURE.md §41.4).
 *
 * @param next 다음 둥지의 해금일. 마지막이면 `null`
 */
export function unlockLabel(nest: Nest, next: number | null): string {
  if (next === null) return `누적 ${nest.fromDay}일 이상`
  return `누적 ${nest.fromDay}–${next - 1}일`
}

/** 각 둥지에 해금 조건을 붙여 돌려준다 */
export function withUnlocks(nests: Nest[]): { nest: Nest; unlock: string }[] {
  return nests.map((nest, i) => unlockOf(nests, nest, i))
}

export type NestBoundaryErrors = Partial<Record<keyof NestBoundaries, string>>

/**
 * 경계 검증.
 *
 * ⚠️ **뒤집히면 둥지 하나가 사라진다.** 두 번째 해금일이 세 번째보다 뒤면 두 번째를 볼 수
 *    있는 날이 하루도 없는데, 화면에는 `'누적 100–29일'` 처럼 말이 안 되는 표시로만 드러난다.
 */
export function validateNestBoundaries(b: NestBoundaries): NestBoundaryErrors {
  const errors: NestBoundaryErrors = {}

  if (!Number.isInteger(b.secondFrom) || b.secondFrom <= FIRST_DAY)
    errors.secondFrom = `두 번째 둥지는 ${FIRST_DAY + 1}일 이상의 정수여야 합니다.`
  if (!Number.isInteger(b.thirdFrom) || b.thirdFrom <= FIRST_DAY)
    errors.thirdFrom = `세 번째 둥지는 ${FIRST_DAY + 1}일 이상의 정수여야 합니다.`

  if (!errors.secondFrom && !errors.thirdFrom && b.thirdFrom <= b.secondFrom)
    errors.thirdFrom = '세 번째 둥지는 두 번째보다 뒤에 해금되어야 합니다.'

  return errors
}

export function nestBoundariesOf(nests: Nest[]): NestBoundaries {
  return { secondFrom: nests[1]?.fromDay ?? 2, thirdFrom: nests[2]?.fromDay ?? 3 }
}

/** 경계를 적용한 새 배열. **원본을 건드리지 않는다** */
export function applyNestBoundaries(nests: Nest[], b: NestBoundaries): Nest[] {
  return nests.map((n, i) => {
    if (i === 1) return { ...n, fromDay: b.secondFrom }
    if (i === 2) return { ...n, fromDay: b.thirdFrom }
    return n
  })
}

/** 한 칸 몫. `withUnlocks` 가 쓰는 조각이라 밖으로 내보내지 않는다 */
function unlockOf(all: Nest[], nest: Nest, i: number): { nest: Nest; unlock: string } {
  const next = all[i + 1]
  return { nest, unlock: unlockLabel(nest, next ? next.fromDay : null) }
}
