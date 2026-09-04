/**
 * 문서가 코드와 어긋나는 것을 잡는 **판정**만. 파일을 읽고 시그니처를 모으는 일은
 * `check-docs.ts` 가 한다.
 *
 * **왜 있는가** — 문서가 스스로/코드와 어긋난 게 세 번 반복됐다(§19.4.1 의 「모든 종이
 * 같은 몸」, react-query 기본값, `summarize(all)`). 매번 **한 곳을 고치고 그 짝을 남긴다**는
 * 같은 모양이라, 세 번 되풀이했으면 사람에게 맡길 일이 아니다.
 *
 * ⚠️ **잡지 못하는 것이 있다.** 「모든 종이 같은 몸을 쓴다」 처럼 **데이터를 두고 하는
 *    주장**은 기계가 못 본다 — 그건 리뷰의 몫이다. 여기가 보는 것은 *형식*뿐이다.
 */

/** 어디가 왜 틀렸는가 */
export type DocIssue = { line: number; why: string; code: string }

const lineOf = (md: string, index: number): number => md.slice(0, index).split('\n').length

/**
 * 백틱 안의 **구체적인 파일 경로**.
 *
 * ⚠️ **글롭과 자리표시자는 뺀다** — `src/api/*.ts` · `src/assets/{icons,images}/index.ts` ·
 *    `features/<name>/` 처럼 실재하지 않는 이름이 문서에는 정상적으로 쓰인다.
 *    확장자가 있는 것만 본다(디렉터리는 `src/entities/` 처럼 **아직 없는 것을 가리키는**
 *    경우가 있어 제외).
 */
