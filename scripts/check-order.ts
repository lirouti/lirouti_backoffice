/**
 * 선언 순서를 검사한다. (docs/ARCHITECTURE.md §14)
 *
 *   bun run scripts/check-order.ts
 *
 * **파일 단위** — 내보내는 것이 먼저, 이 파일 전용 하위 컴포넌트가 뒤.
 *
 *   const strip = css({ … })        ← 모듈 상수·순수 헬퍼는 위 (const 는 호이스팅이 안 된다)
 *   export function TabBar() { … }  ← 파일의 주인공
 *   function Row() { … }            ← 전용 하위 컴포넌트는 아래
 *
 * 파일을 여는 이유는 "이게 뭘 내보내는가" 라서, 그게 첫 줄에 있어야 한다. 위에서 아래로
 * 추상 → 구체 로 읽히고, 하위 컴포넌트가 궁금하지 않으면 안 봐도 된다.
 * **함수 선언은 호이스팅되므로** 뒤에 둬도 아무 문제가 없다 — 전방 선언이 필요한 언어가 아니다.
 * 그래서 **컴포넌트는 `function X()` 로만 쓴다** — `const X = () => …` 는 호이스팅이 없어서
 * 이 순서 자체를 쓸 수 없게 만든다. 두 규약은 한 몸이라 같이 검사한다.
 * (콜백·핸들러·한 줄 술어의 화살표 함수는 대상이 아니다. 최상위 **컴포넌트**만 본다.)
 *
 * **컴포넌트 안** — 규약:
 *   1. 훅        라우터 → 스토어 → 서버상태 → 로컬상태(useState) → useRef
 *   2. 파생값    단순 계산 · useMemo
 *   3. 부수효과  useEffect
 *   4. 조기 반환
 *   5. 핸들러
 *   6. return JSX
 *
 * ESLint 에 이걸 잡는 표준 룰이 없어서 직접 만들었다.
 * (`react-hooks/rules-of-hooks` 는 "조기 반환 뒤의 훅"만 잡는다 — 4번 뒤 1번.)
 *
 * 휴리스틱이라 오탐이 나올 수 있다. 정당한 예외가 반복되면 규약을 고칠 것.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'assets' ? [] : walk(p)
    return p.endsWith('.tsx') ? [p] : []
  })
}

/** 컴포넌트 본문의 최상위 선언만 본다 (들여쓰기 2칸). */
const DECL = /^ {2}(const|let)\s/

/**
 * 훅 이름과 `(` 사이에 **타입 인자**가 낄 수 있다 — `useState<'a' | 'b'>('a')`.
 * 이걸 빠뜨리면 제네릭이 붙은 훅이 통째로 "파생값"으로 잡혀서, 바로 뒤의 멀쩡한 훅이
 * 위반으로 신고된다. `=` 를 제외해 화살표 함수(`=>`)까지 삼키지 않게 막는다.
 */
const TYPE_ARGS = String.raw`(<[^;=]*>)?\s*`
const HOOK_CALL = new RegExp(String.raw`\buse[A-Z]\w*\s*` + TYPE_ARGS + String.raw`\(`)
const BARE_HOOK = new RegExp(String.raw`^ {2}use[A-Z]\w*\s*` + TYPE_ARGS + String.raw`\(`)

/**
 * **계산·효과 훅** — 앞서 얻은 값을 재료로 쓰므로 파생값 뒤에 오는 게 정상이다.
 * `useMemo(() => filter(items, q), [items, q])` 에서 `q` 가 파생값이면 순서상 앞설 수 없다.
 * 나머지 훅(= 의존성 획득 훅)만 "파생값보다 먼저"를 지켜야 한다.
 */
