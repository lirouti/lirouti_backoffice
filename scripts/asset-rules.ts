/**
 * 원화 템플릿(`design/*.dc.html`)을 정적 SVG 로 접는 규칙 (docs/ARCHITECTURE.md §8.6).
 *
 * 여기가 틀리면 **에셋이 조용히 잘못 나온다.** 빈 파일도, 16개가 겹쳐 그려진 그림도
 * 빌드를 통과하고 화면에서야 드러난다. 그래서 애매하면 전부 던진다 — 잘못된 SVG 보다
 * 실패한 빌드가 낫다.
 *
 * 원본은 `<sc-if value="{{ x }}">` 로 분기하고 `{{ y }}` 로 값을 꽂는다. 분기 조건과 값은
 * 원본의 `renderVals()` 가 만들지만 **그 코드를 실행하지는 않는다** — 필요한 것이 표 둘뿐이라
 * `jsTable()` 로 읽고 파생은 우리가 쓴다. 이유는 `jsTable` 의 주석에.
 */

const OPEN = /<sc-if\s+value="\{\{\s*(\w+)\s*\}\}"[^>]*>/
const CLOSE = '</sc-if>'
const MOUSTACHE = /\{\{\s*(\w+)\s*\}\}/g

/** 아직 접히지 않은 지시자. `sc-for` 처럼 우리가 처리하지 않는 것까지 잡는다 */
const DIRECTIVE = /\{\{|<sc-/

/**
 * `<sc-if>` 분기를 값에 따라 펼치거나 지운다.
 *
 * ⚠️ **여는/닫는 태그를 세어 짝을 맞춘다.** `<sc-if …>([\s\S]*?)</sc-if>` 로 잡으면
 *    중첩된 분기의 **첫 번째 닫는 태그에서 끊겨**, `nestOn` 안의 `nestHome` 이 잘려
 *    보금자리에서 걸이등·화분이 사라진다.
 *
 * 참인 가지는 내용만 남기고 다시 훑으므로 안쪽 분기도 이어서 처리된다.
 *
 * @param vals 분기 이름 → 불리언. **없는 이름은 거짓**으로 본다 — 원본 엔진이 그렇게
 *   동작한다(`bgOn` 처럼 안 넘긴 prop 이 그대로 거짓이 된다).
 */
export function foldIf(tpl: string, vals: Record<string, unknown>): string {
  for (let m = OPEN.exec(tpl); m; m = OPEN.exec(tpl)) {
    const from = m.index + m[0].length
    let depth = 1
    let at = from
    while (depth > 0) {
      const open = tpl.indexOf('<sc-if', at)
      const close = tpl.indexOf(CLOSE, at)
      if (close < 0) throw new Error(`닫히지 않은 <sc-if>: ${m[1]}`)
      if (open >= 0 && open < close) {
        depth += 1
        at = open + '<sc-if'.length
      } else {
        depth -= 1
        at = close + CLOSE.length
      }
    }
    const inner = tpl.slice(from, at - CLOSE.length)
    tpl = tpl.slice(0, m.index) + (vals[m[1]!] === true ? inner : '') + tpl.slice(at)
  }
  return tpl
}

/**
 * `{{ y }}` 를 값으로 바꾼다.
 *
 * ⚠️ **없는 이름은 던진다.** 빈 문자열로 두면 `fill=""` 가 되어 **검게 칠해진 채로**
 *    파일이 나온다 — 없는 것보다 나쁘다(있는 줄 알게 된다).
 */
export function subst(tpl: string, vals: Record<string, unknown>): string {
  return tpl.replace(MOUSTACHE, (_m, key: string) => {
    if (!(key in vals)) throw new Error(`값이 없는 자리표시자: {{ ${key} }}`)
    return String(vals[key])
  })
}

/**
 * `from` 에서 `to` 직전까지 잘라낸다. 원화 템플릿은 최상위 분기 순서가 곧 구간 경계다.
 *
 * ⚠️ **표지를 못 찾으면 던진다.** 원본이 바뀌어 경계가 사라졌을 때 빈 문자열로 넘어가면
 *    **0바이트 에셋**이 나오는데, 그건 `?` 플레이스홀더보다 나쁘다 — 없는 게 아니라
 *    깨진 것이고, 아무도 눈치채지 못한다.
 */
export function sliceBetween(html: string, from: string, to: string): string {
  const a = html.indexOf(from)
  const b = html.indexOf(to)
  if (a < 0) throw new Error(`구간 시작 표지를 찾지 못했습니다: ${from}`)
  if (b < 0) throw new Error(`구간 끝 표지를 찾지 못했습니다: ${to}`)
  if (b < a) throw new Error(`구간 표지 순서가 뒤집혔습니다: ${from} … ${to}`)
  return html.slice(a, b)
}

/**
 * 접기·치환이 끝난 마크업에 지시자가 남아 있지 않은지 본다.
 *
 * ⚠️ **이게 유일한 안전망이다.** 우리가 처리하지 않는 지시자(`sc-for` 등)가 새 원본에
 *    들어오면 **그대로 문자열로 SVG 에 박혀** 아무것도 안 그린다. 파일은 멀쩡히 생긴다.
 */
export function assertResolved(markup: string, what: string): void {
  const hit = DIRECTIVE.exec(markup)
  if (hit) {
    const at = Math.max(0, hit.index - 40)
    throw new Error(`${what}: 처리하지 못한 템플릿이 남았습니다 — …${markup.slice(at, hit.index + 60)}…`)
  }
}

/**
 * `const NAME = { key: ['a', 'b'], … }` 형태의 표를 읽는다.
 *
 * ⚠️ **디자인 파일의 코드를 실행하지 않는다.** `new Function` 으로 `renderVals()` 를 돌리면
 *    원본에 그대로 따라갈 수 있어 편하지만, 디자인 파일은 **데이터지 실행할 코드가 아니다.**
 *    우리가 쓰는 것은 색표 하나와 경로표 하나뿐이라 읽는 편이 값싸다.
 *
 * 대신 원본의 파생 규칙(`scStudio: scene === 'studio'` 등)을 우리가 다시 쓰게 되는데,
 * 어긋나면 `assertResolved` 가 **처리 못 한 자리표시자**로 잡는다 — 원본이 새 분기나 새 값을
 * 들이면 조용히 어긋나는 게 아니라 빌드가 선다.
 *
 * @param arity 한 줄의 값 개수. 원본에 `]` 를 품은 문자열이 생기면 파싱이 잘리는데,
 *   그때 개수가 안 맞아 여기서 걸린다.
 */
export function jsTable(js: string, name: string, arity: number): Record<string, string[]> {
  const head = new RegExp(`const\\s+${name}\\s*=\\s*\\{`).exec(js)
  if (!head) throw new Error(`표를 찾지 못했습니다: ${name}`)

  const from = head.index + head[0].length
  let depth = 1
  let at = from
  while (depth > 0) {
    if (at >= js.length) throw new Error(`닫히지 않은 표: ${name}`)
    const c = js[at++]
    if (c === '{') depth += 1
    else if (c === '}') depth -= 1
  }

  const out: Record<string, string[]> = {}
  const entry = /(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\[([^\]]*)\]/g
  const body = js.slice(from, at - 1)
  for (let m = entry.exec(body); m; m = entry.exec(body)) {
    const key = m[1] ?? m[2] ?? m[3]!
    const values = [...m[4]!.matchAll(/'([^']*)'|"([^"]*)"/g)].map((v) => v[1] ?? v[2]!)
    if (values.length !== arity) {
      throw new Error(`${name}.${key} 의 값이 ${values.length}개입니다 (${arity}개여야 합니다)`)
    }
    out[key] = values
  }

  if (!Object.keys(out).length) throw new Error(`표가 비었습니다: ${name}`)
  return out
}

