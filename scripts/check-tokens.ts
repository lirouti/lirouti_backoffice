/**
 * 스타일 prop 에 **없는 토큰 이름**을 쓴 곳을 찾는다. (docs/ARCHITECTURE.md §39)
 *
 *   bun run scripts/check-tokens.ts
 *
 * **왜 필요한가** — Panda 의 스타일 prop 은 **토큰 이름을 타입체크하지 않는다.**
 * `css({ bg: 'warnBg' })` 에서 `warnBg` 가 없어도 오류 없이 통과하고,
 * `.bg_warnBg{background:warnBg}` 라는 **잘못된 CSS** 가 나간다. 브라우저는 그 줄을
 * 조용히 버려서 **배경이 아예 안 칠해진다** — 화면은 멀쩡해 보이고 아무도 모른다.
 * 실제로 초안 알림 배너가 몇 달 동안 그랬다.
 *
 * `token('colors.x')` 헬퍼만 엄격하다. 그쪽은 이 검사가 필요 없다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

import config from '../panda.config'

/** 스타일 객체를 인자로 받는 함수들. 여기 밖의 `bg:` 는 스타일이 아니다 */
const STYLE_FNS = new Set(['css', 'cva', 'sva', 'styled'])

/**
 * prop 이름 → 어느 토큰 무리를 쓰는가.
 *
 * ⚠️ **`border`·`boxShadow` 같은 축약형은 안 본다.** 거기는 `1px solid token(colors.bd)`
 *    처럼 여러 값이 섞여 들어와, 이름만으로 토큰인지 가릴 수 없다.
 */
const GROUP_OF: Record<string, 'colors' | 'radii' | 'fonts'> = {}
for (const p of [
  'color',
  'bg',
  'background',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderBlockColor',
  'borderInlineColor',
  'fill',
  'stroke',
  'accentColor',
  'outlineColor',
  'caretColor',
  'textDecorationColor',
  'columnRuleColor',
])
  GROUP_OF[p] = 'colors'
for (const p of [
  'borderRadius',
  'rounded',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
])
  GROUP_OF[p] = 'radii'
for (const p of ['fontFamily']) GROUP_OF[p] = 'fonts'

const theme = config.theme?.extend
const TOKENS: Record<string, Set<string>> = {
  colors: new Set(Object.keys(theme?.semanticTokens?.colors ?? {})),
  radii: new Set(Object.keys(theme?.tokens?.radii ?? {})),
  fonts: new Set(Object.keys(theme?.tokens?.fonts ?? {})),
}

/** 토큰이 아니어도 CSS 가 아는 말들 */
const KEYWORDS = new Set([
  'transparent',
  'currentColor',
  'inherit',
  'initial',
  'unset',
  'revert',
  'none',
  'auto',
  'full',
])

/**
 * 토큰 이름이 아니라 **날값**인가.
 *
 * `#fff` · `rgba(…)` · `var(--x)` · `12px` · `50%` 처럼 CSS 가 그대로 읽는 것들이다.
 * QR 의 `#FFFFFF` 처럼 **일부러 토큰을 안 쓰는 자리**가 있어서 막지 않는다 (§39.1).
 */
const isRaw = (v: string): boolean =>
  /^(#|rgb|hsl|oklch|var\(|color-mix\(|calc\(|linear-gradient|radial-gradient|light-dark)/.test(
    v,
  ) || /^-?[\d.]+(px|rem|em|%|vh|vw|ch)?$/.test(v)

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      return name === 'assets' || name === 'node_modules' ? [] : sources(p)
    }
    return /\.tsx?$/.test(p) && !/\.test\./.test(p) ? [p] : []
  })
}

/**
 * 스타일 prop 의 **값 안에 있는 문자열 전부.**
 *
 * 조건식(`checked ? 'pri' : 'faint2'`)뿐 아니라 **반응형 문법**도 값이다 —
 * `bg: { base: 'pri', md: 'priD' }` 와 `bg: ['pri', 'priD']`. 여기까지 안 보면
 * **반응형으로 쓴 오타가 통째로 새어 나간다** (docs/ARCHITECTURE.md §39.2).
 */
