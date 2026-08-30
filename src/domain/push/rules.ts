/** 푸시 알림 규칙. */
import { parseUserIds } from '../user/rules'
import type { Push, PushConsent, PushFailure, PushInput, PushKind, PushStatus } from './types'

/**
 * 잠금화면에 들어가는 길이.
 *
 * ⚠️ **기기마다 다르다.** 여기 값은 「이 안쪽이면 대부분 안 잘린다」 는 선이지
 *    규격이 아니다 — 넘으면 막는 것이 아니라 잘린다고 알린다 (docs/ARCHITECTURE.md §26.1).
 */
export const PUSH_LIMITS = { title: 40, body: 90 } as const

/** 마케팅 알림을 보낼 수 없는 시간대 (21시 ~ 다음날 08시) */
export const NIGHT_FROM = 21
export const NIGHT_TO = 8

/** `YYYY-MM-DD HH:mm` 에서 시(hour). 못 읽으면 `null` */
export function hourOf(at: string): number | null {
  const m = /^\d{4}-\d{2}-\d{2} (\d{2}):\d{2}$/.exec(at)
  if (!m) return null
  const h = Number(m[1])
  return h >= 0 && h <= 23 ? h : null
}

/**
 * 이 시각에 이 종류를 보낼 수 있는가.
 *
 * ⚠️ **「지금 발송」 도 검사한다.** 원본은 예약일 때만 막아서 **밤 11시에 「지금 발송」
 *    을 누르면 그대로 나갔다.** 법이 제한하는 것은 예약 여부가 아니라 **도착 시각**이다
 *    (docs/ARCHITECTURE.md §26.2).
 *
 * @param at `YYYY-MM-DD HH:mm`. 「지금 발송」 이면 지금 시각을 넣는다
 */
export function nightBlocked(kind: PushKind, at: string): boolean {
  if (kind !== 'marketing') return false
  const h = hourOf(at)
  // 시각을 못 읽으면 막지 않는다 — 형식 오류는 `validatePush` 가 따로 말한다.
  if (h === null) return false
  return h >= NIGHT_FROM || h < NIGHT_TO
}

/**
 * 이 조건으로 몇 명에게 가는가.
 *
 * **마케팅이면 동의 비율을 곱한다.** 조건별 마케팅 동의 수는 서버가 따로 주지 않으므로
 * 전체 비율(`marketing / push`)을 적용한다.
 *
 * ⚠️ **`Math.min(대상, 마케팅동의)` 로 하면 안 된다.** 휴면 회원 6,200명에게 마케팅을
 *    보낼 때 `min(6200, 28600) = 6200` 이 되어 **동의를 하나도 안 거른 값**이 나온다.
 */
export function reachOf(input: PushInput, consent: PushConsent): number {
  const base =
    input.audience === '직접 지정'
      ? parseUserIds(input.ids).length
      : consent.byAudience[input.audience]
  if (input.kind !== 'marketing') return base
  if (consent.push === 0) return 0
  return Math.floor(base * (consent.marketing / consent.push))
}

/** 열림률 (%). **아직 안 보냈으면 `null`** — 0% 와 「아직 없음」 은 다르다 */
export function openRate(p: Push): number | null {
  if (p.delivered === 0) return null
  return Math.round((p.opened / p.delivered) * 100)
}

/** 어느 칸이 왜 막혔는가 */
export type PushErrors = Partial<Record<'title' | 'body' | 'ids' | 'at' | 'kind', string>>

/**
 * 작성 폼 검증.
 *
 * @param sendAt 실제로 도착할 시각 `YYYY-MM-DD HH:mm`. 「지금 발송」 이면 지금 시각
 */
