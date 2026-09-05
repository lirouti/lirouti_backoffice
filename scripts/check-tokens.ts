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
 * 「없는 토큰 이름」 검사의 대상이 아니라는 뜻이지 **허용한다는 뜻이 아니다** —
 * 색 날값은 아래 `RAW_COLOR` 가 따로 본다.
 */
const isRaw = (v: string): boolean =>
  /^(#|rgb|hsl|oklch|var\(|color-mix\(|calc\(|linear-gradient|radial-gradient|light-dark)/.test(
    v,
  ) || /^-?[\d.]+(px|rem|em|%|vh|vw|ch)?$/.test(v)

/**
 * 색 자리에 박아 넣은 **날색**.
 *
 * ⚠️ **`var(--…)` 는 뺀다** — `token('colors.x')` 헬퍼가 만드는 값이고, 그쪽은 이름을
 *    타입체크한다. 그라디언트는 안쪽에 hex 가 섞여 있어서 문자열 어디든 본다.
 */
const RAW_COLOR = /#[0-9A-Fa-f]{3,8}\b|\b(rgba?|hsla?|oklch)\(/

/**
 * **일부러 토큰을 안 쓰는 자리.** 값 단위로 등록한다 — 파일만 풀어 주면 그 파일의 **다른**
 * 하드코딩까지 조용히 통과한다.
 *
 * ⚠️ **여기에 줄을 더하려면 이유를 함께 적어야 한다.** 그게 이 목록의 요점이다 —
 *    「토큰을 안 쓴다」 는 판단이 리뷰에 걸리게 만드는 것 (docs/ARCHITECTURE.md §62).
 */
const ALLOWED: { file: string; value: string; why: string }[] = [
  {
    file: 'src/features/security/EnrollWizard.tsx',
    value: '#FFFFFF',
    why: 'QR 은 테마를 따르면 안 된다 — 어두운 배경의 검은 모듈은 스캐너가 못 읽는다. 여백까지 흰색이어야 해서 흰 카드를 깔고 그 위에 그린다 (§29.4)',
  },
  {
    file: 'src/features/auth/BrandPanel.tsx',
    value:
      'linear-gradient(160deg,#5FD8EE 0%,#48B6EC 16%,#3B92EC 32%,#3070E2 50%,#2653CA 70%,#1D3C9E 88%,#17318A 100%)',
    why: '브랜드 그라디언트 7색. 다른 데서 한 번도 안 쓰므로 토큰 7개를 만들면 이름만 늘어난다. 로고와 같은 색띠라 테마를 안 따르는 것이 맞다',
  },
  {
    file: 'src/features/auth/BrandPanel.tsx',
    value: '#fff',
    why: '위 그라디언트 **위에** 얹히는 것들이라 테마를 따르면 안 된다 — 흰 글자 둘과 로고 카드. 로고가 이미 파란 그라디언트라 파란 배경에 묻혀서 흰 카드에 올린다 (§8.3)',
  },
  ...['rgba(160,240,255,', 'rgba(56,110,220,', 'rgba(255,255,255,'].map((value) => ({
    file: 'src/features/auth/BrandPanel.tsx',
    value,
    why: '같은 브랜드 배경 위를 떠다니는 `Blob` 의 색. 그라디언트와 한 묶음이라 함께 고정한다 (투명도를 붙여 쓰므로 값이 열려 있다)',
  })),
  {
    file: 'src/features/security/EnrollWizard.tsx',
    value: '#000000',
    why: 'QR 모듈 색. 흰 여백과 짝이라 함께 고정한다 (§29.4)',
  },
  {
    file: 'src/features/ops/EventFormPage.tsx',
    value: '#2F7CEF',
    why: '**운영자가 고르는 이벤트 강조색의 기본값**이다. 토큰이 아니라 서버에 저장되는 값이라, 테마를 따르면 안 되고 따를 수도 없다 (§34.3)',
  },
]

const isAllowed = (file: string, value: string): boolean =>
  ALLOWED.some((a) => a.file === file && a.value === value)

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

