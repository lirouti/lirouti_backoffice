/**
 * 디자인 토큰의 명암비를 검사한다. (docs/ARCHITECTURE.md §3.5)
 *
 *   bun run scripts/check-contrast.ts
 *
 * **왜 필요한가** — 디자인 원본의 회색·상태색이 WCAG AA 에 미달했고(`faint` 2.98,
 * `gFg` 3.08 …), 그건 화면을 열어봐야 알 수 있었다. Lighthouse 로 잡으면 브라우저를
 * 띄워야 하고 **그 화면에 그 색이 쓰인 경우에만** 잡힌다 — 아직 안 만든 43개 화면의
 * 색은 아무도 검사하지 않는다. 토큰 단계에서 재면 그 전부를 한 번에 막는다.
 *
 * 라이트/다크를 모두 본다. 대비는 **가장 불리한 배경** 기준이다.
 */
import config from '../panda.config'

/** WCAG 2.1 상대 휘도 */
function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

type Mode = 'base' | 'dark'

/** panda.config 의 semanticTokens 에서 hex 값만 뽑는다 (rgba 는 대비 계산 대상이 아니다). */
function readTokens(): Record<string, Record<Mode, string>> {
  const raw = config.theme?.extend?.semanticTokens?.colors ?? {}
  const out: Record<string, Record<Mode, string>> = {}
  for (const [name, def] of Object.entries(raw)) {
    const v = (def as { value?: { base?: string; _dark?: string } }).value
    if (typeof v?.base !== 'string' || typeof v?._dark !== 'string') continue
    if (!/^#[0-9A-Fa-f]{6}$/.test(v.base) || !/^#[0-9A-Fa-f]{6}$/.test(v._dark)) continue
    out[name] = { base: v.base, dark: v._dark }
  }
  return out
}

const T = readTokens()
const MODES: Mode[] = ['base', 'dark']

/** 텍스트가 얹히는 표면들. 이 중 가장 불리한 것을 기준으로 잡는다. */
const SURFACES = ['page', 'surf', 'surf2'] as const

/** 본문 텍스트 4.5:1, 큰 글씨·비텍스트 UI 3:1 (WCAG 2.1 AA) */
const AA_TEXT = 4.5
const AA_NON_TEXT = 3

type Issue = { what: string; mode: Mode; got: number; need: number; detail: string }
const issues: Issue[] = []

function require_(what: string, mode: Mode, fg: string, bg: string, need: number, detail: string) {
  const got = ratio(fg, bg)
  if (got < need) issues.push({ what, mode, got, need, detail })
}

function worstSurface(mode: Mode, fg: string): string {
  return SURFACES.map((s) => T[s]![mode]).reduce((w, b) => (ratio(fg, b) < ratio(fg, w) ? b : w))
}

for (const mode of MODES) {
  // 1. 텍스트 회색 — 어느 표면 위에서도 본문 기준을 넘어야 한다.
  for (const name of ['ink', 'sub', 'faint'] as const) {
    const fg = T[name]![mode]
    require_(`${name} (텍스트)`, mode, fg, worstSurface(mode, fg), AA_TEXT, '표면 위 본문')
  }

  // 2. faint2 는 **비텍스트 전용**이다 (아이콘·구분선·테두리). 3:1 만 만족하면 된다.
  //    텍스트로 쓰고 싶으면 faint 를 쓸 것 — panda.config 의 주석 참고.
  const f2 = T.faint2![mode]
  require_('faint2 (아이콘·테두리)', mode, f2, worstSurface(mode, f2), AA_NON_TEXT, '표면 위 아이콘')

  // 3. 배지 — xFg 는 xBg 위에서도, 맨 표면 위에서도 읽혀야 한다
  //    (StatCard 처럼 배경 없이 색만 쓰는 자리가 있다).
  for (const name of Object.keys(T)) {
    if (!name.endsWith('Fg')) continue
    const fg = T[name]![mode]
    const bg = T[name.replace(/Fg$/, 'Bg')]
    if (bg) require_(`${name} on ${name.replace(/Fg$/, 'Bg')}`, mode, fg, bg[mode], AA_TEXT, '배지')
    require_(`${name} (표면 위)`, mode, fg, worstSurface(mode, fg), AA_TEXT, '배경 없는 텍스트')
  }

  // 4. 주 버튼 — pri 를 칠하고 그 위에 onPri 로 글자를 얹는다.
  require_('onPri on pri', mode, T.onPri![mode], T.pri![mode], AA_TEXT, '기본 버튼')

  // 5. 밝은 배경 위의 파란 텍스트는 pri 가 아니라 priD 다.
  const pd = T.priD![mode]
  require_('priD (링크·활성 라벨)', mode, pd, worstSurface(mode, pd), AA_TEXT, '파란 텍스트')
}

if (issues.length === 0) {
  // 색 토큰은 45개지만 `band`·`ring` 은 rgba 라 명암비 계산 대상이 아니다.
  console.log(`명암비 규약 준수 ✓ (hex 토큰 ${Object.keys(T).length}개 · 라이트/다크)`)
  process.exit(0)
}

for (const i of issues) {
  console.error(
    `${i.what} [${i.mode}] — ${i.got.toFixed(2)}:1, ${i.need}:1 필요 (${i.detail})`,
  )
}
console.error(`\n명암비 위반 ${issues.length}건 — docs/ARCHITECTURE.md §3.5`)
process.exit(1)
