/**
 * 표를 CSV 문자열로.
 *
 * 무엇을 어떤 이름으로 내보낼지는 **화면이 정한다** — 여기는 형식만 안다
 * (docs/ARCHITECTURE.md §56).
 */

/** 열 하나. `value` 가 돌려주는 것이 그 칸에 그대로 들어간다 */
export type CsvColumn<T> = {
  /** 첫 줄에 찍힐 이름 */
  header: string
  value: (row: T) => string | number | null | undefined
}

/**
 * ⚠️ **엑셀에서 수식으로 실행되는 첫 글자들.**
 *
 * 셀이 이 글자로 시작하면 엑셀·구글 시트가 **수식으로 해석한다.** 어드민이 내보내는 값에는
 * 회원 닉네임·문의 본문처럼 **사람이 적은 것**이 섞여 있어서, `=HYPERLINK(...)` 같은 것을
 * 닉네임에 넣어 두면 그 파일을 연 운영자의 엑셀에서 실행된다(CSV injection).
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/

/**
 * 한 칸을 CSV 규격(RFC 4180)으로 감싼다.
 *
 * ⚠️ **`,` · `"` · 줄바꿈이 들어 있으면 반드시 따옴표로 감싸야 한다.** 안 그러면 한 칸이
 *    여러 칸으로 갈라져 **표가 통째로 밀린다** — 문의 본문처럼 긴 글에서 바로 난다.
 *    안쪽의 `"` 는 두 번 적어 이스케이프한다.
 */
function cell(raw: string | number | null | undefined): string {
  // `null`·`undefined` 는 빈 칸이다. `0` 과 `''` 은 값이므로 그대로 둔다.
  if (raw == null) return ''

  // ⚠️ **숫자는 손대지 않는다.** `-120` 은 `-` 로 시작하니 아래 수식 방지에 걸리는데,
  //    `'-120` 이 되면 **엑셀이 문자열로 읽어 합계에서 빠진다.** 수식 주입은 사람이 적은
  //    **문자열**의 문제이지 숫자의 문제가 아니다.
  if (typeof raw === 'number') return String(raw)

  // ⚠️ 수식 방지는 **감싸기 전에** 한다 — 따옴표 안이어도 엑셀은 수식으로 읽는다.
  const guarded = FORMULA_LEAD.test(raw) ? `'${raw}` : raw

  // ⚠️ **칸 안의 줄바꿈도 CRLF 로 맞춘다.** 감싸기만으로는 부족하다 — RFC 4180 의 문법이
  //    CRLF 라, 문의 본문처럼 `\n` 이 섞인 값을 그대로 두면 엄격한 파서가 레코드를 잘못
  //    나눈다. 파일 전체가 한 가지 줄 끝만 쓰게 한다.
  const text = guarded.replace(/\r\n|[\r\n]/g, '\r\n')

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * ⚠️ **줄 끝은 CRLF 다.** RFC 4180 이 그렇고, 윈도 엑셀이 LF 만 있는 파일에서 줄을
 *    합쳐 버리는 일이 있다.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const head = columns.map((c) => cell(c.header)).join(',')
  const body = rows.map((row) => columns.map((c) => cell(c.value(row))).join(','))
  return [head, ...body].join('\r\n')
}

/**
 * 구역 하나 — 제목 줄 + 그 아래 표.
 *
 * ⚠️ **제목도 `toCsv` 를 거친다.** 제목에 쉼표가 들어가면 감싸야 하는데 그냥 이어 붙이면
 *    그 줄만 규격을 벗어난다.
 */
export function csvSection<T>(
  title: string,
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
): string {
  return `${toCsv([], [{ header: title, value: () => '' }])}\r\n${toCsv(rows, columns)}`
}

/**
 * 구역들을 **한 파일로** 잇는다. 빈 줄 하나로 나눈다.
 *
 * ⚠️ **엄격한 CSV 가 아니다.** 구역마다 열 수가 다르므로 파서에 그대로 물리면 깨진다 —
 *    **사람이 엑셀에서 한 번에 열어 보는 용도**다. 도구에 물릴 값이면 `toCsv` 로 표
 *    하나씩 내보낸다 (docs/ARCHITECTURE.md §57.2).
 *
 * 구역마다 타입이 다르므로 **문자열로 받는다** — 하나의 제네릭으로는 묶이지 않는다.
 */
export const joinCsvSections = (sections: readonly string[]): string =>
  sections.join('\r\n\r\n')
