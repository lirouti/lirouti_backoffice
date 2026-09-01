/**
 * 둥지 3단계. 디자인 원본(`riruti-admin-bg.dc.html`)의 값을 그대로 옮겼다.
 *
 * **고정 집합이라 등록·수정이 없다** — `upsert` 가 없는 것은 빠뜨린 게 아니다
 * (docs/ARCHITECTURE.md §41.3).
 */
import type { Nest } from '@/domain/nest'

/** 카드의 `sub` 와 표의 `cond`·`props` 는 원본에서 서로 다른 배열이라 그대로 나눠 둔다 */
const NESTS: Nest[] = [
  {
    assetId: 'as_nest_0',
    name: '잔가지 둥지',
    sub: '누적 1–29일 · 성글게 엮인 첫 둥지',
    cond: '누적 1–29일',
    props: '—',
    own: 92,
  },
  {
    assetId: 'as_nest_1',
    name: '튼튼한 둥지',
    sub: '30–99일 · 이끼가 끼고 두꺼워짐',
    cond: '30–99일',
    props: '이끼',
    own: 54,
  },
  {
    assetId: 'as_nest_2',
    name: '보금자리',
    sub: '100일~ · 안감 · 걸이등 · 화분',
    cond: '100일 이상',
    props: '안감 · 걸이등 · 화분 · 담요',
    own: 18,
  },
]

export const allNests = (): Nest[] => NESTS