export function filePathRefs(md: string): { path: string; line: number }[] {
  const out: { path: string; line: number }[] = []
  for (const m of md.matchAll(/`((?:src|scripts|docs)\/[^`\s]+)`/g)) {
    const p = m[1]!
    if (/[*{}<>]/.test(p)) continue
    if (!/\.[a-z]+$/.test(p)) continue
    out.push({ path: p, line: lineOf(md, m.index) })
  }
  return out
}

/** 문서에 실재하는 절 번호 (`## 9.` · `### 19.4.1`) */
export function sectionNumbers(md: string): string[] {
  return [...md.matchAll(/^#{2,4}\s+([0-9]+(?:\.[0-9]+)*)\.?\s/gm)].map((m) => m[1]!)
}

/** `§9.4` 같은 참조가 실재하는 절을 가리키는가 */
export function danglingSections(md: string): DocIssue[] {
  const have = new Set(sectionNumbers(md))
  const seen = new Set<string>()
  const out: DocIssue[] = []
  for (const m of md.matchAll(/§([0-9]+(?:\.[0-9]+)*)/g)) {
    const n = m[1]!
    if (have.has(n) || seen.has(n)) continue
    seen.add(n)
    out.push({ line: lineOf(md, m.index), why: `§${n} 은 없는 절입니다`, code: m[0] })
  }
  return out
}

/**
 * 같은 절 번호가 두 번 나오는가.
 *
 * ⚠️ **제목만 갈아 끼우고 옛 본문을 남기는 실수**가 여기서 드러난다 — 실제로 §21.4 를
 *    새로 쓰면서 옛 본문을 §21.5 뒤에 고아로 남긴 적이 있다.
 */
export function duplicateSections(md: string): DocIssue[] {
  const seen = new Map<string, number>()
  const out: DocIssue[] = []
  for (const m of md.matchAll(/^#{2,4}\s+([0-9]+(?:\.[0-9]+)*)\.?\s.*$/gm)) {
    const n = m[1]!
    const line = lineOf(md, m.index)
    if (seen.has(n))
      out.push({ line, why: `§${n} 이 ${seen.get(n)}행에도 있습니다`, code: m[0]!.trim() })
    else seen.set(n, line)
  }
  return out
}

/**
 * 인자 개수를 센다. **중첩을 존중한다** — `saveItem({ itemId, input })` 은 한 개다.
 *
 * 쉼표로 그냥 자르면 객체·배열·중첩 호출 안의 쉼표까지 세어 **없는 오류를 만든다.**
 */
export function countArgs(inner: string): number {
  const s = inner.trim()
  if (s === '') return 0

  let depth = 0
  let quote: string | null = null
  // 쉼표 뒤에 실제 인자가 왔을 때만 센다. **뒤따르는 쉼표(`f(a,)`)는 인자가 아니다** —
  // 세면 `a,` 를 두 개로 읽는다.
  let count = 1
  let pending = false

  for (let i = 0; i < s.length; i += 1) {
    const c = s[i]!

    if (quote) {
      // ⚠️ **백슬래시 하나만 보면 안 된다.** `"a\\\\"` 는 이스케이프된 백슬래시로 끝나므로
      //    그 뒤의 따옴표는 문자열을 **닫는다.** 앞선 백슬래시가 홀수일 때만 이스케이프다.
      if (c === quote) {
        let back = 0
        while (s[i - 1 - back] === '\\') back += 1
        if (back % 2 === 0) quote = null
      }
      continue
    }

    if (c === '"' || c === "'" || c === '`') quote = c
    else if ('({['.includes(c)) depth += 1
    else if (')}]'.includes(c)) depth -= 1
    else if (c === ',' && depth === 0) {
      pending = true
      continue
    }

    if (pending && !/\s/.test(c)) {
      count += 1
      pending = false
    }
  }
  return count
}

/** 문서에 나오는 호출 예시 하나 */
export type CallExample = { name: string; args: number; line: number; code: string }

/**
 * 백틱 안의 호출 예시.
 *
 * ⚠️ **인자가 없는 것(`date()`)은 뺀다.** 이 문서는 함수를 **이름으로 부를 때** 그 형태를
 *    쓴다("`date()` 가 깨진 게 …"). 호출 예시로 다루면 오탐이 쏟아진다 —
 *    실제로 재봤을 때 어긋남 6건 중 5건이 이것이었다.
 */
export function callExamples(md: string): CallExample[] {
  const out: CallExample[] = []
  for (const m of md.matchAll(/`([A-Za-z_$][\w$]*)\(([^`]*)\)`/g)) {
    const args = countArgs(m[2]!)
    if (args === 0) continue
    out.push({ name: m[1]!, args, line: lineOf(md, m.index), code: m[0]! })
  }
  return out
}

/** 함수 하나가 받는 인자 수의 범위 */
export type Arity = { req: number; max: number }

/**
 * 호출 예시가 실제 시그니처와 맞는가.
 *
 * @param sigs 이름 → 인자 범위. **이름이 겹치는 함수는 빼고** 넘긴다 — 어느 쪽인지
 *   알 수 없는 것을 틀렸다고 말하면 안 된다.
 */
export function badCalls(calls: CallExample[], sigs: Map<string, Arity>): DocIssue[] {
  const out: DocIssue[] = []
  for (const c of calls) {
    const s = sigs.get(c.name)
    if (!s) continue
    if (c.args >= s.req && c.args <= s.max) continue
    const want =
      s.max === Infinity
        ? `${s.req}개 이상`
        : s.req === s.max
          ? `${s.req}개`
          : `${s.req}~${s.max}개`
    out.push({
      line: c.line,
      why: `${c.name} 은 인자 ${want}를 받습니다 (문서는 ${c.args}개)`,
      code: c.code,
    })
  }
  return out
}

/**
 * 펜스 한 줄. **여는 것인지 닫는 것인지는 앞뒤 맥락이 정한다** — 같은 줄이 둘 다 될 수 있다.
 *
 * CommonMark: 최대 3칸 들여쓰기 + 백틱/물결 3개 이상 + 정보 문자열.
 */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/

/**
 * 펜스 뒤가 비었는가.
 *
 * ⚠️ **`trim()` 을 쓰면 안 된다.** 그건 `U+00A0`(줄바꿈 없는 공백)·`U+FEFF` 같은
 *    유니코드 공백까지 지우는데, CommonMark 가 공백으로 보는 것은 **스페이스와 탭뿐**이다.
 *    `U+00A0` 는 **눈에 보이지 않으면서** 정보 문자열이 되므로, 느슨하게 보면
 *    닫히지 않을 펜스를 닫는 것으로 읽어 그 뒤 블록 경계가 통째로 밀린다.
 */
const blank = (s: string): boolean => /^[\t ]*$/.test(s)

/**
 * 언어를 안 적은 여는 코드 펜스.
 *
 * 언어가 없으면 강조가 안 되는 것으로 끝나지 않는다 — **여는 펜스인지 닫는 펜스인지가
 * 눈으로 구분되지 않아**, 하나를 빠뜨리면 그 뒤 문서 절반이 통째로 코드 블록이 된다.
 * 화면에서는 바로 보이지만 diff 에서는 안 보인다.
 *
 * 코드가 아닌 예시(입출력·표)는 `text` 를 쓴다.
 *
 * ⚠️ **펜스 규칙을 대충 보면 검사가 조용히 무의미해진다.** CommonMark 를 따른다.
 *
 * | | |
 * |---|---|
 * | 닫는 펜스 | **같은 문자 · 열 때보다 짧지 않고 · 뒤에 공백만.** 정보 문자열을 못 갖는다 |
 * | 백틱 펜스 | 정보 문자열에 백틱이 올 수 없다 — 인라인 코드와 구분되지 않는다 |
 * | 들여쓰기 | 3칸까지는 펜스다 (4칸부터는 들여쓴 코드 블록) |
 *
 * 이걸 안 지키면 **펜스를 예시로 보여 주는 문서**에서 바로 어긋난다 — ```` 로 연
 * 블록 안의 ``` 을 닫는 것으로 읽어, 그 뒤 블록들의 여닫이가 통째로 뒤집힌다.
 */
export function bareFences(md: string): DocIssue[] {
  const out: DocIssue[] = []
  const lines = md.split('\n')
  let open: { char: string; len: number } | null = null

  for (const [i, line] of lines.entries()) {
    // CRLF 문서에서는 줄 끝에 `\r` 이 남는다. 정보 문자열로 새면 모든 판정이 어긋난다.
    const raw = line.replace(/\r$/, '')
    const m = FENCE.exec(raw)
    if (!m) continue
    const marker = m[1]!
    const char = marker[0]!
    const rest = m[2]!

    if (open) {
      if (char === open.char && marker.length >= open.len && blank(rest)) open = null
      continue
    }
    // 백틱 펜스의 정보 문자열에는 백틱이 올 수 없다.
    if (char === '`' && rest.includes('`')) continue

    open = { char, len: marker.length }
    if (blank(rest)) {
      out.push({
        line: i + 1,
        why: '코드 펜스에 언어를 적으세요 — 코드가 아니면 `text`',
        code: raw,
      })
    }
  }
  return out
}
