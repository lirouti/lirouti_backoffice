import type { ReactNode } from 'react'

import { css, cx } from 'styled-system/css'

/** 열마다 같은 모양새 설정 */
type ColumnStyle = {
  /**
   * 열 제목. **비워 두지 말 것** — 빈 `<th>` 는 헤더로 안 쳐져서 **그 열의 칸들이
   * 헤더를 잃는다**(`td-has-header`). 제목이 군더더기인 동작 열은 `labelHidden` 을 쓴다.
   */
  label: string
  /**
   * 열 제목을 **화면에서만** 감춘다. 「보기」·「편집」 같은 **동작 열**에 쓴다.
   *
   * ⚠️ **`label: ''` 로 비우지 말 것.** 빈 `<th>` 는 헤더로 안 쳐져서 그 열의 칸들이
   *    헤더를 잃고, 스크린리더가 **몇 번째 칸인지만 읽고 무엇인지는 말하지 못한다**
   *    (docs/ARCHITECTURE.md §38).
   */
  labelHidden?: boolean
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
}

/**
 * 열 하나의 계약.
 *
 * `shared/ui` 는 도메인을 모르므로 행 타입을 **제네릭으로 받는다.** 화면이
 * `Column<Item>[]` 을 넘기면 `render` 안에서 타입이 살아 있고, 여기서는
 * `Item` 이 무엇인지 알 필요가 없다.
 *
 * ⚠️ **`key` 로 값을 꺼내는 열은 `key` 가 행의 필드여야 한다.** 예전에는 `key: string`
 *    이라 아무 문자열이나 받았고, 꺼낼 때 캐스팅해서 **없는 필드를 적으면 타입 오류
 *    없이 빈 칸이 나왔다** — 실제로 관리자 목록의 「최근 접속」 이 그렇게 비었다
 *    (docs/ARCHITECTURE.md §35).
 *
 * 그래서 둘 중 하나다.
 * - `render` 가 있으면 `key` 는 **React 키일 뿐**이라 아무 문자열이어도 된다
 * - `render` 가 없으면 `key` 는 **행에서 꺼낼 필드 이름**이라 실재해야 한다
 */
export type Column<Row> = ColumnStyle &
  (
    | { key: string; render: (row: Row) => ReactNode }
    | { key: FieldKey<Row>; render?: never }
  )

/**
 * `T` 가 `any` 인가.
 *
 * ⚠️ **`any` 는 조건부 타입에서 양쪽 가지로 분배된다** — `any extends string | number` 가
 *    참이자 거짓이라 아래 검사를 그냥 통과한다. `0 extends 1 & T` 는 `T` 가 `any` 일 때만
 *    참인데, `1 & any` 가 `any` 라서 `0` 이 거기 들어가기 때문이다.
 */
type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * 그대로 글자가 되는 필드의 이름만.
 *
 * ⚠️ **`ReactNode` 로 좁히면 부족하다.** `ReactNode` 에는 `boolean` 이 들어 있고 React 는
 *    `true`/`false` 를 **아무것도 그리지 않는다** — 타입은 통과하는데 칸은 비는, 고치려던
 *    바로 그 모양이 된다. 객체·배열·함수도 같은 이유로 뺀다.
 *
 * `null`·`undefined` 는 허용한다 — 「값이 없다」 를 빈 칸으로 그리는 것은 의도된 표시다.
 *
 * ⚠️ **`any` 도 막는다.** `any` 는 아래 검사를 그냥 통과하는데, 실제로 들어 있는 값이
 *    `boolean` 이면 **똑같이 빈 칸**이 된다 — 보증에 예외를 하나 남기면 그 예외가
 *    다음 사고의 자리가 된다 (docs/ARCHITECTURE.md §35.2).
 */
type FieldKey<Row> = {
  [K in keyof Row]-?: K extends string
    ? IsAny<Row[K]> extends true
      ? never
      : NonNullable<Row[K]> extends string | number
        ? K
        : never
    : never
}[keyof Row]

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
                  {/*
                    감출 때도 **글자는 DOM 에 남긴다.** 안 그리면 `<th>` 가 비어서 헤더로
                    안 쳐지고, 그 열의 칸들이 헤더를 잃는다 (§38).
                  */}
                  {c.labelHidden ? <span className={css({ srOnly: true })}>{c.label}</span> : c.label}
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
                        {value(row, c)}
                      </div>
                    ) : (
                      value(row, c)
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

/**
 * `render` 가 없는 열의 값.
 *
 * ⚠️ **캐스팅이지만 이제는 안전하다** — `Column` 의 유니온이 `key` 를 행의 필드로
 *    좁혀 두므로, 여기 도달하는 `key` 는 반드시 실재하는 필드다 (§35).
 */
function value<Row>(row: Row, c: Column<Row>): ReactNode {
  return (row as Record<string, ReactNode>)[c.key]
}
