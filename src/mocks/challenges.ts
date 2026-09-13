/** 챌린지 목 데이터. 원본 `build()` 의 일상/주간/시즌 × 6개 구성을 유지한다. */
import { rng } from '@/shared/lib/rng'

import {
  type ChallengeReward,
  CHALLENGE_CONDS,
  type Challenge,
  type ChallengeInput,
  type ChallengeKind,
} from '@/domain/challenge'
import { SLOT_ORDER, type Slot } from '@/domain/item'

import { allItems } from './items'

const TITLES: Record<ChallengeKind, string[]> = {
  DAILY: [
    '오늘 출석하기',
    '옷 갈아입히기',
    '이모티콘 보내기',
    '배경 바꾸기',
    '먹이 주기',
    '산책 나가기',
  ],
  WEEKLY: [
    '7일 연속 출석',
    '아이템 3개 착용',
    '친구 2명 초대',
    '챌린지 10회 달성',
    '젬 300개 사용',
    '도감 5칸 채우기',
  ],
  SEASON: [
    '시즌 도감 완성',
    '유료 의상 수집',
    '30일 개근',
    '전 배경 해금',
    '업적 8개 달성',
    '레벨 20 도달',
  ],
}

/**
 * 운영 기간. 일상·주간은 상시라 비워 둔다 — 「제한 없음」 이다.
 * 시즌만 원본의 `08-01 ~ 09-30` 을 그대로 쓴다.
 */
const WINDOW: Record<ChallengeKind, { startAt: string; endAt: string }> = {
  DAILY: { startAt: '', endAt: '' },
  WEEKLY: { startAt: '', endAt: '' },
  SEASON: { startAt: '2026-08-01', endAt: '2026-09-30' },
}

const KINDS: ChallengeKind[] = ['DAILY', 'WEEKLY', 'SEASON']

/**
 * 보상 아이템을 고를 때 훑는 자리 수. **원본 규칙의 `% 9` 를 그대로 둔다** —
 * 슬롯마다 아이템이 10개 이상이라 항상 있는 자리다.
 */
const PICKS = 9

let cache: Challenge[] | null = null

export function allChallenges(): Challenge[] {
  if (cache) return cache

  const out: Challenge[] = []
  KINDS.forEach((kind, ki) => {
    TITLES[kind].forEach((title, i) => {
      const r = rng(ki * 10 + i + 3)
      const rate = Math.round(18 + r() * 74)
      const status = r() < 0.15 ? 'ENDED' : r() < 0.12 ? 'SCHEDULED' : 'ACTIVE'
      const gem =
        kind === 'DAILY' ? 10 + i * 5 : kind === 'WEEKLY' ? 80 + i * 20 : 400 + i * 100

      // 시즌 챌린지와 3의 배수 인덱스에만 보상 아이템이 붙는다 (원본 규칙)
      const slot: Slot = SLOT_ORDER[i % 4]!
      const hasItem = kind === 'SEASON' || i % 3 === 0

      out.push({
        key: out.length,
        code: `CH-${2001 + out.length}`,
        kind,
        title,
        cond: CHALLENGE_CONDS[(ki + i) % 8]!,
        goal: kind === 'DAILY' ? 1 + (i % 3) : kind === 'WEEKLY' ? 5 + i * 2 : 10 + i * 5,
        gem,
        rate,
        status,
        stopped: false,
        ...WINDOW[kind],
        target: '전체 유저',
        desc: `${title} 챌린지입니다. 달성 시 보상이 즉시 지급됩니다.`,
        rewardItem: hasItem ? rewardOf(slot, (i * 3) % PICKS) : null,
      })
    })
  })

  cache = out
  return out
}

/**
 * 등록·수정을 목에 반영한다. **모듈 캐시를 직접 고친다** (`mocks/items.ts` 와 같은 방식).
 *
 * 상태는 넘겨받는다 — 기간에서 정하는 규칙(`challengeStatusOf`)이 도메인에 있고,
 * 오늘이 언제인지는 파사드가 안다.
 *
 * @param key 있으면 수정, 없으면 등록
 */
