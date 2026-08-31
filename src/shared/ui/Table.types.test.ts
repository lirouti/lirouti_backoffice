/**
 * `Column` 계약의 **컴파일 타임** 회귀 검사 (docs/ARCHITECTURE.md §35).
 *
 * ⚠️ **`bun run typecheck` 이 이 파일의 검사기다.** `@ts-expect-error` 는 **오류가 나지
 *    않으면** 그 자체로 오류라, 타입이 헐거워지는 순간 빌드가 깨진다 — 실행 시점에는
 *    아무것도 하지 않으므로 `vitest` 로는 못 잡는다.
 *
 * 고치려던 것: `key: string` 이던 시절에는 **없는 필드를 적어도 타입 오류 없이 빈 칸**이
 * 나왔다. 관리자 목록의 「최근 접속」 이 실제로 그렇게 비었다.
 */
import { describe, expect, it } from 'vitest'

import type { Column } from './Table'

type Row = {
  name: string
  count: number
  /** 없을 수 있는 값. 빈 칸으로 그리는 것은 의도된 표시다 */
  at?: string
  visible: boolean
  tags: string[]
  /**
   * 타입이 풀려 버린 자리. 안에 무엇이 들었는지 알 수 없다.
   *
   * ⚠️ **여기서만 `any` 를 쓴다.** `no-explicit-any` 가 손으로 적는 길은 이미 막고 있어서
   *    (저장소에 `any` 는 0건이다), 남는 경로는 **타입 없는 의존성에서 새어 들어오는 것**뿐이다.
   *    그 경로를 시험하려면 이 자리에 `any` 가 있어야 한다.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 위 설명 참고
  loose: any
}

/** `render` 가 없으면 `key` 는 행에서 꺼낼 필드 이름이다 */
const ok: Column<Row>[] = [
  { key: 'name', label: '이름' },
  { key: 'count', label: '수' },
  { key: 'at', label: '선택 필드' },
  // `render` 가 있으면 `key` 는 React 키일 뿐이라 아무 문자열이어도 된다
  { key: '문제', label: '문제', render: (r) => r.name },
]

const bad: Column<Row>[] = [
  // @ts-expect-error 행에 없는 필드 — 예전에는 이게 통과해서 빈 칸이 나왔다
  { key: 'nope', label: '없는 필드' },
  // @ts-expect-error `boolean` 은 `ReactNode` 지만 React 가 아무것도 안 그린다 — 같은 빈 칸이다
  { key: 'visible', label: 'boolean 필드' },
  // @ts-expect-error 배열·객체는 그대로 글자가 되지 않는다
  { key: 'tags', label: '배열 필드' },
  // @ts-expect-error `any` 는 조건부 타입에서 양쪽으로 분배돼 그냥 통과한다 — 따로 막는다
  { key: 'loose', label: 'any 필드' },
]

describe('Column', () => {
  // 이 파일의 요점은 위의 `@ts-expect-error` 들이다. 런타임에서는 볼 것이 없다.
  it('타입 검사는 `bun run typecheck` 이 한다', () => {
    expect(ok).toHaveLength(4)
    expect(bad).toHaveLength(4)
  })
})
