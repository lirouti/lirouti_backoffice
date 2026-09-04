import type { Kpi, SeriesPoint } from '@/domain/dashboard'

/** 디자인 원본의 KPI 6종 */
export const KPIS: Kpi[] = [
  { label: 'DAU', value: '24,180', delta: '+6.2%', direction: 'up', note: '전주 대비' },
  { label: '신규 부화', value: '1,342', delta: '+11.4%', direction: 'up', note: '전주 대비' },
  {
    label: '챌린지 달성률',
    value: '68.4%',
    delta: '+2.1%p',
    direction: 'up',
    note: '전주 대비',
  },
  { label: '젬 소비', value: '8.4M', delta: '-3.5%', direction: 'down', note: '전주 대비' },
  {
    label: '아이템 판매',
    value: '2,916건',
    delta: '+14.8%',
    direction: 'up',
    note: '전주 대비',
  },
  {
    label: '평균 접속',
    value: '18분 42초',
    delta: '+1분 07초',
    direction: 'up',
    note: '전주 대비',
  },
]

/** 최근 14일 DAU (천 명). 원본 폴리라인 좌표에서 역산한 값. */
export const DAU_SERIES = [
  42.1, 46.1, 44.1, 51.1, 55.1, 53.1, 62.1, 59.1, 67.1, 72.1, 70.1, 78.1, 83.1, 90.0,
]

export const DAU_DOMAIN: [number, number] = [30, 90]
export const DAU_TICKS = [90, 75, 60, 45, 30]

/** 주간 젬 유입 · 소비 (백만) */
export const GEM_FLOW: SeriesPoint[] = [
  { label: '1주', a: 6.2, b: 3.8 },
  { label: '2주', a: 7.0, b: 4.4 },
  { label: '3주', a: 5.8, b: 5.2 },
  { label: '4주', a: 8.1, b: 4.9 },
  { label: '5주', a: 7.6, b: 6.1 },
  { label: '6주', a: 8.8, b: 5.7 },
  { label: '7주', a: 9.5, b: 7.2 },
]

export const GEM_FLOW_MAX = 10
