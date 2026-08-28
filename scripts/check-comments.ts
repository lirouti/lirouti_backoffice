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
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'assets' ? [] : walk(p)
    return /\.tsx?$/.test(p) ? [p] : []
  })
}

/** 파일 앞부분에서 설명을 찾는 범위. 이보다 아래면 "스크롤 없이 보인다"고 할 수 없다. */
const HEAD_LINES = 30

/** 최상위 선언 — 들여쓰기가 없다. 함수 본문 안의 지역 변수는 대상이 아니다. */
const TOP_DECL = /^(export\s+)?(default\s+)?(async\s+)?(function|const|let|class|type|interface)\s/

/** 타입 리터럴 안의 필드. `type X = {` 블록 안에서만 본다. */
const TYPE_FIELD = /^\s+\w+\??:\s/
const TYPE_OPEN = /^(export\s+)?type\s+\w+.*=\s*\{\s*$/

/**
 * 문서가 아니라 도구에 주는 지시다. JSDoc 으로 바꾸면 동작하지 않는다.
 * `TODO` 는 ③이 따로 보므로 여기서 제외한다.
 */
const PRAGMA = /^\/\/\s*(eslint-|@ts-|prettier-|biome-|TODO|FIXME)/

/** `docs/ARCHITECTURE.md §4.4` 또는 `§4.4`. 앞의 것이 파일 안에서 먼저 와야 한다. */
const DOC_REF = /(docs\/ARCHITECTURE\.md )?§[\d.]+/

type Issue = { file: string; line: number; code: string; why: string }
const issues: Issue[] = []

for (const file of walk(SRC)) {
  const rel = relative(SRC, file)
  const lines = readFileSync(file, 'utf8').split('\n')

  // ① 앞부분 설명
  if (!lines.slice(0, HEAD_LINES).some((l) => l.trim().startsWith('/**'))) {
    issues.push({
      file: rel,
      line: 1,
      code: lines.find((l) => l.trim()) ?? '',
      why: `앞 ${HEAD_LINES}줄 안에 설명이 없습니다 — 파일 머리말이나 주 선언의 JSDoc 을 다세요 (§17.3)`,
    })
  }

  // ④ 문서 참조 — 파일 안에서 처음 한 번은 전체 경로여야 한다 (§17.3)
  const firstRef = lines.flatMap((l, i) => {
    const m = DOC_REF.exec(l)
    return m ? [{ line: i + 1, full: Boolean(m[1]), code: l.trim() }] : []
  })[0]
  if (firstRef && !firstRef.full) {
    issues.push({
      file: rel,
      line: firstRef.line,
      code: firstRef.code.slice(0, 90),
      why: '이 파일의 첫 문서 참조는 전체 경로로 쓰세요 — `docs/ARCHITECTURE.md §4.4` (§17.3)',
    })
  }

  let inTypeBlock = false
  lines.forEach((raw, i) => {
    const t = raw.trim()

    if (TYPE_OPEN.test(raw)) inTypeBlock = true
    else if (inTypeBlock && /^\}/.test(raw)) inTypeBlock = false

    // ③ TODO 형식
    if (t.includes('TODO') && !/TODO\([^)]+\):/.test(t)) {
      issues.push({
        file: rel,
        line: i + 1,
        code: t.slice(0, 90),
        why: 'TODO 에 조건을 괄호로 적으세요 — `TODO(백엔드 스펙 확정 후):` (§17.4)',
      })
    }

    // ② 선언 위의 `//`
    if (!t.startsWith('//') || PRAGMA.test(t)) return
    // 주석이 이어지면 블록의 마지막 줄만 본다
    const next = lines.slice(i + 1).find((l) => l.trim())
    if (!next || next.trim().startsWith('//')) return
    if (TOP_DECL.test(next) || (inTypeBlock && TYPE_FIELD.test(next))) {
      issues.push({
        file: rel,
        line: i + 1,
        code: t.slice(0, 90),
        why: '선언 위 주석은 `/** */` 로 쓰세요 — `//` 는 hover 에 뜨지 않습니다 (§17.2)',
      })
    }
  })
}

if (issues.length === 0) {
  console.log('주석 규약 준수 ✓')
  process.exit(0)
}

for (const x of issues) console.error(`${x.file}:${x.line}\n  ${x.why}\n  ${x.code}\n`)
console.error(`주석 규약 위반 ${issues.length}건 — docs/ARCHITECTURE.md §17`)
process.exit(1)
