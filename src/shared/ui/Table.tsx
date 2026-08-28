import type { ReactNode } from 'react'

import { css, cx } from 'styled-system/css'

/**
 * 열 하나의 계약.
 *
 * `shared/ui` 는 도메인을 모르므로 행 타입을 **제네릭으로 받는다.** 화면이
 * `Column<Item>[]` 을 넘기면 `render` 안에서 타입이 살아 있고, 여기서는
 * `Item` 이 무엇인지 알 필요가 없다.
 */
export type Column<Row> = {
  /** `render` 가 없을 때 꺼내 쓸 필드 */
  key: string
  label: string
  /** 고정 폭. 숫자·날짜처럼 폭이 정해진 열에 준다 */
  width?: string
  minWidth?: string
  align?: 'left' | 'right' | 'center'
  /** 식별자 열처럼 굵게 */
  strong?: boolean
  nowrap?: boolean
  /** 넘치면 말줄임. 긴 사유·제목 열에 쓴다 */
  truncate?: boolean
  /**
   * 값을 직접 그린다. 배지·썸네일처럼 문자열이 아닌 열에 쓴다.
   *
   * 원본 레퍼런스에는 없던 것을 더했다 — 어드민 목록은 상태 배지와 에셋
   * 썸네일이 섞이는 게 기본이라, 없으면 화면마다 표를 다시 만들게 된다.
   */
  render?: (row: Row) => ReactNode
}

type TableProps<Row> = {
  columns: Column<Row>[]
  rows: Row[]
  /**
   * 표의 최소 폭. 좁은 화면에서는 스스로 가로 스크롤한다.
   *
   * **고정 폭 열의 합보다 넉넉하게** 잡는다. 부족하면 `truncate` 열이 몇 글자로
   * 눌려 읽을 수 없게 된다 (원본 `Table.prompt.md` 의 경고).
   */
  minWidth?: number
  /** 행을 눌렀을 때. 주면 행이 키보드로도 조작 가능해진다 */
  onRowClick?: (row: Row, index: number) => void
  selectedIndex?: number
  /** 행마다 안정적인 키. 없으면 인덱스를 쓰는데, 정렬·필터에서 어긋난다 */
  rowKey?: (row: Row, index: number) => string
  className?: string
}

const cell = css({
  p: '10px 14px',
  textStyle: 'body',
  color: 'ink',
  borderBottom: '1px solid token(colors.ln)',
})

const head = css({
  p: '10px 14px',
  textStyle: 'label',
  fontWeight: '700',
  color: 'sub',
  textAlign: 'left',
  bg: 'surf2',
  borderBottom: '1px solid token(colors.bd)',
  whiteSpace: 'nowrap',
})

/**
 * 목록 화면의 본체.
 *
 * 원본 레퍼런스는 hover 를 `useState` 로 들고 있었는데 **CSS 로 옮겼다.**
 * 행 하나에 마우스가 들어올 때마다 표 전체가 리렌더되던 것을, `_hover` 가
 * 리렌더 없이 처리한다. 행이 50개면 차이가 눈에 보인다.
 */
export function Table<Row>({
  columns,
  rows,
  minWidth = 880,
  onRowClick,
  selectedIndex = -1,
  rowKey,
  className,
}: TableProps<Row>) {
  return (
    <div
      className={cx(
        css({
          bg: 'surf',
          border: '1px solid token(colors.bd)',
          borderRadius: 'xl',
          overflow: 'hidden',
        }),
        className,
      )}
    >
      <div className={css({ overflowX: 'auto' })}>
        <table
          className={css({ width: 'full', borderCollapse: 'collapse' })}
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={head}
                  style={{ width: c.width, minWidth: c.minWidth, textAlign: c.align }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey?.(row, i) ?? i}
                data-selected={i === selectedIndex ? '' : undefined}
                // 행 전체가 누를 곳이면 키보드로도 닿아야 한다. `<tr>` 은 기본적으로
                // 포커스를 받지 않아서, 마우스로만 쓸 수 있는 표가 되기 쉽다.
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick && (() => onRowClick(row, i))}
                onKeyDown={
                  onRowClick &&
                  ((e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault() // Space 가 페이지를 스크롤하지 않게
                    onRowClick(row, i)
                  })
                }
                className={css({
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background .12s',
                  '&[data-selected]': { bg: 'prev2' },
                  '&:hover:not([data-selected])': { bg: 'hov' },
                  _focusVisible: { outline: '2px solid token(colors.ringBd)', outlineOffset: '-2px' },
                })}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cell}
                    style={{
                      textAlign: c.align,
                      fontWeight: c.strong ? 600 : undefined,
                      whiteSpace: c.nowrap ? 'nowrap' : undefined,
                      // 말줄임은 `max-width: 0` 이어야 표 안에서 동작한다.
                      maxWidth: c.truncate ? 0 : undefined,
                    }}
                  >
                    {c.render ? (
                      c.render(row)
                    ) : c.truncate ? (
                      <div className={css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
                        {(row as Record<string, ReactNode>)[c.key]}
                      </div>
                    ) : (
                      (row as Record<string, ReactNode>)[c.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
