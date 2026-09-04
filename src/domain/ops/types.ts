/**
 * 운영 — 공지 · 이벤트 · 지급/회수.
 *
 * 셋 다 **운영자가 게임 밖에서 게임 안을 건드리는** 수단이다. 공지·이벤트는 기간이
 * 지나면 저절로 끝나지만, **지급·회수는 되돌릴 수 없다.**
 */

/**
 * 기간제 게시물의 상태. 공지와 이벤트가 같이 쓴다.
 *
 * ⚠️ **저장하는 값이 아니라 날짜에서 나오는 값이다.** 손으로 들고 있으면 기간이 지나도
 *    「게시중」 인 채로 남는다 (docs/ARCHITECTURE.md §25.1).
 */
export type PeriodStatus = 'ACTIVE' | 'SCHEDULED' | 'ENDED'

/** 공지 분류. 앱의 공지 탭이 이 값으로 거른다 */
export type NoticeCategory = '시즌' | '점검' | '업데이트' | '밸런스' | '재화'

/** 운영자가 작성하는 공지. `key`·조회수는 서버가 정한다 */
export type NoticeInput = {
  title: string
  body: string
  /** 빈 문자열은 아직 고르지 않았음 */
  category: NoticeCategory | ''
  /** `YYYY-MM-DD` */
  startAt: string
  /** `YYYY-MM-DD`. 비우면 상시 */
  endAt: string
  pinned: boolean
}

export type Notice = {
  key: number
  title: string
  /** 앱에 그대로 보여 줄 본문 */
  body: string
  category: NoticeCategory
  /** `YYYY-MM-DD` */
  startAt: string
  /** `YYYY-MM-DD`. 비어 있으면 상시 */
  endAt: string
  /**
   * 조회수. **아직 게시 전이면 `0`** 이고, 화면은 그것을 「—」 로 그린다 —
   * 0 을 그대로 찍으면 "아무도 안 봤다" 로 읽힌다.
   */
  views: number
  /** 앱 공지 목록 맨 위에 붙는가 */
  pinned: boolean
}

/** 운영자가 만드는 이벤트. `key`·참여자 수는 서버가 정한다 */
export type EventInput = {
  title: string
  /** 카드에 그대로 보여 줄 한 줄 설명 */
  desc: string
  /** `YYYY-MM-DD` */
  startAt: string
  /** `YYYY-MM-DD`. 비우면 상시 */
  endAt: string
  /** 카드 장식 색. `#RRGGBB` */
  accent: string
  /** 보상 아이템 `key`. 아직 고르지 않았으면 `null` */
  rewardItemKey: number | null
}

export type OpsEvent = {
  key: number
  title: string
  /** 한 줄 설명. 카드에 그대로 찍는다 */
  desc: string
  /** `YYYY-MM-DD` */
  startAt: string
  /** `YYYY-MM-DD`. **비어 있으면 상시** — 끝나지 않는 이벤트다 */
  endAt: string
  /**
   * 카드 왼쪽 띠 색. `#RRGGBB`.
   *
   * ⚠️ **장식 전용이다. 글자 색으로 쓰지 말 것** — 기획이 넣는 값이라
   *    `check-contrast.ts` 가 못 본다 (docs/ARCHITECTURE.md §25.2).
   */
  accent: string
  /** 보상으로 주는 아이템. `Item['key']` */
  rewardItemKey: number
  /** 참여자 수. 시작 전이면 0 */
  joined: number
}

/** 준 것인가 걷은 것인가 */
export type GrantKind = '지급' | '회수'

/** 누구에게 */
export type GrantTarget = '개별' | '전체'

/** 무엇을 */
export type GrantAsset = '파란보석' | '노란보석' | '아이템'

/** 운영자가 채우는 값 */
export type GrantInput = {
  kind: GrantKind
  target: GrantTarget
  /** 「개별」 일 때 쉼표로 적은 회원 uid. 「전체」 면 무시한다 */
  who: string
  asset: GrantAsset
  /** 재화 수량. 아이템이면 무시한다 */
  qty: number
  /** 아이템일 때 `Item['key']`. 안 골랐으면 `null` */
  itemKey: number | null
  /**
   * 사유. **필수다** — 되돌릴 수 없는 처리라 나중에 "왜 줬나" 를 답할 수 있어야 한다.
   */
  why: string
}

/** 처리 이력 한 줄 */
export type GrantLog = {
  key: number
  /** `YYYY-MM-DD HH:mm` */
  at: string
  kind: GrantKind
  /**
   * 재화인가 아이템인가.
   *
   * ⚠️ **이름(`what`)으로 판별하지 말 것.** 아이템 이름이 「파란보석 상자」 일 수도 있고,
   *    아이템 이름이 바뀌면 지난 이력의 종류까지 달라진다.
   */
  asset: GrantAsset
  /** 「파란보석」 또는 아이템 이름. 화면에 그대로 찍는다 */
  what: string
  /** 재화면 수량, 아이템이면 1 */
  qty: number
  /** 「전체 유저」 또는 `U-10240` */
  who: string
  why: string
  /** 처리한 관리자 이름 */
  by: string
}
