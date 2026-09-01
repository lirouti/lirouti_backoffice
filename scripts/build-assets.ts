/**
 * design/ 의 디자인 원본에서 **개별 SVG 파일**을 뽑아 src/assets/ 에 떨어뜨린다.
 *
 *   bun run assets
 *
 * 산출물
 *   src/assets/icons/<id>.svg   UI 아이콘 15개 — currentColor 를 쓰므로 컴포넌트로 인라인한다
 *   src/assets/images/<id>.svg  캐릭터 에셋 50개 — 색이 박혀 있으므로 <img> 로 지연 로드한다
 *   src/assets/icons/index.ts   { id: ReactComponent } 맵 + IconId 타입
 *   src/assets/images/index.ts  { id: url } 맵 + AssetId 타입
 *
 * 원본에서 감안해야 하는 것 네 가지
 *  1. 원본은 `<g id="X">` 라서 viewBox 를 못 싣는다 → 그룹별 viewBox 규칙(VIEW_BOX)을 붙여준다.
 *  2. 에셋 그룹 안에 중첩 `<g>` 가 있다 → 깊이를 세어 짝을 맞춘다.
 *  3. `nst3f` 는 원본에 닫는 `</g>` 가 빠져 있다. 원본은 innerHTML 로 주입해서 브라우저 파서가
 *     알아서 닫아줬기 때문에 드러나지 않았다 → 같은 방식으로 복구한다.
 *  4. **공유 defs** — `aurM/aurS/aurR/aurP`(유료 로브의 오라), `nestLin`(둥지)은 스프라이트 루트에
 *     정의돼 있고 여러 에셋이 참조한다. `rg` 는 `<use href="#rgB">` 로 다른 그룹을 참조한다.
 *     파일을 쪼개면 이 참조가 끊기므로, 각 파일에 필요한 정의를 **전이적으로 찾아 인라인**한다.
 *
 * ⚠️ **`riruti-assets.js` 는 256 KiB 에서 잘려 있다** (DesignSync `get_file` 상한, 이어받을 수
 *    없다). 그래서 배경·둥지·업적은 **원화 파일에서 직접 뽑는다** — 그게 `ART_*` 소스다.
 *    자세한 것은 §8.6.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertResolved, foldIf, jsTable, sliceBetween, subst } from './asset-rules'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_JS = resolve(ROOT, 'design/riruti-assets.js')
const SHELL_HTML = resolve(ROOT, 'design/리루티 운영 어드민.dc.html')
/** 업적 12종. 인라인 정적 SVG 라 템플릿 평가가 필요 없다 */
const ART_ACH = resolve(ROOT, 'design/riruti-art-8.dc.html')
/** 배경 16 · 둥지 3 이 `sc-if` 분기로 들어 있는 리그 원화 */
const ART_RIG = resolve(ROOT, 'design/루티새v2.dc.html')
/** `as_ach_*` 의 이름·설명 표. 대조 기준의 출처 — 손으로 옮겨 적지 않는다 */
const ADMIN_ACH = resolve(ROOT, 'design/riruti-admin-ach.dc.html')
const ICON_DIR = resolve(ROOT, 'src/assets/icons')
const IMAGE_DIR = resolve(ROOT, 'src/assets/images')

/**
 * `SCENE` 키 순서 = `as_bg_0..15`. 어드민 목록과 순서까지 일치하는 것을 확인했다
 * (studio→스튜디오 … space→우주, 16/16).
 *
 * ⚠️ **유료 배경 4개(`as_bg_16..19` 은하·마법진·심해·왕좌의 방)는 이 원화에 없다.**
 *    비슷한 것으로 채우지 말 것 — 나중에 진짜 아트가 왔을 때 무엇이 가짜였는지 알 수 없다.
 *    타일이 `?` 로 뜨는 게 정직하다.
 */
const SCENES = [
  'studio', 'nest', 'morning', 'night', 'bloom', 'sea', 'autumn', 'snow',
  'forest', 'city', 'gym', 'desk', 'cafe', 'rain', 'party', 'space',
]

