/**
 * 사이드바 배지용 신고 집계. **파사드 본체와 분리된 이유는 번들이다.**
 *
 * ⚠️ **`./moderation` 을 정적으로 import 하면 안 된다.** 이 훅을 부르는 셸(`app/AdminShell`)은
 *    eager 라, 정적으로 걸면 신고 파사드와 목 데이터가 통째로 엔트리 청크에 들어간다 —
 *    **로그인 화면에서도 받게 된다.**
 *
 * 재 본 값 (첫 로드 gzip, docs/ARCHITECTURE.md §9.4):
 *
 * | | |
 * |---|---|
 * | 배지 없음 | 159.02KB |
 * | 정적 import | 164.50KB (+5.48) |
 * | 동적 import | 161.25KB (+2.23) |
 *
 * 남은 2.23KB 는 `useQuery` 자체다 — 셸이 쿼리를 구독하는 값이라 뺄 수 없다. 목 데이터와
 * 파사드(3.25KB)만 뒤로 미룬다. **배지는 첫 페인트에 필요한 값이 아니다.**
 */
import { useQuery } from '@tanstack/react-query'

import { qk } from './core'

/**
 * 지금 사람을 기다리는 신고 건수 (기준 초과 & 미검토).
 *
 * **목록 조회와 같은 쿼리 키를 쓴다.** 그래서 ① 신고 화면을 열면 셸이 이미 받아 둔 것을
 * 그대로 쓰고, ② 한 건을 처리하면 무효화 한 번으로 배지와 목록이 같이 갱신된다 —
 * 둘이 어긋날 수 있는 경로가 없다.
 *
 * @param enabled 이 사람이 모더레이션을 볼 수 있는가. **끄면 아예 부르지 않는다** —
 *   권한 없는 관리자에게까지 신고를 내려받게 할 이유가 없다.
 */
export function useUrgentReportCount(enabled: boolean): number {
  const { data } = useQuery({
    queryKey: qk.moderation.reports(),
    queryFn: () => import('./moderation').then((m) => m.getReports()),
    enabled,
  })
  return data?.summary.urgent ?? 0
}
