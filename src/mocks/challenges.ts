/** 챌린지 목 데이터. 원본 `build()` 의 일상/주간/시즌 × 6개 구성을 유지한다. */
import { rng } from '@/shared/lib/rng'

import type { Challenge, ChallengeKind } from '@/domain/challenge'
import { SLOT_ORDER, type Slot } from '@/domain/item'

import { ASSETS } from './assetTable'

const CONDITIONS = [
  '출석',
  '착용 변경',
  '챌린지 달성',
  '젬 사용',
  '이모티콘 사용',
  '친구 초대',
  '도감 수집',
  '배경 변경',
]

const TITLES: Record<ChallengeKind, string[]> = {
  DAILY: ['오늘 출석하기', '옷 갈아입히기', '이모티콘 보내기', '배경 바꾸기', '먹이 주기', '산책 나가기'],
  WEEKLY: ['7일 연속 출석', '아이템 3개 착용', '친구 2명 초대', '챌린지 10회 달성', '젬 300개 사용', '도감 5칸 채우기'],
  SEASON: ['시즌 도감 완성', '유료 의상 수집', '30일 개근', '전 배경 해금', '업적 8개 달성', '레벨 20 도달'],
}

const PERIOD: Record<ChallengeKind, string> = {
  DAILY: '매일 05:00 초기화',
  WEEKLY: '월 05:00 ~ 일 24:00',
  SEASON: '08-01 ~ 09-30',
}

const REPEAT: Record<ChallengeKind, string> = { DAILY: '매일', WEEKLY: '매주', SEASON: '없음' }

const KINDS: ChallengeKind[] = ['DAILY', 'WEEKLY', 'SEASON']

let cache: Challenge[] | null = null

export function allChallenges(): Challenge[] {
  if (cache) return cache

  const out: Challenge[] = []
  KINDS.forEach((kind, ki) => {
    TITLES[kind].forEach((title, i) => {
      const r = rng(ki * 10 + i + 3)
      const rate = Math.round(18 + r() * 74)
      const status = r() < 0.15 ? 'ENDED' : r() < 0.12 ? 'SCHEDULED' : 'ACTIVE'
      const gem = kind === 'DAILY' ? 10 + i * 5 : kind === 'WEEKLY' ? 80 + i * 20 : 400 + i * 100

      // 시즌 챌린지와 3의 배수 인덱스에만 보상 아이템이 붙는다 (원본 규칙)
      const slot: Slot = SLOT_ORDER[i % 4]!
      const hasItem = kind === 'SEASON' || i % 3 === 0
      const row = hasItem ? ASSETS[slot][(i * 3) % 9] : undefined

      out.push({
        key: out.length,
        code: `CH-${2001 + out.length}`,
        kind,
        title,
        cond: CONDITIONS[(ki + i) % 8]!,
        goal: kind === 'DAILY' ? 1 + (i % 3) : kind === 'WEEKLY' ? 5 + i * 2 : 10 + i * 5,
        gem,
        rate,
        status,
        period: PERIOD[kind],
        repeat: REPEAT[kind],
        target: '전체 유저',
        desc: `${title} 챌린지입니다. 달성 시 보상이 즉시 지급됩니다.`,
        rewardItem: row ? { assetId: row.assetId, name: row.name, slot } : null,
      })
    })
  })

  cache = out
  return out
}
