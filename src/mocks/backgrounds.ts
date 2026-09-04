/**
 * 배경 20건. 디자인 원본(`riruti-admin-bg.dc.html`)의 값을 그대로 옮겼다.
 *
 * ⚠️ **시드 RNG 를 쓰지 않는다.** 원본에 20건이 통째로 적혀 있어 지어낼 것이 없다
 *    (docs/ARCHITECTURE.md §41).
 *
 * ⚠️ **`as_bg_16..19`(유료 4종)는 그림이 없다.** 원화 `루티새v2` 의 `SCENE` 이 16개뿐이라
 *    §8.6 이 뽑지 못했다. 목록에서 `?` 타일로 뜨는 게 정상이고, 비슷한 것으로 채우면
 *    나중에 진짜 아트가 왔을 때 무엇이 가짜였는지 알 수 없다.
 */
import type { Background, BackgroundInput } from '@/domain/background'

/** 무료 16종. 순서가 `as_bg_0..15` 다 */
const FREE = [
  '스튜디오',
  '둥지',
  '아침 햇살',
  '밤하늘',
  '벚꽃길',
  '여름 바다',
  '가을 낙엽',
  '겨울 눈밭',
  '숲 산책',
  '도시 야경',
  '체육관',
  '책상 앞',
  '카페',
  '비 오는 날',
  '축하 파티',
  '우주',
]

/** 유료 4종. 가격은 원본의 `[900,1200,1500,1800][i % 4]` 를 그대로 편 값이다 */
// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const PAID: [name: string, price: number][] = [
  ['은하', 900],
  ['마법진', 1200],
  ['심해', 1500],
  ['왕좌의 방', 1800],
]

let cache: Background[] | null = null

export function allBackgrounds(): Background[] {
  if (cache) return cache
  cache = [
    ...FREE.map((name, i) => ({
      key: i,
      assetId: `as_bg_${i}`,
      name,
      tier: 'FREE' as const,
      price: 0,
    })),
    ...PAID.map(([name, price], i) => ({
      key: FREE.length + i,
      assetId: `as_bg_${FREE.length + i}`,
      name,
      tier: 'PAID' as const,
      price,
    })),
  ]
  return cache
}

/**
 * 등록·수정. 모듈 캐시에 쓰므로 **새로고침하면 사라진다** (§9.2).
 *
 * @param key 없으면 등록, 있으면 수정
 */
export function upsertBackground(input: BackgroundInput, key?: number): Background {
  const list = allBackgrounds()

  if (key != null) {
    const at = list.findIndex((b) => b.key === key)
    if (at < 0) throw new Error(`수정할 배경이 없습니다: ${key}`)
    const next = { ...list[at]!, ...input }
    list[at] = next
    return next
  }

  // 새 번호는 **가장 큰 것 다음**이다. 길이로 잡으면 중간이 지워졌을 때 겹친다.
  const nextKey = list.reduce((max, b) => Math.max(max, b.key), -1) + 1
  const created: Background = { ...input, key: nextKey }
  list.push(created)
  return created
}
