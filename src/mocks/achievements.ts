/**
 * 업적 12건. 디자인 원본(`riruti-admin-ach.dc.html`)의 값을 그대로 옮겼다.
 *
 * ⚠️ **시드 RNG 도 쓰지 않는다.** 다른 목과 달리 여기는 **원본에 12건이 통째로 적혀 있어서**
 *    지어낼 것이 없다. 숫자를 흔들면 디자인 대조가 불가능해진다.
 *
 * `earned` 와 `rate` 가 둘 다 있는 건 중복이 아니다 — 실서버도 둘 다 내려준다(전체 유저 수를
 * 화면이 모른다). 원본의 12쌍은 전부 전체 25,170명 기준으로 맞아떨어진다.
 */
import type { Achievement, AchievementInput } from '@/domain/achievement'

/** `[이름, 조건, 보상, 달성자, 달성률]` — 원본 `achRows` 그대로 */
const ROWS: [string, string, string, number, number][] = [
  ['첫 알', '계정 생성', '젬 50', 24180, 96],
  ['첫 부화', '알 부화 완료', '젬 100', 23640, 94],
  ['7일 연속 출석', '7일 연속 접속', '젬 200', 17820, 71],
  ['100일 함께', '누적 100일', '보금자리', 5540, 22],
  ['옷장 완성', '의상 전체 수집', '금세공 왕관', 2010, 8],
  ['배경 수집가', '배경 16종 해금', '젬 500', 8560, 34],
  ['젬 1,000개', '젬 누적 1,000', '젬 100', 11580, 46],
  ['친구 초대', '친구 3명 초대', '젬 300', 13090, 52],
  ['이모티콘 마스터', '이모티콘 12종', '젬 200', 7300, 29],
  ['13종 도감 완성', '캐릭터 13종', '성좌의 로브', 1010, 4],
  ['전 업적 달성', '업적 11개', '왕실 벨벳 망토', 250, 1],
  ['첫 선물', '선물 1회', '젬 50', 15860, 63],
]

/** 조형 설명 — 원본 에셋 표의 `sub` 그대로. 순서가 `ROWS` 와 같다 */
const SHAPES = [
  '금속 메달 · 월계관',
  '이중 링 도장 · 겹쳐 찍힘',
  '절취선 티켓 · 바코드',
  '천구의 · 별자리 · 명판',
  '행택 · 스티치 · 고리',
  '폴라로이드 3겹 · 테이프',
  '다면 컷 · 글린트',
  '천공 우표 · 필리그리 · 소인',
  '말풍선 4분할 · 반전 배치',
  '문장 방패 · 왕관 · 월계',
  '픽셀 트로피 · 도트 아웃라인',
  '실링 왁스 · 리본 매듭',
]

let cache: Achievement[] | null = null

export function allAchievements(): Achievement[] {
  if (cache) return cache
  cache = ROWS.map(([name, cond, reward, earned, rate], i) => ({
    key: i,
    assetId: `as_ach_${i}`,
    name,
    sub: SHAPES[i]!,
    cond,
    reward,
    earned,
    rate,
  }))
  return cache
}

/**
 * 등록·수정. 모듈 캐시에 쓰므로 **새로고침하면 사라진다** (docs/ARCHITECTURE.md §9.2).
 *
 * @param key 없으면 등록, 있으면 수정
 */
export function upsertAchievement(input: AchievementInput, key?: number): Achievement {
  const list = allAchievements()

  if (key != null) {
    const at = list.findIndex((a) => a.key === key)
    if (at < 0) throw new Error(`수정할 업적이 없습니다: ${key}`)
    const next = { ...list[at]!, ...input }
    list[at] = next
    return next
  }

  // 새 번호는 **가장 큰 것 다음**이다. 길이로 잡으면 중간이 지워졌을 때 겹친다.
  const nextKey = list.reduce((max, a) => Math.max(max, a.key), -1) + 1
  // ⚠️ 갓 만든 업적은 아무도 달성하지 않았다. 0 이 아니면 목록이 거짓말을 한다.
  const created: Achievement = { ...input, key: nextKey, earned: 0, rate: 0 }
  list.push(created)
  return created
}