function values(n: ts.Node): ts.StringLiteral[] {
  if (ts.isStringLiteral(n)) return [n]
  if (ts.isConditionalExpression(n)) return [...values(n.whenTrue), ...values(n.whenFalse)]
  if (ts.isBinaryExpression(n)) return [...values(n.left), ...values(n.right)]
  if (ts.isParenthesizedExpression(n)) return values(n.expression)
  if (ts.isObjectLiteralExpression(n)) {
    return n.properties.flatMap((p) =>
      ts.isPropertyAssignment(p) ? values(p.initializer) : [],
    )
  }
  if (ts.isArrayLiteralExpression(n)) return n.elements.flatMap((e) => values(e))
  return []
}

type Issue = { file: string; line: number; prop: string; value: string; group: string }

const issues: Issue[] = []

for (const file of sources('src')) {
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)

  /** 스타일 객체 안의 모든 prop 을 본다 — `_hover: { bg: … }` 처럼 중첩된 것도 */
  const inStyle = (n: ts.Node) => {
    if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name))) {
      const prop = n.name.text

      // ⚠️ **recipe 의 variant 고르는 자리는 스타일이 아니다.** `defaultVariants: { color: 'solid' }`
      //    의 `'solid'` 는 **variant 이름**이지 색이 아닌데, 그냥 두면 멀쩡한 recipe 를
      //    막는다 — 검사가 거짓말하면 사람이 검사를 끈다 (§39.2).
      if (prop === 'defaultVariants') return
      if (prop === 'compoundVariants') {
        // 여기서 스타일인 것은 `css` 뿐이고 나머지 키는 전부 고르는 조건이다
        for (const el of ts.isArrayLiteralExpression(n.initializer)
          ? n.initializer.elements
          : []) {
          if (!ts.isObjectLiteralExpression(el)) continue
          for (const p of el.properties) {
            if (
              ts.isPropertyAssignment(p) &&
              ts.isIdentifier(p.name) &&
              p.name.text === 'css'
            ) {
              inStyle(p.initializer)
            }
          }
        }
        return
      }

      const group = GROUP_OF[prop]
      if (group) {
        for (const s of values(n.initializer)) {
          // Panda 의 `!` 는 `!important` 다 — 값의 일부가 아니다
          const value = s.text.replace(/\s*!$/, '')
          if (
            value !== '' &&
            !TOKENS[group]!.has(value) &&
            !KEYWORDS.has(value) &&
            !isRaw(value)
          ) {
            issues.push({
              file,
              line: sf.getLineAndCharacterOfPosition(s.getStart(sf)).line + 1,
              prop,
              value,
              group,
            })
          }
        }
        // 값은 다 봤다. 더 내려가면 같은 문자열을 두 번 센다.
        return
      }
    }
    ts.forEachChild(n, inStyle)
  }

  const visit = (n: ts.Node) => {
    // ⚠️ **스타일 함수 안에서만 본다.** 밖에서는 `bg` 가 스코프 id 이기도 하다
    //    (`domain/admin/labels.ts` 의 `bg: '배경 · 둥지'`).
    if (ts.isCallExpression(n)) {
      const fn = ts.isPropertyAccessExpression(n.expression)
        ? n.expression.name.text
        : ts.isIdentifier(n.expression)
          ? n.expression.text
          : ''
      if (STYLE_FNS.has(fn)) {
        for (const arg of n.arguments) inStyle(arg)
        return
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
}

if (issues.length > 0) {
  for (const i of issues) {
    console.error(`${i.file.replace(/^src\//, '')}:${i.line}`)
    console.error(
      `  ${i.prop}: '${i.value}' — ${i.group} 토큰에 없습니다. 잘못된 CSS 가 그대로 나갑니다`,
    )
  }
  console.error(`\n토큰 규약 위반 ${issues.length}건 — docs/ARCHITECTURE.md §39`)
  process.exit(1)
}

const total = Object.values(TOKENS).reduce((n, s) => n + s.size, 0)
console.log(`토큰 규약 준수 ✓ (스타일 prop 이 쓰는 이름 ${total}개와 대조)`)
