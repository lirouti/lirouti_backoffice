/**
 * 레벨 테이블 목 데이터. 원본의 식(`100 + i*120 + i*i*18`)과 해금 문구 14개를 옮겼다.
 *
 * ⚠️ **누적은 여기서 만들지 않는다.** `withTotals` 가 `need` 를 더해 채운다 —
 *    원본처럼 별개 식으로 만들면 두 열이 어긋난다 (docs/ARCHITECTURE.md §24.1).
 */
import { withTotals, type Level, type LevelSeed } from '@/domain/level'

/** 원본 `unlock` 배열 — 레벨 순서 그대로 */
const UNLOCKS = [
  '기본 표정',
  '머리 슬롯',
  '배경 2종',
  '손 슬롯',
  '주간 챌린지',
  '얼굴 슬롯',
  '배경 4종',
  '이모티콘 6종',
  '튼튼한 둥지',
  '유료 상점',
  '시즌 패스',
  '배경 8종',
  '업적 도감',
  '보금자리',
]

/** 이 레벨까지는 기획 검수가 끝났다. 뒤는 「검수 중」 */
const REVIEWED_UPTO = 12

const SEEDS: LevelSeed[] = UNLOCKS.map((unlock, i) => ({
  lv: i + 1,
  need: 100 + i * 120 + i * i * 18,
  gem: 20 + i * 10,
  unlock,
  status: i + 1 <= REVIEWED_UPTO ? '적용' : '검수 중',
}))

export const allLevels = (): Level[] => withTotals(SEEDS)
