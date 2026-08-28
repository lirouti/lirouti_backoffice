/**
 * 주석 규약을 검사한다. (docs/ARCHITECTURE.md §17)
 *
 *   bun run scripts/check-comments.ts
 *
 * **"왜를 쓴다"는 기계가 못 본다.** 자리와 형식만 본다.
 *
 *   ① 파일 앞 30줄에 설명(JSDoc)이 하나는 있는가
 *   ② 최상위 선언·타입 필드 바로 위의 `//` — hover 에 안 뜨므로 JSDoc 이어야 한다
 *   ③ `TODO` 에 조건이 괄호로 붙었는가 — 조건 없는 TODO 는 영원히 남는다
 *   ④ 문서 참조의 첫 번째가 전체 경로인가 — `(§4.4)` 만 있으면 어느 문서인지 모른다
 *
 * ②의 근거: `tsc --declaration` 으로 재보면 `//` 는 `.d.ts` 에서 사라지고
 * `/** ... *\/` 만 남는다. hover(quickinfo)가 읽는 것이 그 경로다.
 *
 * **판정은 `comment-rules.ts` 에 있다.** 여기는 파일을 모아 넘기고 결과를 찍기만 한다 —
 * 판정 쪽은 픽스처로 테스트한다(`comment-rules.test.ts`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkLines } from './comment-rules'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'assets' ? [] : walk(p)
    return /\.tsx?$/.test(p) ? [p] : []
  })
}

const issues = walk(SRC).flatMap((file) => {
  const rel = relative(SRC, file)
  return checkLines(readFileSync(file, 'utf8').split('\n')).map((x) => ({ ...x, file: rel }))
})

if (issues.length === 0) {
  console.log('주석 규약 준수 ✓')
  process.exit(0)
}

for (const x of issues) console.error(`${x.file}:${x.line}\n  ${x.why}\n  ${x.code}\n`)
console.error(`주석 규약 위반 ${issues.length}건 — docs/ARCHITECTURE.md §17`)
process.exit(1)
