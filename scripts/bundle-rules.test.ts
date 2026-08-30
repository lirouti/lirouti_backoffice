/**
 * 첫 로드 예산 판정 (docs/ARCHITECTURE.md §9.4).
 *
 * 여기가 틀리면 **예산이 조용히 무의미해진다** — 세지 말아야 할 것을 세거나,
 * 세야 할 것을 빠뜨려도 검사는 초록으로 지나간다.
 */
import { describe, expect, it } from 'vitest'

import { entryAssets, KB, kb, lines, report } from './bundle-rules'

const HTML = `<!doctype html>
<html><head>
<script>document.documentElement.dataset.theme='light'</script>
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<script type="module" crossorigin src="/assets/index-abc.js"></script>
<link rel="modulepreload" crossorigin href="/assets/core-def.js">
<link rel="stylesheet" crossorigin href="/assets/index-ghi.css">
</head><body><div id="root"></div></body></html>`

describe('entryAssets', () => {
  it('script · modulepreload · stylesheet 를 모두 잡는다', () => {
    expect(entryAssets(HTML)).toEqual(['index-abc.js', 'core-def.js', 'index-ghi.css'])
  })

  // `href` 만 보고 긁으면 preconnect 가 딸려 들어와 없는 파일을 읽으려 한다.
  it('⚠️ 외부 링크(preconnect)는 세지 않는다', () => {
    expect(entryAssets(HTML).some((a) => a.includes('jsdelivr'))).toBe(false)
  })

  // Vite 는 엔트리를 modulepreload 로도 적을 수 있다. 두 번 세면 예산이 부풀려진다.
  it('⚠️ 같은 파일이 두 번 참조돼도 한 번만 센다', () => {
    const dup = `<script src="/assets/a.js"></script><link rel="modulepreload" href="/assets/a.js">`
    expect(entryAssets(dup)).toEqual(['a.js'])
  })

  // lazy 청크는 index.html 에 안 실린다 — 그게 이 예산이 재려는 경계다.
  it('index.html 에 없는 청크는 대상이 아니다', () => {
    expect(entryAssets(HTML)).not.toContain('DashboardPage-xyz.js')
  })

  it('참조가 없으면 빈 배열', () => {
    expect(entryAssets('<html></html>')).toEqual([])
  })
})

describe('report', () => {
  const assets = [
    { name: 'index.js', gzipBytes: 100 * KB },
    { name: 'core.js', gzipBytes: 26 * KB },
  ]

  it('합계를 내고 예산과 견준다', () => {
    const r = report(assets, 200 * KB)
    expect(r.totalBytes).toBe(126 * KB)
    expect(r.over).toBe(false)
  })

  // 경계에서 실패하면 예산에 정확히 맞춘 빌드가 막힌다.
  it('⚠️ 예산과 정확히 같으면 통과 — 경계는 포함이다', () => {
    expect(report(assets, 126 * KB).over).toBe(false)
    expect(report(assets, 126 * KB - 1).over).toBe(true)
  })
})

describe('lines', () => {
  const assets = [
    { name: 'small.js', gzipBytes: 1 * KB },
    { name: 'big.js', gzipBytes: 100 * KB },
  ]

  // 무엇이 무거운지 먼저 보여야 원인을 찾는다.
  it('큰 것부터 보여 준다', () => {
    const out = lines(report(assets, 200 * KB))
    expect(out[0]).toContain('big.js')
    expect(out[1]).toContain('small.js')
  })

  it('넘지 않으면 남은 여유를 말한다', () => {
    expect(lines(report(assets, 200 * KB)).at(-1)).toContain('여유')
  })

  // "넘었다" 만 말하면 얼마나 줄여야 하는지 모른다.
  it('⚠️ 넘으면 얼마나 넘었는지 말한다', () => {
    const out = lines(report(assets, 100 * KB)).at(-1)!
    expect(out).toContain('넘었습니다')
    expect(out).toContain('1.00 KB')
  })
})

describe('kb', () => {
  // 0.3KB 씩 늘어나는 것을 봐야 해서 소수 둘째 자리까지 쓴다.
  it('소수 둘째 자리까지', () => {
    expect(kb(1536)).toBe('1.50 KB')
    expect(kb(149 * KB + 300)).toBe('149.29 KB')
  })
})
