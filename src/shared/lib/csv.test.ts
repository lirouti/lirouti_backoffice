/**
 * CSV 형식.
 *
 * 규격을 어기면 **표가 조용히 밀린다** — 한 칸이 여러 칸으로 갈라져도 파일은 열리기
 * 때문에, 눈으로는 「내려받아졌다」로 보인다 (docs/ARCHITECTURE.md §56).
 */
import { describe, expect, it } from 'vitest'

import { toCsv, type CsvColumn } from './csv'

type Row = { name: string; n: number | null }
const COLS: CsvColumn<Row>[] = [
  { header: '이름', value: (r) => r.name },
  { header: '수', value: (r) => r.n },
]

const body = (rows: Row[]): string[] => toCsv(rows, COLS).split('\r\n').slice(1)

describe('toCsv', () => {
  it('첫 줄은 열 이름, 줄 끝은 CRLF', () => {
    expect(toCsv([{ name: '가', n: 1 }], COLS)).toBe('이름,수\r\n가,1')
  })

  it('행이 없어도 열 이름은 남는다 — 빈 파일은 왜 비었는지 말하지 못한다', () => {
    expect(toCsv([], COLS)).toBe('이름,수')
  })

  // 감싸지 않으면 한 칸이 두 칸이 되어 그 행부터 열이 통째로 밀린다.
  it('쉼표·따옴표·줄바꿈이 있으면 감싸고, 안쪽 따옴표는 두 번 적는다', () => {
    expect(body([{ name: '가,나', n: 1 }])[0]).toBe('"가,나",1')
    expect(body([{ name: '그는 "말했다"', n: 1 }])[0]).toBe('"그는 ""말했다""",1')
    expect(body([{ name: '첫 줄\n둘째 줄', n: 1 }])[0]).toBe('"첫 줄\n둘째 줄",1')
  })

  // `null` 은 값이 없는 것이고 `0`·`''` 은 값이다 — 셋을 같게 다루면 「0건」이 사라진다.
  it('null 은 빈 칸, 0 과 빈 문자열은 값이다', () => {
    expect(body([{ name: '가', n: null }])[0]).toBe('가,')
    expect(body([{ name: '', n: 0 }])[0]).toBe(',0')
  })

  // 회원 닉네임·문의 본문이 그대로 들어가는 자리다. 엑셀은 이 글자로 시작하면 수식으로 읽는다.
  it('⚠️ 수식으로 시작하는 값은 앞에 홑따옴표를 붙인다 (CSV injection)', () => {
    expect(body([{ name: '=HYPERLINK("http://evil","눌러")', n: 1 }])[0]).toBe(
      `"'=HYPERLINK(""http://evil"",""눌러"")",1`,
    )
    for (const lead of ['=', '+', '-', '@']) {
      expect(body([{ name: `${lead}1+1`, n: 1 }])[0]).toMatch(/^'?"?'/)
    }
  })

  it('평범한 값은 감싸지 않는다 — 감싸면 파일만 커진다', () => {
    expect(body([{ name: '밀짚모자', n: 720 }])[0]).toBe('밀짚모자,720')
  })
})
