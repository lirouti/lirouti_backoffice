/**
 * 푸시 알림 목 데이터. 원본 `PUSHES` 8행을 옮겼다.
 *
 * ⚠️ **대상 수는 원본 값을 안 쓴다.** 원본은 마케팅 푸시에도 41,200(전체)을 적어
 *    뒀는데, 같은 파일의 작성 화면은 마케팅 동의를 28,600명(69%)으로 센다.
 *    목록과 작성 화면이 같은 것을 다르게 말하므로 **동의를 거른 수로 다시 냈다**
 *    (docs/ARCHITECTURE.md §26.3).
 */
import { daysAgo } from '@/shared/lib/today'

import { reachOf, type Push, type PushAudience, type PushConsent, type PushKind, type PushLink, type PushStatus } from '@/domain/push'

/** 서버가 집계해 주는 수신 동의 모수. 원본의 41,200 / 38,940 / 28,600 그대로 */
const CONSENT: PushConsent = {
  all: 41_200,
  push: 38_940,
  marketing: 28_600,
  byAudience: {
    전체: 38_940,
    '30일 내 접속': 27_310,
    '미인증 회원': 18_400,
    '휴면 회원': 6_200,
  },
}

export const pushConsent = (): PushConsent => CONSENT

type Row = [
  title: string,
  body: string,
  kind: PushKind,
  audience: PushAudience,
  link: PushLink,
  /** 며칠 전인가. 음수면 앞으로 */
  ago: number,
  /** `HH:mm` */
  time: string,
  status: PushStatus,
  by: string,
  /** 도달률. 대상 중 실제로 단말에 닿은 비율 */
  reachRate: number,
  /** 열림률. 도달 중 연 비율 */
  openRate: number,
]

const ROWS: Row[] = [
  ['여름 이벤트가 시작됐어요', '8월 한 달간 출석만 해도 노란보석을 드려요', 'marketing', '전체', '상점', 30, '10:00', '발송 완료', '박서준', 0.967, 0.306],
  ['8/14 점검 안내', '오늘 02시부터 04시까지 접속이 어렵습니다', 'service', '전체', '앱 열기', 1, '18:00', '발송 완료', '김하늘', 0.993, 0.598],
  ['오늘의 루틴 잊지 않으셨죠?', '아직 인증하지 않은 루틴이 있어요', 'routine', '미인증 회원', '오늘의 루틴', -1, '20:00', '예약', '시스템', 0, 0],
  ['새 의상이 도착했어요', '성좌 세트를 상점에서 만나보세요', 'marketing', '30일 내 접속', '상점', 4, '12:00', '발송 완료', '최지우', 0.955, 0.224],
  ['문의 답변이 등록됐어요', '1:1 문의에 답변이 달렸습니다', 'service', '직접 지정', '1:1 문의', 0, '09:41', '발송 완료', '정민재', 1, 1],
  ['돌아오셨으면 좋겠어요', '2주 만에 루티가 기다리고 있어요', 'marketing', '휴면 회원', '내 캐릭터', 6, '11:00', '발송 완료', '박서준', 0.674, 0.124],
  ['주간 리포트가 나왔어요', '지난주 성과를 확인해 보세요', 'service', '전체', '월간 리포트', 3, '09:00', '발송 완료', '시스템', 0.986, 0.378],
  ['가을 시즌 사전 안내', '9월 시즌 4가 열립니다', 'marketing', '전체', '앱 열기', -6, '10:00', '예약', '박서준', 0, 0],
]

/** 「직접 지정」 한 건은 한 명에게만 갔다 — 원본의 1/1/1 행 */
const DIRECT_IDS = 'U-10240'

const PUSHES: Push[] = ROWS.map(
  ([title, body, kind, audience, link, ago, time, status, by, reachRate, openRate], key) => {
    // 대상은 도메인 규칙으로 낸다 — 작성 화면의 「예상 대상」 과 같은 함수다.
    const targeted = reachOf(
      { kind, title, body, link, audience, ids: DIRECT_IDS, now: true, at: '' },
      CONSENT,
    )
    const delivered = status === '발송 완료' ? Math.round(targeted * reachRate) : 0
    return {
      key,
      title,
      body,
      kind,
      audience,
      link,
      targeted,
      delivered,
      opened: Math.round(delivered * openRate),
      at: `${daysAgo(ago)} ${time}`,
      status,
      by,
    }
  },
)

export const allPushes = (): Push[] => PUSHES

/**
 * 발송 후 12시간의 시간대별 열림. 원본 시리즈 그대로.
 *
 * ⚠️ **비율이 아니라 건수다.** 합이 그 푸시의 `opened` 와 맞아야 한다.
 */
const HOUR_SHAPE = [42, 96, 68, 44, 31, 24, 19, 22, 16, 12, 9, 7]

/** 시간대별 열림 건수. 합은 `opened` 와 정확히 같다 */
export function openedByHour(p: Push): number[] {
  const total = HOUR_SHAPE.reduce((a, b) => a + b, 0)
  const out = HOUR_SHAPE.map((v) => Math.floor((p.opened * v) / total))
  // 반올림에서 흘린 만큼을 첫 칸에 얹는다 — 합이 `opened` 와 어긋나면 안 된다.
  out[0] = (out[0] ?? 0) + (p.opened - out.reduce((a, b) => a + b, 0))
  return out
}

let nextKey = PUSHES.length

/** 예약을 취소한다. 없는 key 면 `undefined` */
export function cancelPush(key: number): Push | undefined {
  const found = PUSHES.find((p) => p.key === key)
  if (!found) return undefined
  found.status = '취소'
  return found
}

/** 새 알림을 목록 맨 앞에 쌓는다 */
export function addPush(p: Omit<Push, 'key'>): Push {
  const row: Push = { ...p, key: nextKey }
  nextKey += 1
  PUSHES.unshift(row)
  return row
}
