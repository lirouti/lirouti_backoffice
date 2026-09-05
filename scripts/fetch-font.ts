/**
 * Pretendard 를 내려받아 `public/fonts/` 에 놓는다. **`bun run font` 로 돈다.**
 *
 * 산출물(woff2 92개 + `pretendard.css`)은 **커밋한다** — `src/assets` 와 같은 판단이다
 * (docs/ARCHITECTURE.md §11 결정 내역 2번): 저장소가 스스로 빌드되는 것이 우선이고, 폰트가 없으면
 * 화면이 다른 글꼴로 뜬다. 이 스크립트는 **판을 올릴 때만** 돌린다.
 *
 * ⚠️ **npm 의 `pretendard` 패키지를 의존성으로 넣지 않는다.** 압축 해제 크기가 97MB 라
 *    (모든 웨이트 × otf/woff/woff2 × 서브셋 조합) 우리가 쓰는 variable 하나를 위해
 *    모든 개발자가 그걸 받게 된다.
 */
import { mkdir, writeFile } from 'node:fs/promises'

/** 올릴 때 여기만 고친다. 원본 태그 그대로 */
const VERSION = 'v1.3.9'

const BASE = `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@${VERSION}`
const CSS_URL = `${BASE}/dist/web/variable/pretendardvariable-dynamic-subset.css`
const WOFF2 = (n: number) =>
  `${BASE}/packages/pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.${n}.woff2`

const OUT_DIR = 'public/fonts'
const FONT_DIR = `${OUT_DIR}/pretendard`

/** woff2 파일의 첫 4바이트. 받은 것이 진짜 폰트인지 여기서 가른다 */
const WOFF2_MAGIC = 'wOF2'

const HEAD = `/*
 * Pretendard Variable — **self-host**. 원본 ${VERSION} 의 dynamic subset 을 그대로 옮겼다.
 *
 * ⚠️ **이 파일은 손으로 고치지 말 것.** \`scripts/fetch-font.ts\` 가 만든다
 *    (docs/ARCHITECTURE.md §61).
 *
 * ⚠️ **패밀리 이름을 \`Pretendard\` 로 선언한다**(따옴표 없이 — 공백이 없어 필요가 없다).
 *    원본 CDN 은 \`Pretendard Variable\` 로
 *    선언하는데 우리 토큰(\`panda.config.ts\` 의 \`sans\`)은 \`Pretendard\` 를 요구해서,
 *    **첫 커밋 이후 줄곧 이 폰트가 한 글자도 안 쓰이고 있었다** (§61.1). self-host 는
 *    우리가 \`@font-face\` 를 쓰므로 이름을 맞출 수 있다.
 *
 * ⚠️ **\`font-display: swap\`.** 폰트를 기다리며 글자를 숨기지 않는다 — 어드민은 읽는 것이
 *    먼저다. 대신 늦게 도착한 조각이 글자를 다시 그린다(FOUT).
 */
`

/**
 * 원본 CSS 에서 **조각 번호와 `unicode-range` 만** 가져온다.
 *
 * ⚠️ **원본 CSS 를 그대로 쓰지 않는 이유가 둘이다** — ① 패밀리 이름을 바꿔야 하고,
 *    ② 원본의 `src` 는 `../../../packages/…` 로 저장소 구조를 가리켜 우리 배치와 다르다.
 *    `unicode-range` 는 **어느 글자가 어느 조각에 있는지**라 원본에서 와야 한다.
 */
function parseFaces(css: string): { n: number; range: string }[] {
  const faces: { n: number; range: string }[] = []
  for (const block of css.split('@font-face').slice(1)) {
    const n = /subset\.(\d+)\.woff2/.exec(block)
    const range = /unicode-range:\s*([^;}]+)/.exec(block)
    if (n && range) faces.push({ n: Number(n[1]), range: range[1]!.trim() })
  }
  return faces.sort((a, b) => a.n - b.n)
}

async function main(): Promise<void> {
  const cssRes = await fetch(CSS_URL)
  if (!cssRes.ok) throw new Error(`CSS 를 받지 못했습니다: ${cssRes.status} ${CSS_URL}`)
  const faces = parseFaces(await cssRes.text())
  if (faces.length === 0) throw new Error('원본 CSS 에서 @font-face 를 하나도 읽지 못했습니다.')

  await mkdir(FONT_DIR, { recursive: true })

  let bytes = 0
  await Promise.all(
    faces.map(async ({ n }) => {
      const res = await fetch(WOFF2(n))
      if (!res.ok) throw new Error(`조각 ${n} 을 받지 못했습니다: ${res.status}`)
      const buf = new Uint8Array(await res.arrayBuffer())

      // ⚠️ **받은 것이 폰트인지 확인한다.** CDN 이 404 를 HTML 로 주면 그대로 저장돼
      //    브라우저에서만 조용히 깨진다 — 그때는 원인을 찾기 어렵다.
      const magic = new TextDecoder().decode(buf.subarray(0, 4))
      if (magic !== WOFF2_MAGIC) throw new Error(`조각 ${n} 이 woff2 가 아닙니다: ${magic}`)

      bytes += buf.byteLength
      await writeFile(`${FONT_DIR}/PretendardVariable.subset.${n}.woff2`, buf)
    }),
  )

  // ⚠️ **이름에 따옴표를 두르지 않는다.** `Pretendard` 는 공백이 없어 필요가 없고,
  //    토큰(`panda.config.ts` 의 `sans`)이 **필요할 때만** 감싸는 것과 표기를 맞춘다
  //    (거기서도 `Pretendard` 는 맨몸, `'Apple SD Gothic Neo'` 만 감싼다).
  const css = faces.map(
    ({ n, range }) => `@font-face {
  font-family: Pretendard;
  font-style: normal;
  font-weight: 45 920;
  font-display: swap;
  src: url('./pretendard/PretendardVariable.subset.${n}.woff2') format('woff2');
  unicode-range: ${range};
}
`,
  )
  await writeFile(`${OUT_DIR}/pretendard.css`, [HEAD, ...css].join('\n'))

  const mb = (bytes / 1024 / 1024).toFixed(1)
  console.log(`Pretendard ${VERSION} · 조각 ${faces.length}개 · ${mb} MB`)
}

await main()
