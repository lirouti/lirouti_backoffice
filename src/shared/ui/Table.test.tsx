// @vitest-environment jsdom
/**
 * 표의 헤더와 본문은 **같은 정렬을 쓴다.**
 * 값 종류가 정렬을 정하고 제목은 제 데이터 위에 선다 (docs/ARCHITECTURE.md §35.2).
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Table, type Column } from './Table'

type Row = { name: string; count: number; state: string }

const columns: Column<Row>[] = [
  { key: 'name', label: '이름' },
  { key: 'count', label: '수량', align: 'right' },
  { key: 'state', label: '상태', align: 'center' },
]

describe('Table 정렬', () => {
  it('헤더가 본문과 같은 정렬을 따른다', () => {
    const { container } = render(
      <Table columns={columns} rows={[{ name: '깃털', count: 12, state: '노출' }]} />,
    )
    const heads = [...container.querySelectorAll('th')]
    const cells = [...container.querySelectorAll('td')]

    for (const [i, want] of ['left', 'right', 'center'].entries()) {
      expect(heads[i]?.style.textAlign).toBe(want)
      expect(cells[i]?.style.textAlign).toBe(want)
    }
  })

  /**
   * ⚠️ **`<th>` 의 브라우저 기본값이 `center` 라** 안 적으면 제목만 가운데 남는다.
   *    그래서 「비워 두면 좌측」 이 아니라 **명시적으로 좌측**이어야 한다.
   */
  it('정렬을 안 준 열은 헤더도 좌측으로 못 박는다', () => {
    const { container } = render(
      <Table
        columns={[{ key: 'name', label: '이름' }]}
        rows={[{ name: '깃털', count: 0, state: '' }]}
      />,
    )
    expect(container.querySelector('th')?.style.textAlign).toBe('left')
  })
})
