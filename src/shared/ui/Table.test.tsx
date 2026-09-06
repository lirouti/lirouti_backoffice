// @vitest-environment jsdom
/**
 * 표 헤더와 본문은 정렬 기준이 다르다.
 * 헤더는 모두 중앙이고 본문만 열의 값 종류에 맞춰 정렬한다 (docs/ARCHITECTURE.md §35.2).
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Table, type Column } from './Table'

type Row = { name: string; count: number }

const columns: Column<Row>[] = [
  { key: 'name', label: '이름' },
  { key: 'count', label: '수량', align: 'right' },
]

describe('Table 정렬', () => {
  it('헤더는 모두 중앙이고 본문만 열 정렬을 따른다', () => {
    const { container } = render(<Table columns={columns} rows={[{ name: '깃털', count: 12 }]} />)
    const heads = [...container.querySelectorAll('th')]
    const cells = [...container.querySelectorAll('td')]

    for (const head of heads) expect(head.classList).toContain('ta_center')
    expect(heads[1]?.style.textAlign).toBe('')
    expect(cells[0]?.style.textAlign).toBe('')
    expect(cells[1]?.style.textAlign).toBe('right')
  })
})
