/**
 * 주석 규약(docs/ARCHITECTURE.md §17)의 **판정 부분만** 모은 순수 함수들.
 *
 * 파일 입출력은 `check-comments.ts` 가 하고 여기는 줄 배열만 받는다.
 * 갈라 둔 이유는 **테스트** 다 — 이 검사기는 오탐을 세 번 냈고
 * (`'TODO: …'` 문자열, 템플릿 리터럴 안, 한 주석의 두 번째 TODO)
 * 셋 다 픽스처 한 줄이면 잡혔을 것들이었다.
 */

/** 파일 앞부분에서 설명을 찾는 범위. 이보다 아래면 "스크롤 없이 보인다"고 할 수 없다. */
export const HEAD_LINES = 30

/** 최상위 선언 — 들여쓰기가 없다. 함수 본문 안의 지역 변수는 대상이 아니다. */
const TOP_DECL = /^(export\s+)?(default\s+)?(async\s+)?(function|const|let|class|type|interface)\s/

/**
 * 타입 리터럴 안의 필드. `type X = {` 와 `interface X {` 블록 안에서만 본다.
 *
 * `interface` 는 `.d.ts` 의 선언 병합에서만 쓰지만(§13), 그 파일도 검사 대상이라
 * 함께 추적한다.
 */
const TYPE_FIELD = /^\s+\w+\??:\s/
const TYPE_OPEN = /^(export\s+)?(type\s+\w+.*=\s*\{|interface\s+\w+.*\{)\s*$/

/**
 * 문서가 아니라 도구에 주는 지시다. JSDoc 으로 바꾸면 동작하지 않는다.
 * `TODO` 는 ③이 따로 보므로 여기서 제외한다.
 */
const PRAGMA = /^\/\/\s*(eslint-|@ts-|prettier-|biome-|TODO|FIXME)/

/** `docs/ARCHITECTURE.md §4.4` 또는 `§4.4`. 앞의 것이 파일 안에서 먼저 와야 한다. */
const DOC_REF = /(docs\/ARCHITECTURE\.md )?§[\d.]+/

/** 한 줄을 읽고 나서 다음 줄로 넘어가는 상태. 둘 다 여러 줄에 걸친다. */
export type ScanState = {
  /** 템플릿 리터럴(`` ` ``) 안 — 여기의 `//` 는 주석이 아니라 문자열이다 */
  tpl: boolean
  /** 블록 주석(`/*`) 안 — 여기는 `*` 로 시작하지 않아도 전부 주석이다 */
  blk: boolean
}

export const START: ScanState = { tpl: false, blk: false }

/**
 * 한 줄에서 **주석에 해당하는 부분만** 떼어내고, 다음 줄에 넘길 상태를 함께 돌려준다.
 *
 * 줄 전체를 보면 `const LABEL = 'TODO: …'` 나 템플릿 리터럴 안의 `// …` 가
 * 주석으로 잡힌다. 그래서 문자열·템플릿·블록주석을 문자 단위로 지나며 센다.
 *
 * ⚠️ 정규식 리터럴(`/\/\//`)과 중첩 템플릿은 구분하지 않는다. 완전한 토크나이저를
 *    쓰자는 뜻이 되고, 이 검사가 보는 것(TODO 형식·선언 위 `//`)에는 영향이 없다.
 */
export function scanLine(raw: string, st: ScanState): { comment: string | null; next: ScanState } {
  let { tpl, blk } = st
  let comment = ''
  let i = 0

  while (i < raw.length) {
    const c = raw[i]
    const d = raw[i + 1]

    if (blk) {
      if (c === '*' && d === '/') {
        blk = false
        i += 2
        continue
      }
      comment += c
      i += 1
      continue
    }

    if (tpl) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '`') tpl = false
      i += 1
      continue
    }

    if (c === '/' && d === '/') {
      comment += raw.slice(i)
      break
    }
    if (c === '/' && d === '*') {
      blk = true
      i += 2
      continue
    }
    if (c === '`') {
      tpl = true
      i += 1
      continue
    }
    if (c === "'" || c === '"') {
      i += 1
      while (i < raw.length && raw[i] !== c) i += raw[i] === '\\' ? 2 : 1
      i += 1
      continue
    }
    i += 1
  }

  return { comment: comment === '' ? null : comment, next: { tpl, blk } }
}

