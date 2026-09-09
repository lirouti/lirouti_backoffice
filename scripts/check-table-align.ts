/**
 * 표의 **배지 열과 동작 열이 정렬을 선언했는지** 검사한다. (docs/ARCHITECTURE.md §35.2)
 *
 *   bun run scripts/check-table-align.ts
 *
 * **왜 필요한가** — §35.2 는 「배지 · 상태 · 동작 열은 중앙」 이라고 적혀 있는데, 그 규칙이
 * 문서에만 있었다. `align` 을 빼먹으면 **타입도 통과하고 화면도 안 깨진다** — 배지만
 * 열 왼쪽에 치우쳐 설 뿐이다. 그래서 회원 목록 두 열만 고쳐진 채로 **나머지 서른 곳 가까이가
 * 몇 달 동안 어긋나 있었다.** 눈으로 찾을 수 있는 종류가 아니다.
 *
 * ⚠️ **배지가 섞여 든 열은 대상이 아니다.** 썸네일 + 이름 + 배지처럼 여러 조각을 그리는
 *    열은 이름이 기준이라 좌측이 맞다. 그래서 `render` 가 **배지 하나만** 돌려주는
 *    열로 한정한다 — 검사가 멀쩡한 열을 잡기 시작하면 사람이 검사를 끈다 (§39.2).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

/** 중앙이어야 하는 열의 종류 */
type Kind = '배지' | '동작'

type Issue = { file: string; line: number; label: string; kind: Kind; got: string }

const ROOT = fileURLToPath(new URL('../', import.meta.url))

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      return name === 'assets' || name === 'node_modules' ? [] : sources(p)
    }
    return /\.tsx$/.test(p) && !/\.test\./.test(p) ? [p] : []
  })
}

/** 괄호·프래그먼트를 벗겨 낸 JSX 하나. 여러 개면 `null` */
function soleJsx(n: ts.Node): ts.JsxOpeningLikeElement | null {
  if (ts.isParenthesizedExpression(n)) return soleJsx(n.expression)
  if (ts.isJsxElement(n)) return n.openingElement
  if (ts.isJsxSelfClosingElement(n)) return n
  return null
}

/** `render` 가 배지 **하나만** 그리는가 */
function rendersOnlyBadge(v: ts.Expression): boolean {
  if (!ts.isArrowFunction(v)) return false
  if (ts.isBlock(v.body)) return false // 여러 줄이면 판단하지 않는다
  return soleJsx(v.body)?.tagName.getText() === 'Badge'
}

const issues: Issue[] = []

for (const file of sources(join(ROOT, 'src'))) {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)

  const visit = (n: ts.Node) => {
    if (ts.isObjectLiteralExpression(n)) {
      const props = new Map<string, ts.Expression>()
      for (const p of n.properties) {
        if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name))
          props.set(p.name.text, p.initializer)
        // `labelHidden` 처럼 축약형(`{ labelHidden }`)으로 쓰지 않는 저장소지만, 있으면 참으로 본다
        else if (ts.isShorthandPropertyAssignment(p)) props.set(p.name.text, p.name)
      }

      // 열 하나인가 — `key` 와 `label` 을 함께 가진 객체만 본다.
      // `Switch` 의 `labelHidden` 처럼 이름이 겹치는 자리를 걸러 내는 것이 이 조건이다.
      const label = props.get('label')
      if (label && props.has('key')) {
        const render = props.get('render')
        const hidden = props.get('labelHidden')
        const kind: Kind | null =
          render && rendersOnlyBadge(render)
            ? '배지'
            : hidden && hidden.kind !== ts.SyntaxKind.FalseKeyword
              ? '동작'
              : null

        if (kind) {
          const align = props.get('align')
          const got = align && ts.isStringLiteral(align) ? align.text : '없음'
          if (got !== 'center') {
            issues.push({
              file: file.replace(ROOT, ''),
              line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
              label: ts.isStringLiteral(label) ? label.text : '?',
              kind,
              got,
            })
          }
        }
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
}

for (const i of issues) {
  console.error(`${i.file}:${i.line}`)
  console.error(
    `  「${i.label}」 은 ${i.kind} 열입니다 — align: 'center' 여야 하는데 ${i.got === '없음' ? '선언이 없습니다' : `'${i.got}' 입니다`}`,
  )
}

if (issues.length > 0) {
  console.error(`\n표 정렬 규약 위반 ${issues.length}건 — docs/ARCHITECTURE.md §35.2`)
  process.exit(1)
}

console.log('표 정렬 규약 준수 ✓ (배지·동작 열은 중앙)')