/** 그룹 접두사별 viewBox. 원본 Component.VB 를 그대로 옮겼다. */
const VIEW_BOX: Array<[RegExp, string]> = [
  [/^ic_/, '0 0 16 16'],
  [/^as_(head|body|hand|face|growth)_/, '298 -6 341 491'],
  [/^as_(bg|nest)_/, '0 0 586 576'],
  [/^as_ach_/, '0 0 200 200'],
  [/^as_emoji_/, '320 -12 296 322'],
  [/^rg/, '298 -6 341 491'],
  [/^nst/, '0 0 586 576'],
]

function viewBoxFor(id: string): string {
  const hit = VIEW_BOX.find(([re]) => re.test(id))
  if (!hit) throw new Error(`viewBox 규칙 없음: ${id} — VIEW_BOX 에 추가하세요`)
  return hit[1]
}

function unescapeJs(s: string): string {
  return s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_m, esc: string) => {
    if (esc[0] === 'u') return String.fromCharCode(parseInt(esc.slice(1), 16))
    const table: Record<string, string> = {
      n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'",
    }
    return table[esc] ?? esc
  })
}

function readAssetLib(): { markup: string; truncated: boolean } {
  const raw = readFileSync(ASSETS_JS, 'utf8')
  const start = raw.indexOf('"')
  if (start < 0) throw new Error('riruti-assets.js 에서 문자열 리터럴을 찾지 못했습니다')
  const tail = raw.slice(start + 1)
  const closing = tail.lastIndexOf('";')
  const truncated = closing < 0
  return { markup: unescapeJs(truncated ? tail : tail.slice(0, closing)), truncated }
}

type Sym = {
  id: string
  body: string
}

const OPEN_TAG = /<g\b[^>]*\bid="([A-Za-z0-9_]+)"[^>]*>/g
const ANY_G_TAG = /<(\/?)g\b([^>]*)>/g

function extractGroups(markup: string): {
  syms: Sym[]
  dropped: string[]
  repaired: string[]
} {
  const syms: Sym[] = []
  const dropped: string[] = []
  const repaired: string[] = []

  OPEN_TAG.lastIndex = 0
  for (let m = OPEN_TAG.exec(markup); m; m = OPEN_TAG.exec(markup)) {
    const id = m[1]!
    const from = m.index + m[0].length
    if (m[0].endsWith('/>')) {
      syms.push({ id, body: '' })
      continue
    }

    let depth = 1
    let end = -1
    ANY_G_TAG.lastIndex = from
    for (let t = ANY_G_TAG.exec(markup); t; t = ANY_G_TAG.exec(markup)) {
      if (t[2]!.endsWith('/')) continue
      depth += t[1] === '/' ? -1 : 1
      if (depth === 0) {
        end = t.index
        break
      }
    }

    if (end >= 0) {
      syms.push({ id, body: markup.slice(from, end) })
      OPEN_TAG.lastIndex = end
      continue
    }

    // 닫히지 않은 그룹: 다음 최상위 그룹 직전까지를 본문으로 본다.
    OPEN_TAG.lastIndex = from
    const next = OPEN_TAG.exec(markup)
    const stop = next ? next.index : markup.length
    OPEN_TAG.lastIndex = from

    const region = markup.slice(from, stop)
    if (region.lastIndexOf('<') > region.lastIndexOf('>')) {
      dropped.push(id) // 파일이 잘려 태그 중간에서 끝났다 — 복구하지 않는다
      continue
    }

    ANY_G_TAG.lastIndex = 0
    let unclosed = 0
    for (const t of region.matchAll(ANY_G_TAG)) {
      if (t[2]!.endsWith('/')) continue
      unclosed += t[1] === '/' ? -1 : 1
    }
    syms.push({ id, body: region + '</g>'.repeat(Math.max(0, unclosed)) })
    repaired.push(id)
  }
  return { syms, dropped, repaired }
}

function extractInlineSymbols(): Sym[] {
  const html = readFileSync(SHELL_HTML, 'utf8')
  const syms: Sym[] = []
  const re = /<symbol\s+id="([A-Za-z0-9_]+)"[^>]*>([\s\S]*?)<\/symbol>/g
  for (let m = re.exec(html); m; m = re.exec(html)) syms.push({ id: m[1]!, body: m[2]! })
  return syms
}

