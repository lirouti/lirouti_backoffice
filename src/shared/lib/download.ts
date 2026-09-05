/**
 * 만든 파일을 내려받게 한다.
 *
 * 백업 코드 저장에 있던 것을 꺼냈다 — CSV 내보내기 여섯 곳이 같은 함정을 밟는다
 * (docs/ARCHITECTURE.md §56).
 *
 * ⚠️ **테스트가 없다.** vitest 환경이 `node` 라 DOM 이 없다(§17.6). 브라우저로 확인한다.
 */

/**
 * @param filename 확장자까지 포함한 이름
 * @param text     파일 내용
 * @param mime     `text/csv;charset=utf-8` 처럼 charset 까지 적는다
 *
 * ⚠️ **URL 을 바로 해제하면 안 된다.** `click()` 은 다운로드를 **시작시킬 뿐**이고 브라우저가
 *    Blob 을 읽는 건 그 뒤다. 같은 태스크에서 해제하면 빈 파일이 되거나 실패한다
 *    (즉시 해제 후 `fetch` 하면 `TypeError`). 안 지우면 탭이 닫힐 때까지 메모리에 남으므로
 *    다음 태스크로 미룬다.
 */
export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * CSV 를 내려받는다.
 *
 * ⚠️ **BOM(`\uFEFF`)을 붙인다.** 없으면 **윈도 엑셀이 UTF-8 을 못 알아보고** 한글이
 *    전부 깨진다 — 이 어드민의 값은 대부분 한글이라 없으면 쓸 수 없는 파일이 된다.
 *    엑셀 말고는 BOM 이 있어도 문제 되지 않는다.
 */
export function downloadCsv(filename: string, csv: string): void {
  downloadText(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8')
}
