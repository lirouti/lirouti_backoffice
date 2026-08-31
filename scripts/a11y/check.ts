import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
/**
 * 구현된 화면 전부를 Lighthouse 접근성으로 훑는다. (docs/ARCHITECTURE.md §38)
 *
 *   bun run dev            # 먼저 띄워 둔다
 *   bun run a11y           # 전부
 *   bun run a11y /items    # 골라서
 *
 * ⚠️ **이 폴더는 의존성을 따로 갖는 미니 프로젝트다.** Lighthouse 와 크롬 조종기는
 *    190 패키지가 넘는데, 화면을 만들 때만 쓰는 도구를 **모두의 `bun install` 에 얹지
 *    않으려고** 갈라 뒀다. `bun run a11y` 가 처음 돌 때 여기에만 설치한다 (§38.3).
 *
 * **왜 필요한가** — 점수만 보면 못 찾는 것이 있다. `label-content-name-mismatch` 와
 * `td-has-header` 는 **가중치가 0** 이라 100 점을 유지한 채 몇 달 동안 실패해 있었다
 * (§37 · §38). 그래서 이 검사는 **점수와 함께 실패한 검사 id 를 찍고, 하나라도 있으면
 * 실패로 끝난다.**
 *
 * ⚠️ **`bun run lint` 에 넣지 않았다.** 서버와 크롬이 떠 있어야 하고 화면 하나에 몇 초가
 *    걸린다 — 매 커밋에 물리면 사람이 검사를 끄게 된다. **화면을 새로 만들면 돌린다.**
 */
import { readFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const BASE = process.env.A11Y_BASE ?? 'http://localhost:5173'

/**
 * 인증 뒤 화면이라 목 세션을 먼저 심는다.
 *
 * ⚠️ **최고 관리자로 잰다.** 운영자로 재면 권한 밖 화면이 리다이렉트돼서 **엉뚱한 화면을
 *    100 점이라고 보고한다.**
 */
const VIEWER = JSON.stringify({
  state: { viewer: { role: 'top', name: '김하늘', email: 'sky@riruti.co', scopes: [] } },
  version: 0,
})

/**
 * 검사할 경로.
 *
 * ⚠️ **파라미터가 있는 경로는 뺀다** — `/items/:itemId` 는 그대로 열 수 없다. 상세 화면을
 *    재려면 인자로 실제 주소를 넘긴다(`bun run a11y /items/3`).
 * ⚠️ **아직 안 만든 화면도 뺀다** — placeholder 를 재 봐야 언제나 100 이다.
 */
function screenPaths(): string[] {
  // ⚠️ **저장소 뿌리 기준으로 읽는다.** `bun run a11y` 는 뿌리에서 도는데, 사람이
  //    `scripts/a11y` 안에서 직접 돌릴 수도 있다.
  const root = new URL('../../', import.meta.url).pathname
  const screens = readFileSync(`${root}src/domain/screens.ts`, 'utf8')
  const router = readFileSync(`${root}src/app/router.tsx`, 'utf8')
  const built = new Set([...router.matchAll(/^\s*(\w+): lazy/gm)].map((m) => m[1]))

  const out: string[] = []
  for (const m of screens.matchAll(/^ {2}(\w+): \{\s*(?:\n\s*)?path: '([^']+)'/gm)) {
    const [, id, path] = m
    if (built.has(id!) && !path!.includes('/:')) out.push(path!)
  }
  return out
}

const targets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : screenPaths()

/**
 * ⚠️ **크롬 경로를 주지 않는다.** `chrome-launcher` 가 macOS · Linux · Windows 를 스스로
 *    찾고, `CHROME_PATH` 도 **직접 본다**(`chrome-finder.js`). 여기서 맥 경로를 넘기면
 *    **그 탐색을 통째로 가려서**, 크롬이 깔린 윈도에서도 실행이 실패한다 — 감사 로그에
 *    `Chrome · Windows` 가 찍히는 팀이다 (docs/ARCHITECTURE.md §38.2).
 */
const chrome = await chromeLauncher.launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
})
const browser = await puppeteer.connect({
  browserURL: `http://localhost:${chrome.port}`,
  defaultViewport: null,
})

let bad = 0
for (const path of targets) {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((v: string) => localStorage.setItem('riruti_admin_view_v2', v), VIEWER)

  const r = await lighthouse(
    `${BASE}${path}`,
    {
      output: 'json',
      onlyCategories: ['accessibility'],
      logLevel: 'error',
      // 어드민은 데스크톱 도구다. 모바일로 재면 없는 화면 폭의 문제를 만든다.
      screenEmulation: { disabled: true },
      formFactor: 'desktop',
    },
    undefined,
    page,
  )

  const score = Math.round((r!.lhr.categories.accessibility!.score ?? 0) * 100)
  // ⚠️ **점수만 보면 안 된다.** 가중치 0 인 검사는 실패해도 100 이 나온다.
  const failed = Object.values(r!.lhr.audits)
    .filter((a) => a.score !== null && a.score < 1)
    .map((a) => a.id)

  if (score < 100 || failed.length > 0) bad += 1
  console.log(`${String(score).padStart(3)}  ${path}${failed.length ? `   ✗ ${failed.join(', ')}` : ''}`)
  await page.close()
}

await browser.disconnect()
await chrome.kill()

if (bad > 0) {
  console.error(`\n접근성 위반 ${bad}건 — docs/ARCHITECTURE.md §9.4`)
  process.exit(1)
}
console.log(`\n접근성 규약 준수 ✓ (화면 ${targets.length}개 · 점수와 실패 검사 모두)`)
