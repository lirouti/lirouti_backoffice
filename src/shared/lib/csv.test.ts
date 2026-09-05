/**
 * CSV 형식.
 *
 * 규격을 어기면 **표가 조용히 밀린다** — 한 칸이 여러 칸으로 갈라져도 파일은 열리기
 * 때문에, 눈으로는 「내려받아졌다」로 보인다 (docs/ARCHITECTURE.md §56.2).
 */
import { describe, expect, it } from 'vitest'

import { toCsv, type CsvColumn } from './csv'

type Row = { name: string; n: number | null }
const COLS: CsvColumn<Row>[] = [
  { header: '이름', value: (r) => r.name },
  { header: '수', value: (r) => r.n },
]

/** 한 칸짜리 표 — 값 하나가 어떻게 나가는지만 볼 때 */
const one = (v: string | number | null): string =>
  toCsv([{ v }], [{ header: 'v', value: (r) => r.v }])

/**
 * ⚠️ **칸 안에 줄바꿈이 있으면 이걸로 자르면 안 된다.** 감싼 칸 안의 CRLF 까지 갈라져서
 *    행이 늘어난다 — 그 경우에는 `toCsv` 결과 전체를 그대로 본다.
 */
const body = (rows: Row[]): string[] => toCsv(rows, COLS).split('\r\n').slice(1)

describe('toCsv', () => {
  it('첫 줄은 열 이름, 줄 끝은 CRLF', () => {
    expect(toCsv([{ name: '가', n: 1 }], COLS)).toBe('이름,수\r\n가,1')
  })

  it('행이 없어도 열 이름은 남는다 — 빈 파일은 왜 비었는지 말하지 못한다', () => {
    expect(toCsv([], COLS)).toBe('이름,수')
  })

  // 감싸지 않으면 한 칸이 두 칸이 되어 그 행부터 열이 통째로 밀린다.
  it('쉼표·따옴표가 있으면 감싸고, 안쪽 따옴표는 두 번 적는다', () => {
    expect(body([{ name: '가,나', n: 1 }])[0]).toBe('"가,나",1')
    expect(one('그는 "말했다"')).toBe('v\r\n"그는 ""말했다"""')
  })

  // 문의 본문처럼 여러 줄인 값이 그대로 들어온다. RFC 4180 의 문법이 CRLF 라
  // `\n` 을 남겨 두면 엄격한 파서가 레코드를 잘못 나눈다.
  it('⚠️ 칸 안의 줄바꿈은 감싸고 CRLF 로 맞춘다', () => {
    expect(one('첫 줄\n둘째 줄')).toBe('v\r\n"첫 줄\r\n둘째 줄"')
    // `\r` 하나만 있거나 이미 CRLF 여도 결과는 같다 — 파일 전체가 한 가지 줄 끝만 쓴다.
    expect(one('가\r나')).toBe('v\r\n"가\r\n나"')
    expect(one('가\r\n나')).toBe('v\r\n"가\r\n나"')
  })

  // `null` 은 값이 없는 것이고 `0`·`''` 은 값이다 — 셋을 같게 다루면 「0건」이 사라진다.
  it('null 은 빈 칸, 0 과 빈 문자열은 값이다', () => {
    expect(body([{ name: '가', n: null }])[0]).toBe('가,')
    expect(body([{ name: '', n: 0 }])[0]).toBe(',0')
  })

  // 회원 닉네임·문의 제목이 그대로 들어가는 자리다. 엑셀은 이 글자로 시작하면 수식으로 읽는다.
  it('⚠️ 수식으로 시작하는 문자열은 앞에 홑따옴표를 붙인다 (CSV injection)', () => {
    expect(one('=HYPERLINK("http://x","눌러")')).toBe(
      'v\r\n"\'=HYPERLINK(""http://x"",""눌러"")"',
    )
    for (const lead of ['=', '+', '-', '@']) {
      expect(one(`${lead}1+1`)).toBe(`v\r\n'${lead}1+1`)
    }
  })

  // ⚠️ `-120` 은 `-` 로 시작해 위 방지에 걸리는데, `'-120` 이 되면 엑셀이 문자열로 읽어
  //    **합계에서 빠진다.** 수식 주입은 사람이 적는 문자열의 문제다.
  it('⚠️ 음수는 숫자로 남는다 — 같은 값이라도 문자열이면 방지 대상이다', () => {
    expect(one(-120)).toBe('v\r\n-120')
    expect(one('-120')).toBe(`v\r\n'-120`)
  })

  it('평범한 값은 감싸지 않는다 — 감싸면 파일만 커진다', () => {
    expect(body([{ name: '밀짚모자', n: 720 }])[0]).toBe('밀짚모자,720')
  })
})
