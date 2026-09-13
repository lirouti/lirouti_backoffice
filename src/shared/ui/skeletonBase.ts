/**
 * 스켈레톤 막대의 바탕 — **맞춤 모양을 만들 때 쓰는 조각 둘.**
 *
 * `Skeleton.tsx` 의 컴포넌트로 덮이지 않는 자리가 있다 (아이템 들여다보기 창처럼 그
 * 화면에만 있는 배치). 그렇다고 막대를 손으로 다시 그리면 `prefers-reduced-motion` 과
 * 맥동이 갈린다 — 그래서 바탕만 여기서 나눠 준다.
 *
 * ⚠️ **`Skeleton.tsx` 에 두지 않는 이유는 fast refresh 다.** react-refresh 는 **파일에
 *    컴포넌트가 아닌 export 가 하나라도 있으면 그 파일의 핫 교체를 통째로 포기한다** —
 *    `Skeleton.tsx` 는 손대는 일이 잦은 공용 파일이라 매번 새로고침이 된다.
 */
import { css } from 'styled-system/css'

/**
 * 회색 막대.
 *
 * ⚠️ **`prefers-reduced-motion` 을 존중한다.** 스켈레톤은 이제 화면을 통째로 채울 수
 *    있어서, 전정기관이 예민한 사람에게 **넓은 면적이 맥동하는 것**은 작은 막대 몇 개와
 *    전혀 다른 경험이다. 자동 접근성 검사는 이걸 보지 않으므로 여기서 지킬 수밖에 없다.
 */
export const skeletonBar = css({
  borderRadius: '5px',
  bg: 'surf2',
  // ⚠️ **고정 px 너비를 주는 자리가 있다**(`SkeletonPage` 의 제목 180 · 부제 320).
  //    담는 칸이 그보다 좁으면 **페이지가 가로로 스크롤된다** — 실제로 200px 컨테이너에서
  //    scrollWidth 320 > clientWidth 200 이 났다. 퍼센트 막대는 저절로 줄지만 px 은 안 준다.
  maxWidth: '100%',
  animation: 'rvPulse 1.8s ease-in-out infinite',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

/**
 * 스크린리더에게 「오는 중」임을 알리는 껍데기.
 *
 * ⚠️ **막대 자체는 읽히면 안 된다.** 빈 `div` 수십 개를 읽어 주는 것은 소음이라
 *    안쪽 전부가 `aria-hidden` 이고, 상태는 이 한 줄로만 말한다.
 *
 * ⚠️ **빼먹지 말 것.** 막대만 늘어놓으면 스크린리더에게는 화면이 **빈 채로 멈춘 것**과
 *    구분되지 않는다.
 */
export const skeletonRegion = (silent: boolean) =>
  silent
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'status', 'aria-label': '불러오는 중' } as const)
