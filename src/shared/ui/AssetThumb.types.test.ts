/**
 * `AssetThumb` 계약의 **컴파일 타임** 검사 (docs/ARCHITECTURE.md §8.4).
 *
 * ⚠️ **`bun run typecheck` 이 이 파일의 검사기다.** `@ts-expect-error` 는 오류가 나지
 *    않으면 그 자체로 오류라, 계약이 헐거워지는 순간 빌드가 깨진다 — 실행 시점에는
 *    아무것도 하지 않으므로 `vitest` 로는 못 잡는다.
 *
 * **JSX 를 쓰지 않는다.** 이 저장소의 테스트 대상은 `.test.ts` 뿐이고 `.tsx` 는 일부러
 *    빼 뒀다(§17). props 만 검사하면 `.ts` 로 충분하다 (`Switch.types.test.ts` 와 같다).
 */
import type { ComponentProps } from 'react'

import { describe, expect, it } from 'vitest'

import type { AssetThumb } from './AssetThumb'

type Props = ComponentProps<typeof AssetThumb>

const base = { assetId: 'as_head_0' }

/** 판이 기본이고, 그때만 `paid` 로 판 색을 고른다 */
const ok: Props[] = [
  { ...base },
  { ...base, paid: true },
  { ...base, plate: true, paid: false },
  // 업적 뱃지는 판 없이 오브젝트 자체로 선다
  { ...base, plate: false },
]

const bad: Props[] = [
  // @ts-expect-error 판이 없으면 `paid` 는 뜻이 없다 — 조용히 무시되면 왜 안 어두워지는지 알 수 없다
  { ...base, plate: false, paid: true },
]

describe('AssetThumbProps', () => {
  // 이 파일의 요점은 위의 `@ts-expect-error` 다. 런타임에서는 볼 것이 없다.
  it('타입 검사는 `bun run typecheck` 이 한다', () => {
    expect(ok).toHaveLength(4)
    expect(bad).toHaveLength(1)
  })
})
