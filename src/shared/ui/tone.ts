/**
 * 디자인 시스템의 색조 어휘.
 *
 * `Badge.tsx` 안에 두면 도메인이 배지 tone 을 참조할 때마다 React 컴포넌트 모듈을
 * 끌어오게 된다. 어휘만 따로 떼어 순수 .ts 로 둔다.
 *
 * 각 tone 은 §3.2 의 fg/bg 토큰 쌍 하나에 대응한다.
 */
export type BadgeTone =
  | 'success' // gFg / gBg — 노출중 · 진행 · 상승
  | 'warn' // aFg / aBg — 예약 · 검수중
  | 'danger' // rFg / rBg — 회수 · 하락
  | 'purple' // pFg / pBg — 주간 챌린지
  | 'teal' // tFg / tBg — 시즌 챌린지
  | 'neutral' // nFg / nBg — 종료 · 미노출
  | 'gold' // goldFg / goldBg — 유료 등급
  | 'brand' // priD / soft — 일상 챌린지