/** 업적 카탈로그의 `<svg>` 와 바로 뒤 캡션 두 줄을 **한 짝으로** 잡는다 (§3.2) */
const ACH_ENTRY =
  /<svg\b[^>]*\bviewBox="[^"]+"[^>]*>([\s\S]*?)<\/svg>\s*<div[^>]*>([^<]+)<\/div>\s*<div[^>]*>([^<]+)<\/div>/g

/**
 * 업적 12종. 인라인 정적 SVG 라 템플릿 평가가 없다.
 *
 * ⚠️ **순서가 곧 id 다.** 조용히 어긋나면 「첫 알」 자리에 트로피가 뜬다. 그래서 어드민의
 *    이름·설명 표와 대조하고 어긋나면 던진다 — 기대값을 **손으로 적지 않는** 이유는,
 *    옮겨 적은 목록은 원본이 바뀌어도 안 바뀌어서 검사가 **과거의 원본**을 지키게 되기 때문이다.
 */
function extractAchievements(): Sym[] {
  const html = readFileSync(ART_ACH, 'utf8')
  const want = achievementTable()
  const syms: Sym[] = []

  for (let m = ACH_ENTRY.exec(html); m; m = ACH_ENTRY.exec(html)) {
    const i = syms.length
    const expected = want[i]
    if (!expected) throw new Error(`업적 원화가 어드민 표(${want.length}건)보다 많습니다`)
    if (m[2]!.trim() !== expected.name || m[3]!.trim() !== expected.sub) {
      throw new Error(
        `as_ach_${i} 가 어긋납니다 — 원화 「${m[2]!.trim()} · ${m[3]!.trim()}」 ` +
          `↔ 어드민 「${expected.name} · ${expected.sub}」`,
      )
    }
    syms.push({ id: `as_ach_${i}`, body: m[1]! })
  }

  if (syms.length !== want.length) {
    throw new Error(`업적 원화 ${syms.length}건 ≠ 어드민 표 ${want.length}건`)
  }
  return syms
}

/** 어드민이 들고 있는 `[id, 이름, 설명, 라벨]` 표. 대조 기준의 출처다 */
function achievementTable(): { name: string; sub: string }[] {
  const html = readFileSync(ADMIN_ACH, 'utf8')
  const at = html.indexOf('"ach":[')
  if (at < 0) throw new Error(`${ADMIN_ACH} 에서 "ach" 표를 찾지 못했습니다`)
  const end = html.indexOf(']]', at)
  if (end < 0) throw new Error(`${ADMIN_ACH} 의 "ach" 표가 닫히지 않았습니다`)
  const rows = JSON.parse(html.slice(at + '"ach":'.length, end + 2)) as string[][]
  return rows.map((r) => ({ name: r[1]!, sub: r[2]! }))
}

/**
 * 배경 16 · 둥지 3. `sc-if` 분기를 값으로 접어 정적 SVG 로 만든다 (§8.6).
 *
 * 경계는 템플릿의 최상위 분기 순서가 그대로다 — 배경(`bgOn`·`sceneOn`) → 둥지(`nestOn`)
 * → 새(`perchOn`). 서로 겹치지 않는다.
 */
function extractSceneAssets(): Sym[] {
  const html = readFileSync(ART_RIG, 'utf8')
  const bg = sliceBetween(html, '<sc-if value="{{ bgOn }}"', '<sc-if value="{{ nestOn }}"')
  const nest = sliceBetween(html, '<sc-if value="{{ nestOn }}"', '<sc-if value="{{ perchOn }}"')

  // 원본 `SCENE` 은 [배경색, 무늬색], `NEST` 는 [경로, 채움색, 선색] 이다.
  const scene = jsTable(html, 'SCENE', 2)
  const nests = jsTable(html, 'NEST', 3)

  return [
    ...SCENES.map((key, i) => fold(`as_bg_${i}`, bg, sceneVals(scene, key))),
    ...[1, 2, 3].map((tier) => fold(`as_nest_${tier - 1}`, nest, nestVals(nests, tier))),
  ]
}

/** 한 조각을 값으로 접어 `Sym` 으로. 남은 지시자가 있으면 여기서 던진다 */
function fold(id: string, tpl: string, vals: Record<string, unknown>): Sym {
  const body = subst(foldIf(tpl, vals), vals).trim()
  assertResolved(body, id)
  return { id, body }
}

