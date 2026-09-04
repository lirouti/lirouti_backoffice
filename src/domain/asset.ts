/**
 * 에셋 — 아이템·배경·둥지·업적이 공유하는 「그림 한 장」.
 *
 * 아이템에만 있던 `ItemAsset` 을 여기로 올렸다. 배경도 업적도 같은 모양을 쓰는데,
 * 아이템 폴더 안에 두면 배경 화면이 `@/domain/item` 을 import 하게 된다.
 *
 * **규격은 종류마다 다르다** — 그래서 통합 「에셋 등록」 화면이 성립하지 않는다.
 * 값은 디자인 원본의 `VB`(viewBox) 표에서 그대로 가져왔다.
 */
/**
 * 파일 형식. **내려받기 파일명과 버튼 라벨이 이걸 따른다.**
 *
 * 빌드 에셋은 전부 SVG 라 값이 없으면 `'svg'` 로 본다.
 */
export type AssetExt = 'svg' | 'png'

/** 에셋 종류. 규격이 이것으로 갈린다. */
export type AssetKind =
  'head' | 'body' | 'hand' | 'face' | 'bg' | 'nest' | 'growth' | 'ach' | 'emoji'

export type Asset = {
  assetId: string
  name: string
  /** 한 줄 설명. 원본 테이블의 `sub` */
  sub: string
  /** 유료(프리미엄) 에셋인가 — 타일 배경이 어두워진다 */
  paid: boolean
  /**
   * 올린 그림의 URL.
   *
   * **없으면 빌드에 포함된 에셋**이라 `assetId` 로 찾는다(`@/assets/images`).
   * 목에서는 `URL.createObjectURL` 이 만든 `blob:` URL 이라 **새로고침하면 사라진다.**
   * 서버가 붙으면 여기에 진짜 URL 이 온다.
   */
  src?: string
  /** 파일 형식. 없으면 빌드 에셋이라 `'svg'` 다 */
  ext?: AssetExt
}

/**
 * 종류별 업로드 규격.
 *
 * `ratio` 는 **안내 문구에만** 쓴다 — 실제 가로세로는 파일을 열어 봐야 알 수 있고,
 * SVG 는 `viewBox` 를 우리가 믿을 수 없다(없거나 틀린 파일이 흔하다).
 */
export type AssetSpec = {
  /** 허용 MIME */
  accept: string[]
  maxBytes: number
  /** 가로:세로 */
  ratio: [w: number, h: number]
}

const KB = 1024

export const ASSET_SPECS: Record<AssetKind, AssetSpec> = {
  // 의상 넷과 성장 단계는 캐릭터 프레임 위에 얹히므로 같은 규격이다.
  head: { accept: ['image/svg+xml', 'image/png'], maxBytes: 512 * KB, ratio: [341, 491] },
  body: { accept: ['image/svg+xml', 'image/png'], maxBytes: 512 * KB, ratio: [341, 491] },
  hand: { accept: ['image/svg+xml', 'image/png'], maxBytes: 512 * KB, ratio: [341, 491] },
  face: { accept: ['image/svg+xml', 'image/png'], maxBytes: 512 * KB, ratio: [341, 491] },
  growth: { accept: ['image/svg+xml', 'image/png'], maxBytes: 512 * KB, ratio: [341, 491] },
  // 배경과 둥지는 화면 한 장이라 무겁다.
  bg: { accept: ['image/svg+xml', 'image/png'], maxBytes: 2048 * KB, ratio: [586, 576] },
  nest: { accept: ['image/svg+xml', 'image/png'], maxBytes: 2048 * KB, ratio: [586, 576] },
  ach: { accept: ['image/svg+xml', 'image/png'], maxBytes: 256 * KB, ratio: [200, 200] },
  emoji: { accept: ['image/svg+xml', 'image/png'], maxBytes: 128 * KB, ratio: [296, 322] },
}

/**
 * 검사에 필요한 만큼만. `File` 이 이 모양을 만족하므로 그대로 넘기면 된다.
 *
 * `File` 을 직접 받지 않는 이유는 `domain` 이 브라우저를 몰라야 해서다 —
 * 테스트도 node 환경에서 돈다(`vite.config.ts`).
 */
export type AssetFileInfo = {
  name: string
  /** MIME. 브라우저가 못 알아보면 빈 문자열이다 */
  type: string
  size: number
}

const EXT_MIME: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png' }

/** MIME 이 비어 있으면 확장자로 짐작한다 — OS·브라우저에 따라 빈 채로 온다. */
function mimeOf(file: AssetFileInfo): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? ''
}

/**
 * 사람이 읽는 크기.
 *
 * @param up 올림한다. **한도를 넘긴 파일에 쓴다** — 반올림하면 512KB + 1바이트가
 *   「512KB」 로 찍혀서 "512KB 이하만 올릴 수 있습니다. (512KB)" 라는 말이 안 되는
 *   문구가 나온다.
 */
function sizeLabel(bytes: number, up = false): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`
  return `${up ? Math.ceil(bytes / KB) : Math.round(bytes / KB)}KB`
}

/**
 * 올릴 수 있는 파일인가. 통과하면 `null`.
 *
 * 형식과 크기만 본다 — **가로세로는 보지 않는다**(위 `ratio` 설명). 그림이 규격에
 * 맞는지는 사람이 미리보기로 확인하고, 최종 판정은 서버가 한다.
 */
export function validateAssetFile(file: AssetFileInfo, spec: AssetSpec): string | null {
  const mime = mimeOf(file)
  if (!spec.accept.includes(mime)) {
    return `${spec.accept.map((m) => (EXT_MIME.svg === m ? 'SVG' : 'PNG')).join(' · ')} 만 올릴 수 있습니다.`
  }
  if (file.size > spec.maxBytes) {
    return `${sizeLabel(spec.maxBytes)} 이하만 올릴 수 있습니다. (${sizeLabel(file.size, true)})`
  }
  // 0바이트는 브라우저가 형식·크기를 다 통과시키지만 그리면 아무것도 안 나온다.
  if (file.size === 0) return '빈 파일입니다.'
  return null
}

/** 올린 파일의 형식. MIME 이 비어 있으면 확장자로 짐작한다 (`mimeOf` 와 같은 규칙). */
export const extOfFile = (file: AssetFileInfo): AssetExt =>
  mimeOf(file) === 'image/png' ? 'png' : 'svg'

/** `<input accept>` 에 넣을 값 */
export const acceptAttr = (spec: AssetSpec): string => spec.accept.join(',')

/** 입력 아래에 붙는 안내. 「SVG · PNG · 341:491 · 512KB 이하」 */
export const assetHint = (spec: AssetSpec): string =>
  `${spec.accept.map((m) => (m === 'image/svg+xml' ? 'SVG' : 'PNG')).join(' · ')} · ${spec.ratio[0]}:${spec.ratio[1]} · ${sizeLabel(spec.maxBytes)} 이하`