const LATE_HOOK = new RegExp(
  String.raw`\b(useMemo|useCallback|useEffect|useLayoutEffect|useImperativeHandle|useDebugValue|useInsertionEffect)\s*` +
    TYPE_ARGS +
    String.raw`\(`,
)
const EFFECT_HOOK = new RegExp(
  String.raw`\b(useEffect|useLayoutEffect|useInsertionEffect)\s*` + TYPE_ARGS + String.raw`\(`,
)
const COMPONENT = /^(export (default )?)?function [A-Z]/
const EARLY_RETURN = /^ {2}if \(/

/** 최상위 컴포넌트 선언. `export default function X` · `export function X` · `function X` */
const TOP_COMPONENT = /^(export\s+default\s+|export\s+)?function\s+([A-Z]\w*)/

type Issue = { file: string; line: number; code: string; why: string }

const issues: Issue[] = []

/**
 * 파일 단위 순서 — 내보내는 컴포넌트보다 앞에 놓인 **비공개 컴포넌트**를 잡는다.
 *
 * 모듈 상수(`const strip = …`)와 소문자 헬퍼(`barColor`)는 대상이 아니다.
 * 그것들은 `const` 라 호이스팅되지 않아 위에 있어야 하고, 컴포넌트도 아니다.
 */
function checkFileOrder(file: string, lines: string[]): void {
  const decls = lines.flatMap((raw, i) => {
    const m = TOP_COMPONENT.exec(raw)
    return m ? [{ line: i + 1, name: m[2]!, exported: Boolean(m[1]), code: raw.trim() }] : []
  })

  const firstExport = decls.find((d) => d.exported)
  if (!firstExport) return // 내보내는 컴포넌트가 없는 파일(router 등)은 규약 대상이 아니다

  for (const d of decls) {
    if (d.line >= firstExport.line) break
    issues.push({
      file: relative(SRC, file),
      line: d.line,
      code: d.code,
      why: `비공개 컴포넌트 ${d.name} 가 export(${firstExport.line}행 ${firstExport.name}) 보다 앞에 있습니다 — 아래로 내리세요 (함수 선언은 호이스팅됩니다)`,
    })
  }
}

/** 최상위 `const PascalCase = …` 선언. 이름이 PascalCase 여야 컴포넌트다. */
const TOP_CONST = /^(export\s+(?:default\s+)?)?const\s+([A-Z][a-z]\w*)\s*(?::|=)/

/**
 * 컴포넌트를 화살표 함수로 선언하지 않았는지 본다.
 *
 * 위 파일 순서 규약(export 먼저, 하위 컴포넌트 나중)이 **함수 선언의 호이스팅**에
 * 기대고 있다. 화살표로 쓰면 호이스팅이 사라져서 순서를 지킬 수 없게 된다.
 *
 * `IMPLEMENTED` 같은 SCREAMING_CASE 상수는 두 번째 글자가 대문자라 걸리지 않고,
 * `const strip = css({…})` 는 소문자라 걸리지 않는다.
 */
function checkComponentStyle(file: string, lines: string[]): void {
  lines.forEach((raw, i) => {
    const m = TOP_CONST.exec(raw)
    if (!m) return

    // 타입 표기(`: React.FC`)를 건너뛰고 초기값이 시작하는 자리를 찾는다.
    const eq = raw.search(/[^=!<>]=[^=>]/)
    if (eq < 0) return
    const init = raw.slice(eq + 2).trimStart()

    // 초기값이 화살표 함수인가 — `(…) =>` 또는 `x =>`. 배열·객체 리터럴은 아니다.
    if (!/^(async\s+)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*(:[^=]+)?=>/.test(init)) return

    issues.push({
      file: relative(SRC, file),
      line: i + 1,
      code: raw.trim(),
      why: `컴포넌트 ${m[2]} 는 화살표가 아니라 \`function ${m[2]}()\` 으로 선언하세요 — 화살표는 호이스팅되지 않아 "export 먼저" 순서를 못 씁니다`,
    })
  })
}

for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  checkFileOrder(file, lines)
  checkComponentStyle(file, lines)

  let inBody = false
  let firstDerived: number | null = null
  let firstEffect: number | null = null
  let firstEarlyReturn: number | null = null

  lines.forEach((raw, i) => {
    if (COMPONENT.test(raw)) {
      inBody = true
      firstDerived = null
      firstEffect = null
      firstEarlyReturn = null
      return
    }
    if (!inBody) return
    // JSX 반환이 시작되면 본문 검사 끝
    if (/^ {2}return \(/.test(raw)) {
      inBody = false
      return
    }

    const isHook = (DECL.test(raw) && HOOK_CALL.test(raw)) || BARE_HOOK.test(raw)

    // 계산 훅은 2번 그룹, 효과 훅은 3번 그룹 — 파생값 뒤에 와도 된다.
    if (isHook && LATE_HOOK.test(raw)) {
      if (EFFECT_HOOK.test(raw)) firstEffect ??= i + 1
      else firstDerived ??= i + 1
      return
    }

    if (isHook) {
      if (firstEarlyReturn != null) {
        issues.push({
          file: relative(SRC, file),
          line: i + 1,
          code: raw.trim(),
          why: `조기 반환(${firstEarlyReturn}행) 뒤에 훅이 있습니다 — 훅을 위로 올리세요`,
        })
      } else if (firstEffect != null) {
        issues.push({
          file: relative(SRC, file),
          line: i + 1,
          code: raw.trim(),
          why: `useEffect(${firstEffect}행) 뒤에 의존성 획득 훅이 있습니다 — 위로 올리세요`,
        })
        firstEffect = null
      } else if (firstDerived != null) {
        issues.push({
          file: relative(SRC, file),
          line: i + 1,
          code: raw.trim(),
          why: `파생값(${firstDerived}행) 뒤에 의존성 획득 훅이 있습니다 — 훅을 먼저 모으세요`,
        })
        firstDerived = null // 같은 컴포넌트에서 중복 보고하지 않는다
      }
      return
    }

    if (DECL.test(raw)) firstDerived ??= i + 1
    if (EARLY_RETURN.test(raw)) firstEarlyReturn ??= i + 1
  })
}

if (issues.length === 0) {
  console.log('선언 순서 규약 준수 ✓')
  process.exit(0)
}

for (const x of issues) {
  console.error(`${x.file}:${x.line}\n  ${x.why}\n  ${x.code}\n`)
}
console.error(`선언 순서 위반 ${issues.length}건 — docs/ARCHITECTURE.md §14`)
process.exit(1)