/**
 * 배경 한 장이 쓰는 값. 원본의 `scene === 'studio'` 파생을 여기서 다시 쓴다 (§8.6).
 *
 * `bgOn` 은 **거짓으로 둔다** — 그건 scene 없이 쓸 때의 단색 배경이라, 배경 에셋에서는
 * `sceneOn` 쪽만 남아야 한다.
 */
function sceneVals(table: Record<string, string[]>, key: string): Record<string, unknown> {
  const pair = table[key]
  if (!pair) throw new Error(`SCENE 에 '${key}' 가 없습니다`)
  const flags = Object.fromEntries(
    Object.keys(table).map((k) => [`sc${k[0]!.toUpperCase()}${k.slice(1)}`, k === key]),
  )
  return { ...flags, bgOn: false, sceneOn: true, sceneFill: pair[0], sceneDot: pair[1] }
}

/** 둥지 한 단계가 쓰는 값. 이끼는 2단계부터, 살림살이(걸이등·화분)는 3단계만 */
function nestVals(table: Record<string, string[]>, tier: number): Record<string, unknown> {
  const row = table[String(tier)]
  if (!row) throw new Error(`NEST 에 '${tier}' 단계가 없습니다`)
  return {
    bgOn: false,
    nestOn: true,
    nestD: row[0],
    nestC: row[1],
    nestL: row[2],
    nestMoss: tier >= 2,
    nestHome: tier === 3,
  }
}

/** 마크업 어디든에서 `id="X"` 를 가진 요소 하나를 통째로 떼어온다. */
function findDefinition(markup: string, id: string): string | null {
  const at = markup.indexOf(`id="${id}"`)
  if (at < 0) return null

  const open = markup.lastIndexOf('<', at)
  const tag = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(markup.slice(open))?.[1]
  if (!tag) return null

  const tagEnd = markup.indexOf('>', at)
  if (tagEnd < 0) return null
  if (markup[tagEnd - 1] === '/') return markup.slice(open, tagEnd + 1) // 자기닫힘

  // 같은 이름의 태그로 깊이를 센다.
  const both = new RegExp(`<(/?)${tag}\\b([^>]*)>`, 'g')
  both.lastIndex = tagEnd + 1
  let depth = 1
  for (let t = both.exec(markup); t; t = both.exec(markup)) {
    if (t[2]!.endsWith('/')) continue
    depth += t[1] === '/' ? -1 : 1
    if (depth === 0) return markup.slice(open, t.index + t[0].length)
  }
  return null
}