export function upsertChallenge(
  input: ChallengeInput,
  status: Challenge['status'],
  key?: number,
): Challenge {
  const list = allChallenges()

  if (key != null) {
    const at = list.findIndex((c) => c.key === key)
    if (at < 0) throw new Error(`수정할 챌린지가 없습니다: ${key}`)
    const next = { ...list[at]!, ...input, status }
    list[at] = next
    return next
  }

  const nextKey = list.reduce((max, c) => Math.max(max, c.key), -1) + 1
  const created: Challenge = {
    ...input,
    key: nextKey,
    code: `CH-${2001 + nextKey}`,
    // 아직 아무도 안 했다. 0% 를 만들지 않으면 없던 성과가 생긴다.
    rate: 0,
    status,
    stopped: false,
  }
  list.push(created)
  return created
}

/** 「중단」 — 기간이 남아 있어도 끝낸다. 사람이 내린 결정이라 되살아나지 않는다 */
export function endChallenge(key: number): Challenge {
  const list = allChallenges()
  const at = list.findIndex((c) => c.key === key)
  if (at < 0) throw new Error(`챌린지가 없습니다: ${key}`)
  // 사람이 끊은 것이라는 사실을 남긴다 — 날짜로는 되살아나지 않아야 한다.
  const next: Challenge = { ...list[at]!, status: 'ENDED', stopped: true }
  list[at] = next
  return next
}

/**
 * 일자별 달성 추이 14일치. 원본의 막대 그래프 데이터다.
 *
 * 달성률(`rate`)을 중심으로 흔들리게 만들어 마지막 값이 현재와 어울리게 끝낸다.
 */
export function trendOfChallenge(key: number, rate: number): number[] {
  const r = rng(key * 13 + 7)
  return Array.from({ length: 14 }, (_, i) => {
    const ramp = 0.6 + (i / 13) * 0.5
    return Math.max(0, Math.min(100, Math.round(rate * ramp + (r() - 0.5) * 10)))
  })
}

/**
 * 보상이 가리킬 **실제 아이템**을 고른다.
 *
 * ⚠️ **`assetId` + 이름으로 찾지 않는다.** 한때 그렇게 했는데, 그건 `ChallengeReward`
 *    가 스스로 금지하는 조회다 (docs/ARCHITECTURE.md §20.4 — 그림만 같고 가격·획득
 *    경로가 다른 아이템이 여럿일 수 있다). 게다가 `allItems()` 와 `allChallenges()` 가
 *    **둘 다 게으른 캐시**라, 챌린지가 만들어지기 전에 아이템 이름이 바뀌면 조회가
 *    빗나가 **씨앗이 붙였다고 한 보상이 조용히 사라졌다** — 실측했다: 아이템 하나를
 *    개명하니 보상 10건 중 **3건**이 날아갔다. 자리로 집으면 이름이 바뀌어도 같은
 *    아이템이다.
 *
 * 아이템은 슬롯 순서대로 만들어지므로 슬롯 안 `at` 번째가 곧 `ASSETS[slot][at]` 의 것이다.
 */
function rewardOf(slot: Slot, at: number): ChallengeReward | null {
  const item = allItems().filter((it) => it.slot === slot)[at]
  if (!item) return null
  return {
    itemKey: item.key,
    assetId: item.assetId,
    // ⚠️ **없으면 키 자체를 넣지 않는다.** `assetSrc: undefined` 로 두면 JSON 왕복에서
    //    키가 사라져 `sameShape` 의 키 개수 비교가 어긋나고, **폼 초안이 조용히 버려진다**
    //    (§33.1.1). 실측했다: 넣었더니 보상 있는 챌린지의 초안이 전부 복원에 실패했다.
    ...(item.assetSrc ? { assetSrc: item.assetSrc } : {}),
    name: item.name,
    // ⚠️ 인수로 받은 슬롯이 아니라 **아이템의 것**을 쓴다 — 둘이 갈리면 키와 슬롯이
    //    서로 다른 아이템을 가리킨다.
    slot: item.slot,
  }
}