/** 색 자리에 박아 넣은 날색 */
const raws: Omit<Issue, 'group'>[] = []

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
          const line = sf.getLineAndCharacterOfPosition(s.getStart(sf)).line + 1

          // ⚠️ **색 자리의 날색은 검사망 밖이었다.** `check-contrast.ts` 는 **토큰만** 보므로
          //    여기 박힌 색은 아무도 재지 않는다 — 실제로 `ProgressBar` 의 주황이 라이트에서
          //    대비 2.03 인 채로 남아 있었다 (§62).
          if (group === 'colors' && RAW_COLOR.test(value) && !isAllowed(file, value)) {
            raws.push({ file, line, prop, value })
          } else if (
            value !== '' &&
            !TOKENS[group]!.has(value) &&
            !KEYWORDS.has(value) &&
            !isRaw(value)
          ) {
            issues.push({ file, line, prop, value, group })
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

  // ⚠️ **데이터 층의 색은 검사하지 않는다.** `mocks/species.ts` 의 종 대표 색,
  //    `mocks/ops.ts` 의 이벤트 강조색은 **운영자가 정해 서버에 저장하는 값**이라
  //    토큰이 될 수 없다 — 테마를 따라서도 안 된다. 화면을 그리는 층만 본다 (§62.3).
  if (!/^src\/(features|shared|layouts|entities|app)\//.test(file)) continue

  /**
   * 스타일 함수 **밖**의 색 리터럴.
   *
   * ⚠️ **이 검사가 없으면 실제로 났던 결함을 못 잡는다.** `ProgressBar` 의 색은
   *    `css()` 가 아니라 **색을 돌려주는 함수**에서 나온다 — 같은 함수의 세 갈래는
   *    `token()` 인데 한 갈래만 리터럴이었고, 라이트에서 대비 2.03 이었다 (§62.1).
   *
   * ⚠️ **색 자리가 아닌 문자열은 뺀다** — `placeholder="#2F7CEF"` 는 운영자에게
   *    보여 주는 **예시 글자**이지 칠하는 색이 아니다. 오탐이 섞이면 사람이 검사를
   *    끄고, 그러면 이 검사는 없느니만 못하다 (§39.2).
   */
  const NOT_A_COLOR = new Set(['placeholder', 'title', 'aria-label', 'alt', 'href'])
  const outside = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const fn = ts.isPropertyAccessExpression(n.expression)
        ? n.expression.name.text
        : ts.isIdentifier(n.expression)
          ? n.expression.text
          : ''
      // 스타일 함수 안은 위에서 이미 봤다 — 두 번 세지 않는다.
      if (STYLE_FNS.has(fn)) return
    }
    if (ts.isJsxAttribute(n) && ts.isIdentifier(n.name) && NOT_A_COLOR.has(n.name.text)) return

    if (ts.isStringLiteral(n) && RAW_COLOR.test(n.text) && !isAllowed(file, n.text)) {
      raws.push({
        file,
        line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
        prop: '(스타일 밖)',
        value: n.text,
      })
    }
    ts.forEachChild(n, outside)
  }
  outside(sf)
}

for (const i of issues) {
  console.error(`${i.file.replace(/^src\//, '')}:${i.line}`)
  console.error(
    `  ${i.prop}: '${i.value}' — ${i.group} 토큰에 없습니다. 잘못된 CSS 가 그대로 나갑니다`,
  )
}

for (const r of raws) {
  console.error(`${r.file.replace(/^src\//, '')}:${r.line}`)
  console.error(`  ${r.prop}: '${r.value.length > 60 ? `${r.value.slice(0, 57)}…` : r.value}'`)
  console.error(
    `  색을 박아 넣으면 **명암비 검사가 못 본다** — 토큰을 쓰거나, 토큰을 안 쓸 이유가 있으면`,
  )
  console.error(`  scripts/check-tokens.ts 의 ALLOWED 에 이유와 함께 등록하세요`)
}

const bad = issues.length + raws.length
if (bad > 0) {
  console.error(`\n토큰 규약 위반 ${bad}건 — docs/ARCHITECTURE.md §39 · §62`)
  process.exit(1)
}

const total = Object.values(TOKENS).reduce((n, s) => n + s.size, 0)
console.log(
  `토큰 규약 준수 ✓ (이름 ${total}개와 대조 · 날색 예외 ${ALLOWED.length}건은 등록됨)`,
)