/** 본문이 참조하는 id 들을 전이적으로 모아 <defs> 로 만든다. */
function resolveDeps(markup: string, body: string, ownId: string): { defs: string; missing: string[] } {
  const collected = new Map<string, string>()
  const missing: string[] = []
  const seen = new Set<string>([ownId])
  let frontier = [body]

  while (frontier.length) {
    const next: string[] = []
    for (const chunk of frontier) {
      const defined = new Set([...chunk.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map((x) => x[1]!))
      const refs = [
        ...[...chunk.matchAll(/url\(#([A-Za-z0-9_-]+)\)/g)].map((x) => x[1]!),
        ...[...chunk.matchAll(/(?:xlink:)?href="#([A-Za-z0-9_-]+)"/g)].map((x) => x[1]!),
      ]
      for (const ref of new Set(refs)) {
        if (defined.has(ref) || seen.has(ref) || collected.has(ref)) continue
        seen.add(ref)
        const def = findDefinition(markup, ref)
        if (!def) {
          missing.push(ref)
          continue
        }
        collected.set(ref, def)
        next.push(def)
      }
    }
    frontier = next
  }

  const defs = [...collected.values()].join('\n    ')
  return { defs: defs ? `\n  <defs>\n    ${defs}\n  </defs>` : '', missing }
}

function toStandaloneSvg(id: string, body: string, defs: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxFor(id)}">${defs}
  ${body.trim()}
</svg>
`
}

// ── 실행 ──────────────────────────────────────────────────────────
const { markup, truncated } = readAssetLib()
const { syms: libSyms, dropped, repaired } = extractGroups(markup)
const inlineSyms = extractInlineSymbols()
const artSyms = [...extractAchievements(), ...extractSceneAssets()]

// ⚠️ 참조 해석은 이 문자열에서 `id="X"` 를 찾는다. 새 소스를 빠뜨리면 배경의
//    `url(#rvScene)` 이 안 풀려 **클립이 사라지고 그림이 카드 밖으로 번진다** —
//    경고는 찍히지만 화면은 그럴듯해서 눈치채기 어렵다.
const searchSpace = [markup, readFileSync(SHELL_HTML, 'utf8'), readFileSync(ART_RIG, 'utf8')].join('\n')

// ⚠️ **순서가 곧 우선순위다** (`byId.set` 이라 나중 것이 이긴다). 원화에서 뽑은 것을 앞에 두어,
//    나중에 온전한 riruti-assets.js 를 받으면 **그게 우리 것을 덮어쓰게** 한다. 뒤에 두면
//    온전본을 넣고도 계속 우리 것이 쓰여 왜 안 바뀌는지 모르게 된다.
const byId = new Map<string, Sym>()
for (const s of [...artSyms, ...libSyms, ...inlineSyms]) byId.set(s.id, s)

rmSync(ICON_DIR, { recursive: true, force: true })
rmSync(IMAGE_DIR, { recursive: true, force: true })
mkdirSync(ICON_DIR, { recursive: true })
mkdirSync(IMAGE_DIR, { recursive: true })

const icons: string[] = []
const images: string[] = []
const unresolved: string[] = []

for (const { id, body } of [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  const { defs, missing } = resolveDeps(searchSpace, body, id)
  if (missing.length) unresolved.push(`${id} → ${missing.join(', ')}`)

  const isIcon = id.startsWith('ic_')
  const dir = isIcon ? ICON_DIR : IMAGE_DIR
  writeFileSync(resolve(dir, `${id}.svg`), toStandaloneSvg(id, body, defs), 'utf8')
  ;(isIcon ? icons : images).push(id)
}

writeFileSync(
  resolve(ICON_DIR, 'index.ts'),
  `// 자동 생성됨 — 편집하지 마세요. \`bun run assets\` 로 다시 만듭니다.
${icons.map((id) => `import ${id} from './${id}.svg?react'`).join('\n')}

/** currentColor 를 쓰므로 컴포넌트로 인라인한다. */
export const ICONS = {
${icons.map((id) => `  ${id},`).join('\n')}
} as const

export type IconId = keyof typeof ICONS
export const ICON_IDS = Object.keys(ICONS) as IconId[]
`,
  'utf8',
)

writeFileSync(
  resolve(IMAGE_DIR, 'index.ts'),
  `// 자동 생성됨 — 편집하지 마세요. \`bun run assets\` 로 다시 만듭니다.
${images.map((id) => `import ${id} from './${id}.svg'`).join('\n')}

/** 색이 박혀 있어 <img> 로 지연 로드한다. 값은 번들러가 준 URL. */
export const IMAGES = {
${images.map((id) => `  ${id},`).join('\n')}
} as const

export type AssetId = keyof typeof IMAGES
export const ASSET_IDS = Object.keys(IMAGES) as AssetId[]
export const isAssetId = (v: string): v is AssetId => v in IMAGES
`,
  'utf8',
)

console.log(`아이콘 ${icons.length}개 → src/assets/icons/`)
console.log(`에셋   ${images.length}개 → src/assets/images/`)
if (repaired.length) console.log(`\n원본에 </g> 가 빠져 복구: ${repaired.join(', ')}`)
if (unresolved.length) {
  console.warn(`\n⚠️  정의를 찾지 못한 참조 ${unresolved.length}건 (해당 부분은 렌더되지 않습니다):`)
  unresolved.forEach((u) => console.warn(`     ${u}`))
}
if (truncated || dropped.length) {
  console.warn(
    `\n⚠️  design/riruti-assets.js 가 잘려 있습니다 (DesignSync get_file 의 256 KiB 상한).` +
      (dropped.length ? `\n    미완성으로 버린 심볼: ${dropped.join(', ')}` : '') +
      `\n    배경·둥지·업적은 원화에서 직접 뽑으므로 영향받지 않습니다.` +
      `\n    아직 없는 것: 유료 배경 4(as_bg_16..19) · 성장 단계 · 이모티콘.` +
      `\n    Claude Design 에서 원본을 직접 내려받아 design/ 에 덮어쓰면 그것들도 나옵니다.`,
  )
}
