/**
 * 운영 목 데이터. 원본 `noticeRows` 6행 · `EV` 6건 · `grantRows` 10행을 옮겼다.
 *
 * ⚠️ **날짜는 오늘 기준으로 만든다.** 원본처럼 `08-01` 을 박아 두면 시간이 지나면서
 *    전부 「종료」 가 된다 (docs/ARCHITECTURE.md §21.3).
 */
import { daysAgo } from '@/shared/lib/today'

import type {
  EventInput,
  GrantAsset,
  GrantInput,
  GrantKind,
  GrantLog,
  Notice,
  NoticeCategory,
  NoticeInput,
  OpsEvent,
} from '@/domain/ops'

import { allItems } from './items'

type NoticeRow = [
  title: string,
  body: string,
  category: NoticeCategory,
  /** 시작이 며칠 전인가. 음수면 앞으로 */
  from: number,
  /** 종료가 며칠 전인가 */
  to: number,
  views: number,
  pinned: boolean,
]

const NOTICES: NoticeRow[] = [
  ['시즌 3 오픈 안내', '새 시즌의 주요 변경 내용을 안내합니다.', '시즌', 12, -1, 24180, true],
  ['8월 정기 점검 안내', '안정적인 서비스를 위해 정기 점검을 진행합니다.', '점검', 1, 0, 8420, true],
  ['이모티콘 12종 추가', '새로운 이모티콘을 만나 보세요.', '업데이트', 16, -2, 15330, false],
  ['보금자리 해금 조건 변경', '해금 조건이 조정되었습니다.', '밸런스', 24, 10, 9180, false],
  // 아직 게시 전이라 조회수가 0 이다 — 화면은 이것을 「—」 로 그린다.
  ['젬 상품 가격 조정', '상품 구성과 가격이 변경됩니다.', '재화', -2, -16, 0, false],
  ['친구 초대 보상 개편', '초대 단계별 보상을 개편했습니다.', '업데이트', 34, 20, 11240, false],
]

const ADDED_NOTICES: Notice[] = []
let nextNoticeKey = NOTICES.length

type ValidNoticeInput = Omit<NoticeInput, 'category'> & { category: NoticeCategory }

export const allNotices = (): Notice[] => [
  ...ADDED_NOTICES,
  ...NOTICES.map(([title, body, category, from, to, views, pinned], key) => ({
    key,
    title,
    body,
    category,
    startAt: daysAgo(from),
    endAt: daysAgo(to),
    views,
    pinned,
  })),
]

/** 작성한 공지를 목록 앞에 쌓는다 */
export function addNotice(input: ValidNoticeInput): Notice {
  const notice: Notice = {
    ...input,
    key: nextNoticeKey,
    title: input.title.trim(),
    body: input.body.trim(),
    views: 0,
  }
  nextNoticeKey += 1
  ADDED_NOTICES.unshift(notice)
  return notice
}

/** 테스트 사이에 목 저장소가 새지 않게 초기화한다 */
export function resetNotices(): void {
  ADDED_NOTICES.splice(0)
  nextNoticeKey = NOTICES.length
}

type EventRow = [
  title: string,
  desc: string,
  from: number,
  /** 종료가 며칠 전인가. `null` 이면 상시 */
  to: number | null,
  /** 카드 왼쪽 띠. **장식 전용** (§25.2) */
  accent: string,
  /** 보상 아이템 `key` */
  rewardItemKey: number,
  joined: number,
]

const EVENTS: EventRow[] = [
  ['별빛 축제', '성좌 세트를 모으는 시즌 이벤트', 12, -18, '#2F7CEF', 6, 8400],
  ['여름 바다 주간', '바다 배경과 튜브를 해금합니다', 8, -5, '#1FB8A6', 8, 9410],
  ['마법 도서관', '마도서를 모으는 수집 이벤트', 3, -11, '#7C5CD6', 10, 10420],
  ['왕실 초대', '왕실 세트 한정 판매', -7, -21, '#D9A227', 9, 0],
  ['첫 부화 축하', '신규 유저 대상 상시 이벤트', 120, null, '#3FB27F', 0, 12440],
  ['가을 낙엽길', '가을 배경 사전 공개', -19, -32, '#E08A50', 3, 0],
]

