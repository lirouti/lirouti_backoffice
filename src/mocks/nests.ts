/**
 * 둥지 3단계. 디자인 원본(`riruti-admin-bg.dc.html`)의 값을 그대로 옮겼다.
 *
 * **줄은 고정이지만 그림과 해금 일수는 바뀐다** — `setBoundaries` 가 그 자리다
 * (docs/ARCHITECTURE.md §41.3 · §19.3). 여전히 **추가·삭제는 없다.**
 *
 * ⚠️ **모듈 캐시라 새로고침하면 고친 값이 사라진다** — 목이라서다.
 */
import { applyNestBoundaries, type Nest, type NestBoundaries } from '@/domain/nest'

/**
 * ⚠️ **일수를 설명 문구에 넣지 않는다.** 원본은 같은 날짜를 카드와 표 **두 칸에** 문자열로
 *    들고 있었다 — 경계를 고치면 둘 다 어긋난다. 여기는 `fromDay` 하나만 들고, 보이는
 *    문구는 `unlockLabel` 이 만든다 (§41.4).
 */
const NESTS: Nest[] = [
  {
    key: 0,
    assetId: 'as_nest_0',
    name: '잔가지 둥지',
    fromDay: 1,
    desc: '성글게 엮인 첫 둥지',
    props: '—',
    own: 92,
  },
  {
    key: 1,
    assetId: 'as_nest_1',
    name: '튼튼한 둥지',
    fromDay: 30,
    desc: '이끼가 끼고 두꺼워짐',
    props: '이끼',
    own: 54,
  },
  {
    key: 2,
    assetId: 'as_nest_2',
    name: '보금자리',
    fromDay: 100,
    desc: '안감 · 걸이등 · 화분',
    props: '안감 · 걸이등 · 화분 · 담요',
    own: 18,
  },
]

/** ⚠️ **배열을 통째로 바꾼다** — 제자리에서 고치면 실패한 저장이 화면에 남는다 */
let nests: Nest[] = NESTS

export const allNests = (): Nest[] => nests

/** 해금 일수를 고친다. 검증은 파사드가 먼저 한다 */
export function setNestBoundaries(b: NestBoundaries): Nest[] {
  nests = applyNestBoundaries(nests, b)
  return nests
}

/**
 * 그림을 바꾼다. 없는 `key` 면 `undefined`.
 *
 * ⚠️ **`assetId` 로 찾지 말 것.** 카탈로그의 다른 그림을 고르면 다른 줄과 같은 id 가 되어
 *    **엉뚱한 줄을 고친다** (§19.3.2). 둥지 셋이 카탈로그 셋을 다 쓰고 있어서 교체하면
 *    거의 반드시 겹친다.
 */
export function setNestAsset(key: number, nextAssetId: string): Nest | undefined {
  if (!nests.some((n) => n.key === key)) return undefined
  nests = nests.map((n) => (n.key === key ? { ...n, assetId: nextAssetId } : n))
  return nests.find((n) => n.key === key)
}

/** 테스트가 모듈 캐시를 되돌린다 — 목 저장소는 파일 하나를 공유한다 */
export function resetNests(): void {
  nests = NESTS
}