export function validatePush(
  input: PushInput,
  consent: PushConsent,
  sendAt: string,
): PushErrors {
  const errors: PushErrors = {}

  if (!input.title.trim()) errors.title = '제목을 입력하세요.'
  else if (input.title.length > PUSH_LIMITS.title) {
    errors.title = `제목은 ${PUSH_LIMITS.title}자까지입니다.`
  }

  if (!input.body.trim()) errors.body = '본문을 입력하세요.'
  else if (input.body.length > PUSH_LIMITS.body) {
    errors.body = `본문은 ${PUSH_LIMITS.body}자까지입니다.`
  }

  if (reachOf(input, consent) === 0) {
    errors.ids =
      input.audience === '직접 지정'
        ? '보낼 회원 ID 를 입력하세요.'
        : '이 조건에 해당하는 회원이 없습니다.'
  }

  if (!input.now && hourOf(input.at) === null) {
    errors.at = '예약 시각을 `YYYY-MM-DD HH:mm` 으로 입력하세요.'
  }

  if (nightBlocked(input.kind, sendAt)) {
    errors.kind = `야간(${NIGHT_FROM}시–${NIGHT_TO}시)에는 마케팅 알림을 보낼 수 없습니다.`
  }

  return errors
}

/** 목록 탭. 종류 탭과 상태 탭이 한 줄에 섞여 있다 — 원본 그대로다 */
export const PUSH_TABS = ['전체', '예약', '발송 완료', '마케팅 알림'] as const
export type PushTab = (typeof PUSH_TABS)[number]

export function filterPushes(list: Push[], tab: PushTab, q = ''): Push[] {
  const needle = q.trim().toLowerCase()
  return list.filter((p) => {
    if (tab === '예약' && p.status !== '예약') return false
    if (tab === '발송 완료' && p.status !== '발송 완료') return false
    if (tab === '마케팅 알림' && p.kind !== 'marketing') return false
    if (needle && !p.title.toLowerCase().includes(needle)) return false
    return true
  })
}

/** 목록 위 지표 */
export type PushSummary = {
  /** 오늘 보낸 건수 */
  sentToday: number
  /** 아직 안 나간 예약 건수 */
  scheduled: number
  /**
   * 평균 열림률 (%). **보낸 것만** 센다.
   *
   * ⚠️ 건별 비율의 평균이 아니라 **합계 기준**이다 — 1명에게 보내 1명이 연 건이
   *    100% 로 평균을 끌어올리면 안 된다.
   */
  openRate: number
}

/** @param today `YYYY-MM-DD` */
export function summarizePushes(list: Push[], today: string): PushSummary {
  const sent = list.filter((p) => p.status === '발송 완료')
  const delivered = sent.reduce((sum, p) => sum + p.delivered, 0)
  return {
    sentToday: sent.filter((p) => p.at.startsWith(today)).length,
    scheduled: list.filter((p) => p.status === '예약').length,
    openRate: delivered === 0 ? 0 : Math.round((sent.reduce((s, p) => s + p.opened, 0) / delivered) * 100),
  }
}

/** 이 상태에서 예약을 취소하거나 고칠 수 있는가 */
export const canCancel = (status: PushStatus): boolean => status === '예약'

/**
 * 도달 실패 내역.
 *
 * ⚠️ **「푸시 거부」 를 넣지 않는다.** 대상(`targeted`)은 이미 푸시를 켠 사람만
 *    세었으므로, 거부를 실패로 또 세면 **두 번 빼는 것**이 된다 (§26.3).
 *    원본은 그렇게 하고 있었다.
 */
export function failuresOf(p: Push): PushFailure[] {
  const lost = p.targeted - p.delivered
  if (lost <= 0) return []
  const expired = Math.round(lost * 0.72)
  const unregistered = Math.round(lost * 0.21)
  return [
    { why: '토큰 만료', count: expired },
    { why: '기기 미등록', count: unregistered },
    // 나머지를 여기 담아 **합이 항상 `lost` 와 같게** 한다. 반올림 오차가 남으면
    // 「대상 − 도달」 과 표의 합이 어긋나 운영자가 숫자를 의심한다.
    { why: '일시 오류', count: lost - expired - unregistered },
  ]
}
