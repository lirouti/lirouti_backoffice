/** 감사 로그 엔티티. */
import type { ScreenId } from '../screens'

/**
 * 조작 종류.
 *
 * ⚠️ **여기 없는 조작은 기록으로 남지 않는다.** 새 조작을 만들면 이 목록과
 *    `AUDIT_CATEGORY`·`RISKY_KINDS` 를 함께 손대야 한다 (docs/ARCHITECTURE.md §32.2).
 */
export type AuditKind =
  | '환불'
  | '재화 지급'
  | '재화 회수'
  | '결제 재처리'
  | '계정 제재'
  | '숨김 해제'
  | '숨김 유지'
  | '권한 변경'
  | '관리자 초대'
  | '쿠폰 발급'
  | '코드 값 추가'
  | '아이템 수정'
  | '챌린지 수정'
  | '업적 수정'
  | '배경 수정'

/**
 * **무엇에 관한 조작인가.** 민감도(`isRisky`)와는 다른 축이다 — 쿠폰 발급은 재화를
 * 다루지만 민감 조작은 아니다 (docs/ARCHITECTURE.md §32.2).
 */
export type AuditCategory = '재화 · 결제' | '회원 · 신고' | '권한' | '콘텐츠'

export type AuditLog = {
  /** `log_88410`. **서버가 붙인다** — 화면의 줄 번호로 만들면 필터마다 달라진다 */
  logId: string
  /** `YYYY-MM-DD HH:mm` */
  at: string
  /** 조작한 관리자 이름 */
  by: string
  /** 그때의 역할. **지금 역할이 아니다** — 기록은 당시를 남긴다 */
  role: '최고 관리자' | '운영자'
  kind: AuditKind
  /** 무엇에 대해 했는가 (`ord_20260814_9921 · 소이`) */
  target: string
  /** 증감 표시(`-12,100원`). **`''` 는 「수치로 잴 것이 없다」** — 0 이 아니다 */
  delta: string
  why: string
  /** 조작한 곳의 IP */
  ip: string
  /** 무엇이 바뀌었는가 (`결제 상태`) */
  field: string
  from: string
  to: string
  /**
   * 조작이 일어난 화면. 상세의 「대상 화면으로 이동」 이 쓴다.
   *
   * ⚠️ **필수다.** 원본은 5건을 비워 뒀는데 그건 그때 그 화면이 없었기 때문이고,
   *    지금은 15건 전부 갈 곳이 있다. **옵셔널로 두면 아무도 안 지나는 분기가 생겨
   *    테스트로 고정할 수 없다** — 갈 곳 없는 기록이 실제로 생기면 그때 연다.
   */
  screen: ScreenId
}
