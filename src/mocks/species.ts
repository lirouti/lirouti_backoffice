/**
 * 캐릭터 종 목 데이터. 디자인 원본 `SPECIES` 표를 값 그대로 옮겼다.
 *
 * 원본 행은 `[이름, 코드, 희귀도, 대표색, 가중치, 시즌, 보유유저, 등록일, 아트담당, 설명]` 이다.
 */
import {
  RIG_SLOTS,
  SLOT_PARTS,
  UNLOCKS,
  type Species,
  type SpeciesInput,
  type SpeciesLog,
} from '@/domain/species'

type Row = [
  name: string,
  code: string,
  rarity: Species['rarity'],
  tone: string,
  weight: number,
  season: Species['season'],
  owners: number,
  madeAt: string,
  by: string,
  note: string,
]

// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const ROWS: Row[] = [
  ['루티', 'SP-BLUE', '기본', '#7DBAFF', 420, '상시', 128400, '2026-01-12', '최지우', '파랑 계열 기본종. 볏 하나에 짧은 꼬리'],
  ['하늬', 'SP-SKY', '기본', '#8ADFF0', 420, '상시', 96200, '2026-01-12', '최지우', '하늘색 몸에 옆으로 뻗은 볏'],
  ['모루', 'SP-MINT', '기본', '#6FCBAE', 420, '상시', 88700, '2026-01-12', '최지우', '민트색. 둥근 부리에 통통한 몸'],
  ['별이', 'SP-LILAC', '희귀', '#B99BEA', 180, '상시', 41300, '2026-02-20', '이도윤', '연보라. 정수리에 별 모양 깃'],
  ['노을', 'SP-CORAL', '희귀', '#FF9E8A', 180, '상시', 38900, '2026-02-20', '이도윤', '산호색. 꼬리깃이 세 갈래'],
  ['달래', 'SP-CREAM', '희귀', '#FFD98A', 180, '상시', 35600, '2026-03-08', '이도윤', '크림색. 눈이 크고 볏이 낮음'],
  ['이슬', 'SP-AQUA', '희귀', '#7FD8E8', 180, '상시', 33100, '2026-03-08', '최지우', '물빛. 날개 끝이 투명하게 밝음'],
  ['수리', 'SP-INDIGO', '영웅', '#7A8FE8', 60, '상시', 12400, '2026-04-15', '정민재', '남색. 볏이 뒤로 길게 넘어감'],
  ['라온', 'SP-ROSE', '영웅', '#FF8FA6', 60, '상시', 11800, '2026-04-15', '정민재', '장미색. 목깃이 풍성함'],
  ['한별', 'SP-VIOLET', '영웅', '#9B87DE', 60, '시즌 3', 8600, '2026-06-02', '정민재', '제비꽃색. 시즌 3 한정 출현'],
  ['소나', 'SP-JADE', '전설', '#3FBF87', 12, '상시', 2140, '2026-05-20', '최지우', '옥색. 꼬리깃에 금빛 테두리'],
  ['미르', 'SP-GOLD', '전설', '#F0B928', 12, '상시', 1870, '2026-05-20', '최지우', '금색. 볏과 부리가 한 색으로 이어짐'],
  ['여울', 'SP-OPAL', '전설', '#C9B8F0', 6, '시즌 3', 420, '2026-07-14', '이도윤', '오팔색. 각도에 따라 색이 바뀜'],
]

/**
 * 슬롯 기본값은 원본에 표가 없다 — 설명(`note`)에 적힌 특징을 부품 이름으로 옮겼다.
 * 걸리는 말이 없으면 각 슬롯의 첫 부품이다.
 */
// prettier-ignore
const SLOT_HINTS: [keyword: string, slot: keyof typeof SLOT_PARTS, part: string][] = [
  ['별 모양 깃', '정수리', '별 모양 깃'],
  ['볏이 낮음', '정수리', '낮은 볏'],
  ['뒤로 길게', '정수리', '뒤로 넘긴 볏'],
  ['눈이 크고', '눈', '큰 눈'],
  ['둥근 부리', '부리', '둥근 부리'],
  ['세 갈래', '꼬리', '세 갈래'],
  ['금빛 테두리', '꼬리', '금테 꼬리'],
  ['통통한 몸', '몸', '통통한 몸'],
  ['투명하게', '손', '투명 날개끝'],
]

function slotsOf(note: string): Species['slots'] {
  const slots = Object.fromEntries(
    RIG_SLOTS.map((s) => [s, SLOT_PARTS[s][0]!]),
  ) as Species['slots']
  for (const [keyword, slot, part] of SLOT_HINTS) {
    if (note.includes(keyword)) slots[slot] = part
  }
  return slots
}

let cache: Species[] | null = null

export function allSpecies(): Species[] {
  if (cache) return cache
  cache = ROWS.map(
    ([name, code, rarity, tone, weight, season, owners, madeAt, by, note], i) => ({
      key: i,
      code,
      name,
      rarity,
      tone,
      weight,
      // 기본종은 조건 없이 주고 나머지는 레벨을 건다 — 원본 `UNLOCK_OPTS[rarity === '기본' ? 0 : 1]`.
      unlock: UNLOCKS[rarity === '기본' ? 0 : 1]!,
      season,
      slots: slotsOf(note),
      owners,
      madeAt,
      by,
      note,
      hidden: false,
    }),
  )
  return cache
}

/** 변경 이력. 원본이 종마다 같은 네 줄을 보여 주므로 그대로 만든다. */
export function logsOf(sp: Species): SpeciesLog[] {
  return [
    {
      at: '2026-08-07 15:12',
      kind: '가중치',
      what: `출현 가중치 ${sp.weight} 로 조정`,
      by: '정민재',
    },
    { at: '2026-07-22 11:40', kind: '슬롯', what: '정수리 기본값 변경', by: '최지우' },
    { at: '2026-06-14 09:28', kind: '아트', what: '성체 아트 리터치 반영', by: '이도윤' },
    { at: '2026-05-30 16:55', kind: '출현', what: '시즌 3 한정으로 전환', by: '김하늘' },
  ]
}

/**
 * 등록·수정을 목에 반영한다. **모듈 캐시를 직접 고친다** (`mocks/items.ts` 와 같은 방식).
 *
 * ⚠️ **새 종은 `hidden: true` 로 만든다.** 클라이언트에 그 종의 아트가 아직 없으므로
 *    등록하자마자 뽑기에 나오면 안 된다 (docs/ARCHITECTURE.md §19).
 *
 * @param key 있으면 수정, 없으면 등록
 */
export function upsertSpecies(input: SpeciesInput, key?: number): Species {
  const list = allSpecies()

  if (key != null) {
    const at = list.findIndex((s) => s.key === key)
    if (at < 0) throw new Error(`수정할 종이 없습니다: ${key}`)
    const next = { ...list[at]!, ...input, slots: { ...input.slots } }
    list[at] = next
    return next
  }

  const nextKey = list.reduce((max, s) => Math.max(max, s.key), -1) + 1
  const created: Species = {
    ...input,
    slots: { ...input.slots },
    key: nextKey,
    owners: 0,
    madeAt: new Date().toISOString().slice(0, 10),
    hidden: true,
  }
  list.push(created)
  return created
}

/** 출현 중단·재개. 편집 모드와 무관하게 그 자리에서 바뀐다 */
export function setHidden(key: number, hidden: boolean): Species {
  const list = allSpecies()
  const at = list.findIndex((s) => s.key === key)
  if (at < 0) throw new Error(`종이 없습니다: ${key}`)
  const next = { ...list[at]!, hidden }
  list[at] = next
  return next
}