const ADDED_EVENTS: OpsEvent[] = []
let nextEventKey = EVENTS.length

export const allEvents = (): OpsEvent[] => [
  ...ADDED_EVENTS,
  ...EVENTS.map(([title, desc, from, to, accent, rewardItemKey, joined], key) => ({
    key,
    title,
    desc,
    startAt: daysAgo(from),
    endAt: to === null ? '' : daysAgo(to),
    accent,
    rewardItemKey,
    joined,
  })),
]

/** 만든 이벤트를 목록 앞에 쌓는다 */
export function addEvent(input: EventInput & { rewardItemKey: number }): OpsEvent {
  const event: OpsEvent = {
    ...input,
    key: nextEventKey,
    title: input.title.trim(),
    desc: input.desc.trim(),
    accent: input.accent.toUpperCase(),
    joined: 0,
  }
  nextEventKey += 1
  ADDED_EVENTS.unshift(event)
  return event
}

/** 테스트 사이에 이벤트 목 저장소가 새지 않게 초기화한다 */
export function resetEvents(): void {
  ADDED_EVENTS.splice(0)
  nextEventKey = EVENTS.length
}

const WHYS = ['서버 점검 보상', '시즌 오픈 기념', '오류 지급 회수', 'CS 보상', '이벤트 미지급 보정']
const BYS = ['김운영', '박라이브', '이CS']

/**
 * 처리 이력. **새 처리가 앞에 쌓인다** — 모듈 캐시라 새로고침하면 사라진다.
 */
const LOGS: GrantLog[] = Array.from({ length: 10 }, (_, i) => {
  const give = i % 4 !== 2
  const coin = i % 3 === 0
  const item = allItems()[(i * 5) % allItems().length]!
  /**
   * ⚠️ **파란보석과 노란보석은 서로 다른 재화다** — 이름이 바뀐 것이 아니다
   * (`Wallet.gem` · `Wallet.topaz`). 이력에 둘 다 나와야 화면이 둘을 구분해
   * 그리는지 확인할 수 있다.
   */
  const asset: GrantAsset = coin ? (i % 2 === 0 ? '파란보석' : '노란보석') : '아이템'
  return {
    key: i,
    at: `${daysAgo(Math.floor(i / 2))} ${String(10 + (i % 9)).padStart(2, '0')}:0${i % 6}`,
    kind: (give ? '지급' : '회수') as GrantKind,
    asset,
    what: coin ? asset : item.name,
    qty: coin ? 100 * (1 + i) : 1,
    who: i % 2 ? '전체 유저' : `U-${10200 + i * 13}`,
    why: WHYS[i % WHYS.length]!,
    by: BYS[i % BYS.length]!,
  }
})

export const allGrantLogs = (): GrantLog[] => LOGS

let nextKey = LOGS.length

/** 처리 한 건을 이력 맨 앞에 쌓는다 */
export function addGrantLog(input: GrantInput, targetLabel: string, by: string): GrantLog {
  const item = input.itemKey === null ? undefined : allItems().find((it) => it.key === input.itemKey)
  const row: GrantLog = {
    key: nextKey,
    // 목이라 초 단위가 없다. 서버는 처리 시각을 자기가 찍는다.
    at: `${daysAgo(0)} 00:00`,
    kind: input.kind,
    asset: input.asset,
    what: input.asset === '아이템' ? (item?.name ?? '아이템') : input.asset,
    qty: input.asset === '아이템' ? 1 : input.qty,
    who: targetLabel,
    why: input.why.trim(),
    by,
  }
  nextKey += 1
  LOGS.unshift(row)
  return row
}
