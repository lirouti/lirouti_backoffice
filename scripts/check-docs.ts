/**
 * 문서가 코드와 어긋나는지 검사한다. (docs/ARCHITECTURE.md §17.10)
 *
 *   bun run scripts/check-docs.ts
 *
 * `bun run lint` 에 붙어 있다. 보는 것은 넷이다.
 *
 *   ① 백틱 안의 파일 경로가 실재하는가
 *   ② `§9.4` 참조가 실재하는 절인가
 *   ③ 같은 절 번호가 두 번 나오지 않는가
 *   ④ 호출 예시의 인자 수가 실제 시그니처와 맞는가
 *
 * ⚠️ **주장은 못 본다.** 「모든 종이 같은 몸을 쓴다」 가 데이터와 어긋나는 것은 기계가
 *    잡을 수 없다 — 그건 리뷰의 몫이다. 여기가 보는 것은 *형식*뿐이다.
 *
 * **판정은 `doc-rules.ts` 에 있다.** 여기는 파일을 모아 넘기고 결과를 찍기만 한다 —
 * 코드를 읽는 코드는 눈으로 맞는지 확인할 수 없어 판정 쪽을 픽스처로 테스트한다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

import {
  badCalls,
  bareFences,
  callExamples,
  danglingSections,
  duplicateSections,
  filePathRefs,
  type Arity,
  type DocIssue,
} from './doc-rules'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = ['docs/ARCHITECTURE.md']

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    // ⚠️ **`node_modules` 를 건너뛴다.** 안 그러면 남의 코드에서 이름을 주워 와
    //    **우리 문서를 남의 시그니처로 판정한다** — 실제로 `reset` 이 그렇게 잡혔다
    //    (docs/ARCHITECTURE.md §38.3). `assets` 는 생성물이라 뺀다.
    if (statSync(p).isDirectory()) {
      return name === 'assets' || name === 'node_modules' ? [] : sources(p)
    }
    // 테스트 파일은 뺀다 — 거기 헬퍼가 프로덕션 이름을 가릴 수 있다.
    return /\.tsx?$/.test(p) && !/\.test\./.test(p) ? [p] : []
  })
}

/**
 * `export` 된 함수의 인자 범위를 모은다. **구문만 본다** — 타입 해석이 필요 없어
 * `createSourceFile` 하나로 끝난다.
 *
 * ⚠️ **이름이 겹치면 뺀다.** 어느 쪽을 가리키는지 알 수 없는 것을 틀렸다고 말하면
 *    없는 오류가 생긴다.
 */
function collectArities(): Map<string, Arity> {
  const found = new Map<string, Arity | null>()

  const add = (name: string, params: readonly ts.ParameterDeclaration[]) => {
    const req = params.filter(
      (p) => !p.questionToken && !p.initializer && !p.dotDotDotToken,
    ).length
    const max = params.some((p) => p.dotDotDotToken) ? Infinity : params.length
    const prev = found.get(name)
    if (prev === undefined) found.set(name, { req, max })
    else if (prev && (prev.req !== req || prev.max !== max)) found.set(name, null)
  }

  const exported = (n: ts.Node): boolean =>
    ts.canHaveModifiers(n) &&
    !!ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)

  for (const file of [...sources(join(ROOT, 'src')), ...sources(join(ROOT, 'scripts'))]) {
    const sf = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    )
    const visit = (n: ts.Node) => {
      if (ts.isFunctionDeclaration(n) && n.name && exported(n)) add(n.name.text, n.parameters)
      if (ts.isVariableStatement(n) && exported(n)) {
        for (const d of n.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.initializer && ts.isArrowFunction(d.initializer)) {
            add(d.name.text, d.initializer.parameters)
          }
        }
      }
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }

  return new Map([...found].filter((e): e is [string, Arity] => e[1] !== null))
}

const arities = collectArities()
const issues: (DocIssue & { doc: string })[] = []

for (const doc of DOCS) {
  const md = readFileSync(join(ROOT, doc), 'utf8')
  const found: DocIssue[] = [
    ...filePathRefs(md)
      .filter((r) => !existsSync(join(ROOT, r.path)))
      .map((r) => ({ line: r.line, why: `없는 파일을 가리킵니다`, code: r.path })),
    ...danglingSections(md),
    ...duplicateSections(md),
    ...bareFences(md),
    ...badCalls(callExamples(md), arities),
  ]
  issues.push(...found.map((i) => ({ ...i, doc })))
}

if (issues.length === 0) {
  console.log(`문서 규약 준수 ✓ (함수 ${arities.size}개와 대조)`)
  process.exit(0)
}

for (const i of issues.sort((a, b) => a.line - b.line)) {
  console.error(`${i.doc}:${i.line}\n  ${i.why}\n  ${i.code}\n`)
}
console.error(`문서 규약 위반 ${issues.length}건 — docs/ARCHITECTURE.md §17.10`)
process.exit(1)