/**
 * 조건 없는 `TODO` 가 하나라도 있는가. (§17.5)
 *
 * **토큰마다** 본다 — 주석 하나에 여러 개가 있으면 뒤의 것이 올바르다고 해서
 * 앞의 것이 넘어가면 안 된다 (`// TODO: 급함; TODO(스펙 확정 후): 나중`).
 */
export function hasBareTodo(comment: string): boolean {
  for (const m of comment.matchAll(/TODO/g)) {
    if (!/^TODO\([^)]+\):/.test(comment.slice(m.index))) return true
  }
  return false
}

/** 어느 줄이 왜 걸렸는지. 파일 이름은 부르는 쪽이 붙인다. */
export type Issue = { line: number; code: string; why: string }

/** 한 파일의 줄 배열을 규약에 걸어 본다. 위반이 없으면 빈 배열. */
export function checkLines(lines: string[]): Issue[] {
  const issues: Issue[] = []

  // ① 앞부분 설명 (§17.4)
  if (!lines.slice(0, HEAD_LINES).some((l) => l.trim().startsWith('/**'))) {
    issues.push({
      line: 1,
      code: lines.find((l) => l.trim()) ?? '',
      why: `앞 ${HEAD_LINES}줄 안에 설명이 없습니다 — 파일 머리말이나 주 선언의 JSDoc 을 다세요 (§17.4)`,
    })
  }

  // ④ 문서 참조 — 파일 안에서 처음 한 번은 전체 경로여야 한다 (§17.3)
  const firstRef = lines.flatMap((l, i) => {
    const m = DOC_REF.exec(l)
    return m ? [{ line: i + 1, full: Boolean(m[1]), code: l.trim() }] : []
  })[0]
  if (firstRef && !firstRef.full) {
    issues.push({
      line: firstRef.line,
      code: firstRef.code.slice(0, 90),
      why: '이 파일의 첫 문서 참조는 전체 경로로 쓰세요 — `docs/ARCHITECTURE.md §4.4` (§17.3)',
    })
  }

  let state = START
  let inTypeBlock = false

  lines.forEach((raw, i) => {
    const t = raw.trim()
    const atLineStart = state
    const { comment, next } = scanLine(raw, state)
    state = next

    if (TYPE_OPEN.test(raw)) inTypeBlock = true
    else if (inTypeBlock && /^\}/.test(raw)) inTypeBlock = false

    // ③ TODO 형식 — **주석 안의** TODO 만, 그리고 토큰마다 (§17.5)
    if (comment && hasBareTodo(comment)) {
      issues.push({
        line: i + 1,
        code: t.slice(0, 90),
        why: 'TODO 에 조건을 괄호로 적으세요 — `TODO(백엔드 스펙 확정 후):` (§17.5)',
      })
    }

    // ② 선언 위의 `//` (§17.2)
    if (atLineStart.tpl || atLineStart.blk) return
    if (!t.startsWith('//') || PRAGMA.test(t)) return
    // 주석이 이어지면 블록의 마지막 줄만 본다
    const nextCode = lines.slice(i + 1).find((l) => l.trim())
    if (!nextCode || nextCode.trim().startsWith('//')) return
    if (TOP_DECL.test(nextCode) || (inTypeBlock && TYPE_FIELD.test(nextCode))) {
      issues.push({
        line: i + 1,
        code: t.slice(0, 90),
        why: '선언 위 주석은 `/** */` 로 쓰세요 — `//` 는 hover 에 뜨지 않습니다 (§17.2)',
      })
    }
  })

  return issues
}
