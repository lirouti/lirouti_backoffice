import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
/**
 * 첫 로드 번들 예산을 검사한다. (docs/ARCHITECTURE.md §9.4)
 *
 *   bun run scripts/check-bundle.ts
 *
 * `bun run build` 끝에 붙어 있다. **lint 에 넣지 않은 이유는 `dist/` 가 있어야** 하기
 * 때문이다 — lint 는 빌드를 하지 않는다.
 *
 * ⚠️ **이 예산은 성능 목표가 아니라 누수 탐지기다.** 로그인 뒤 어드민이라 첫 로드
 *    몇십 KB 는 체감되지 않는다. 잡으려는 것은 **무거운 라이브러리가 엔트리로 새는 것**이다
 *    — recharts 를 `manualChunks` 로 잘못 갈랐을 때 실제로 239KB 가 됐다(§9.3).
 */
import { gzipSync } from 'node:zlib'

import { entryAssets, KB, kb, lines, report, type Asset } from './bundle-rules'

/** §9.4 에 근거가 있다. 바꾸려면 거기부터 고칠 것 */
const BUDGET_BYTES = 200 * KB

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')

const html = (() => {
  try {
    return readFileSync(join(DIST, 'index.html'), 'utf8')
  } catch {
    console.error('dist/index.html 이 없습니다 — `bun run build` 를 먼저 실행하세요.')
    process.exit(1)
  }
})()

const assets: Asset[] = entryAssets(html).map((name) => ({
  name,
  // `readFileSync` 는 `Buffer` 를 주는데 bun 의 타입에서는 `gzipSync` 가 안 받는다.
  // `Buffer` 는 `Uint8Array` 의 하위 타입이라 그대로 감싸면 복사 한 번으로 끝난다.
  gzipBytes: gzipSync(new Uint8Array(readFileSync(join(DIST, 'assets', name)))).length,
}))

const r = report(assets, BUDGET_BYTES)
for (const line of lines(r)) console.log(line)

// index.html 자체도 받지만 예산에는 안 넣는다 — 이 숫자의 이력과 견줄 수 있어야 해서다.
// 대신 숨기지 않는다.
console.log(`  (index.html ${kb(gzipSync(html).length)} 는 위 합계에 포함하지 않음)`)

if (r.over) {
  console.error('\n무엇이 엔트리로 새었는지 먼저 보세요 — docs/ARCHITECTURE.md §9.4')
  process.exit(1)
}
