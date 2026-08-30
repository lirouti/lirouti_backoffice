/**
 * 회원 목 데이터. 디자인 원본 `USERS` 12행을 값 그대로 옮겼다.
 *
 * 원본 행은 `[닉, 이메일, 소셜, 상태, 파란보석, 노란보석, 누적결제, 인증, 가입, 마지막접속, …]` 이다.
 */
import type { Social, User, UserStatus } from '@/domain/user'

type Row = [
  nick: string,
  email: string,
  social: '카카오' | '구글',
  status: '정상' | '제재' | '휴면' | '탈퇴',
  gem: number,
  topaz: number,
  paid: number,
  certs: number,
  joinedAt: string,
  lastSeenAt: string,
]

const ROWS: Row[] = [
  ['소이', 'soi@kakao.com', '카카오', '정상', 1840, 320, 62000, 148, '2026-01-14', '2026-08-13'],
  ['하루뭉치', 'haru.m@gmail.com', '구글', '정상', 420, 1180, 12100, 96, '2026-02-03', '2026-08-14'],
  ['도토리', 'dotori@kakao.com', '카카오', '정상', 60, 2450, 0, 213, '2025-11-28', '2026-08-14'],
  ['민트초코', 'mint@gmail.com', '구글', '제재', 980, 140, 33000, 41, '2026-03-19', '2026-08-09'],
  ['새벽러너', 'dawn@kakao.com', '카카오', '정상', 3200, 810, 121000, 302, '2025-09-02', '2026-08-14'],
  ['콩순이', 'kong@kakao.com', '카카오', '휴면', 15, 90, 1100, 8, '2026-05-21', '2026-06-02'],
  ['밤톨', 'bamtol@gmail.com', '구글', '정상', 640, 1520, 22000, 174, '2026-01-30', '2026-08-13'],
  ['라온', 'raon@kakao.com', '카카오', '탈퇴', 0, 0, 5500, 27, '2025-12-11', '2026-07-30'],
  ['모카', 'mocha@gmail.com', '구글', '정상', 210, 470, 3300, 55, '2026-04-08', '2026-08-12'],
  ['버들', 'beodeul@kakao.com', '카카오', '정상', 1120, 2010, 44000, 231, '2025-10-17', '2026-08-14'],
  ['풀잎', 'pullip@gmail.com', '구글', '탈퇴', 0, 0, 0, 12, '2026-06-01', '2026-07-14'],
  ['해든', 'haeden@kakao.com', '카카오', '정상', 75, 660, 1100, 89, '2026-02-25', '2026-08-14'],
]

const SOCIAL: Record<Row[2], Social> = { 카카오: 'KAKAO', 구글: 'GOOGLE' }
const STATUS: Record<Row[3], UserStatus> = {
  정상: 'ACTIVE',
  제재: 'BANNED',
  휴면: 'DORMANT',
  탈퇴: 'LEFT',
}

let cache: User[] | null = null

export function allUsers(): User[] {
  if (cache) return cache
  cache = ROWS.map(([nick, email, social, status, gem, topaz, paid, certs, joinedAt, lastSeenAt], i) => ({
    key: i,
    uid: `U-${10240 + i}`,
    nick,
    email,
    social: SOCIAL[social],
    status: STATUS[status],
    wallet: { gem, topaz },
    paid,
    certs,
    joinedAt,
    lastSeenAt,
    // 탈퇴 계정만 탈퇴일을 갖는다 — 마지막 접속을 그날로 본다.
    leftAt: STATUS[status] === 'LEFT' ? lastSeenAt : '',
  }))
  return cache
}

/** 제재를 걸거나 푼다. 상태 판정은 도메인(`nextBanStatus`)이 하고 여기는 반영만 한다 */
export function setUserStatus(key: number, status: UserStatus): User {
  const list = allUsers()
  const at = list.findIndex((u) => u.key === key)
  if (at < 0) throw new Error(`회원이 없습니다: ${key}`)
  const next: User = { ...list[at]!, status }
  list[at] = next
  return next
}
