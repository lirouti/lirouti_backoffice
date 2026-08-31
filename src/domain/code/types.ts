/**
 * 공통 코드 — 드롭다운과 배지에 쓰이는 값.
 *
 * **여기서 바꾸면 그 값을 쓰는 화면에 바로 반영된다.** 그래서 지우는 것과 감추는 것을
 * 엄격히 가른다 — 이미 그 값을 가진 데이터가 있기 때문이다 (docs/ARCHITECTURE.md §29.1).
 */
import type { ScreenId } from '../screens'

/** 코드 그룹이 속한 모듈 */
export type CodeCategory =
  | '공통'
  | '고객 소통'
  | '아이템'
  | '운영'
  | '챌린지'
  | '캐릭터'
  | '재화 · 상점'
  | '성장 · 레벨'

export const CODE_CATEGORIES: CodeCategory[] = [
  '공통',
  '고객 소통',
  '아이템',
  '운영',
  '챌린지',
  '캐릭터',
  '재화 · 상점',
  '성장 · 레벨',
]

/** 배지 색. **화면이 쓰는 tone 으로 옮겨진다** (`labels.ts`) */
export type CodeTone = '파랑' | '빨강' | '노랑' | '초록' | '보라' | '회색'

export const CODE_TONES: CodeTone[] = ['파랑', '빨강', '노랑', '초록', '보라', '회색']

export type CodeValue = {
  /** `ACCOUNT` — 영문 대문자와 밑줄만. **저장된 데이터가 이 값을 그대로 들고 있다** */
  code: string
  /** 화면에 보이는 이름 */
  label: string
  tone: CodeTone
  /**
   * 이 값을 쓰고 있는 데이터 건수.
   *
   * ⚠️ **0 이 아니면 지울 수 없다.** 지우면 그 데이터들이 무엇인지 알 수 없게 된다 —
   *    감추기(`visible: false`)가 그 자리다 (§29.1).
   */
  uses: number
  /** 드롭다운에 보이는가. **끄면 새로 못 고르지만 기존 데이터는 남는다** */
  visible: boolean
}

/** 이 코드를 쓰는 화면 */
export type CodeUsage = {
  /** 어느 화면인가. 링크가 된다 */
  screen: ScreenId
  /** 그 화면 어디에서 쓰는가 */
  where: string
}

export type CodeGroup = {
  key: number
  /** 「문의 분류」 */
  name: string
  /** `QNA_CATEGORY` — 코드에서 부르는 이름 */
  codeKey: string
  category: CodeCategory
  /** 한 줄 설명 */
  note: string
  /** **배열 순서가 곧 드롭다운 순서다** */
  values: CodeValue[]
  usages: CodeUsage[]
  /** `YYYY-MM-DD HH:mm` */
  updatedAt: string
  updatedBy: string
}

/** 폼이 채우는 값 */
export type CodeGroupInput = {
  name: string
  codeKey: string
  category: CodeCategory
  note: string
  /** 등록할 때 같이 넣는 초기 값 */
  values: { code: string; label: string; tone: CodeTone }[]
}

/** 변경 이력 한 줄 */
export type CodeLog = {
  /** `YYYY-MM-DD HH:mm` */
  at: string
  kind: '그룹 생성' | '값 추가' | '이름 변경' | '색 변경' | '순서 변경' | '숨김'
  what: string
  by: string
}
