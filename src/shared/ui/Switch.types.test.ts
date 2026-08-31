/**
 * `Switch` 계약의 **컴파일 타임** 검사 (docs/ARCHITECTURE.md §37.3).
 *
 * ⚠️ **`bun run typecheck` 이 이 파일의 검사기다.** `@ts-expect-error` 는 오류가 나지
 *    않으면 그 자체로 오류라, 계약이 헐거워지는 순간 빌드가 깨진다 — 실행 시점에는
 *    아무것도 하지 않으므로 `vitest` 로는 못 잡는다.
 *
 * **JSX 를 쓰지 않는다.** 이 저장소의 테스트 대상은 `.test.ts` 뿐이고 `.tsx` 는 일부러
 *    빼 뒀다(§17). props 만 검사하면 `.ts` 로 충분하다.
 */
import type { ComponentProps } from 'react'

import { describe, expect, it } from 'vitest'

import type { Switch } from './Switch'

type Props = ComponentProps<typeof Switch>

const base = { checked: false, onChange: () => {}, label: '앱에 노출' }

/** 라벨이 보이면 힌트를 붙일 수 있다 */
const ok: Props[] = [
  { ...base },
  { ...base, hint: '끄면 앱에서 사라집니다' },
  { ...base, labelHidden: true },
]

const bad: Props[] = [
  // @ts-expect-error 라벨을 감추면 힌트가 무엇을 설명하는지 없는 글자가 된다
  { ...base, labelHidden: true, hint: '설명' },
]

describe('SwitchProps', () => {
  // 이 파일의 요점은 위의 `@ts-expect-error` 다. 런타임에서는 볼 것이 없다.
  it('타입 검사는 `bun run typecheck` 이 한다', () => {
    expect(ok).toHaveLength(3)
    expect(bad).toHaveLength(1)
  })
})
