/**
 * 첫 로드 예산의 **판정**만. 파일을 읽고 gzip 하는 일은 `check-bundle.ts` 가 한다.
 *
 * 코드를 읽는 코드는 눈으로 맞는지 확인할 수가 없어서 픽스처로 테스트한다
 * (`bundle-rules.test.ts`). 주석 검사기가 오탐을 세 번 낸 뒤에 세운 규율이다.
 */

/** 빌드 산출물 하나 */
export type Asset = { name: string; gzipBytes: number }

export type BudgetReport = {
  assets: Asset[]
  totalBytes: number
  budgetBytes: number
  over: boolean
}

/** `rel` 은 공백으로 여러 개가 올 수 있다 (`rel="preload stylesheet"`) */
const relHas = (tag: string, want: string): boolean => {
  const rel = /\brel="([^"]*)"/.exec(tag)?.[1] ?? ''
  return rel.split(/\s+/).includes(want)
}

const LOCAL = /^\/assets\//

/**
 * `dist/index.html` 이 **처음부터 받는** 파일들.
 *
 * 세는 것은 셋뿐이다 — `<script src>` · `<link rel="modulepreload">` · `<link rel="stylesheet">`.
 * **lazy 청크는 안 걸린다** — 그게 이 예산이 재려는 경계다.
 *
 * ⚠️ **태그와 `rel` 을 보지 않고 `src|href` 만 긁으면 안 된다.** 지금 `index.html` 에는
 *    없지만 파비콘(`rel="icon"`)이나 `<img>` 하나만 들어와도 예산에 딸려 들어가
 *    **문서에 적은 경계와 다른 것을 재게 된다.** 그러면 빌드가 엉뚱하게 실패하고,
 *    범인을 찾느라 엔트리를 뒤지게 된다.
 *
 * ⚠️ **외부 링크도 빼야 한다.** `preconnect` 의 `href` 는 `https://cdn.jsdelivr.net` 이라
 *    존재하지 않는 파일을 읽으려 한다.
 */
export function entryAssets(html: string): string[] {
  const out: string[] = []

  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const isScript = tag.startsWith('<script')
    const attr = isScript ? 'src' : 'href'
    if (!isScript && !relHas(tag, 'modulepreload') && !relHas(tag, 'stylesheet')) continue

    const url = new RegExp(`\\b${attr}="([^"]+)"`).exec(tag)?.[1]
    if (url && LOCAL.test(url)) out.push(url.replace(LOCAL, ''))
  }

  // 같은 파일이 두 번 참조될 수 있다(modulepreload + script). 바이트를 두 번 세면 안 된다.
  return [...new Set(out)]
}

export const KB = 1024

/** 소수 둘째 자리까지 — 0.3KB 씩 늘어나는 것을 봐야 한다 */
export const kb = (bytes: number): string => `${(bytes / KB).toFixed(2)} KB`

export function report(assets: Asset[], budgetBytes: number): BudgetReport {
  const totalBytes = assets.reduce((sum, a) => sum + a.gzipBytes, 0)
  return { assets, totalBytes, budgetBytes, over: totalBytes > budgetBytes }
}

/**
 * 사람이 읽는 결과. 넘든 안 넘든 **내역을 항상 보여 준다** — 숫자가 조용히 자라는 것을
 * 막는 게 이 검사의 절반이다.
 */
export function lines(r: BudgetReport): string[] {
  const rows = [...r.assets]
    .sort((a, b) => b.gzipBytes - a.gzipBytes)
    .map((a) => `  ${kb(a.gzipBytes).padStart(9)}  ${a.name}`)

  const left = r.budgetBytes - r.totalBytes
  const verdict = r.over
    ? `첫 로드 ${kb(r.totalBytes)} — 예산 ${kb(r.budgetBytes)} 를 ${kb(-left)} 넘었습니다`
    : `첫 로드 ${kb(r.totalBytes)} / ${kb(r.budgetBytes)} (여유 ${kb(left)})`

  return [...rows, '', verdict]
}
