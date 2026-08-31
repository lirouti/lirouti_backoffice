/** 공통 코드 규칙. */
import type { CodeGroup, CodeGroupInput, CodeTone, CodeValue } from './types'

/** 코드 키·코드 값이 지켜야 하는 모양 */
export const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/

/**
 * 코드 키로 쓸 수 있는 값인가.
 *
 * ⚠️ **영문 대문자와 밑줄만.** 서버·앱이 이 문자열을 그대로 들고 다니고, 소문자나
 *    한글이 섞이면 비교가 조용히 어긋난다 (`Account` 와 `ACCOUNT` 는 다른 값이다).
 */
export const isCodeKey = (v: string): boolean => CODE_PATTERN.test(v)

/** 한글 그룹명에서 코드 키를 만든다. 원본 `genKey` 의 낱말 사전을 옮겼다 */
const WORD_MAP: [string, string][] = [
  ['문의', 'QNA'],
  ['신고', 'REPORT'],
  ['알림', 'NOTI'],
  ['상태', 'STATUS'],
  ['유형', 'KIND'],
  ['분류', 'CATEGORY'],
  ['사유', 'REASON'],
  ['등급', 'TIER'],
  ['단계', 'STAGE'],
]

/**
 * 그룹명 → 코드 키 후보. **자동은 제안일 뿐 강제가 아니다** — 운영자가 고칠 수 있다.
 *
 * 사전에 없는 낱말은 대문자로 올리고, 쓸 수 없는 글자는 밑줄로 바꾼다.
 */
export function suggestCodeKey(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'NEW_CODE'
  const key = words
    .map((w) => WORD_MAP.find(([ko]) => w.includes(ko))?.[1] ?? w.toUpperCase())
    .join('_')
    // 앞이 숫자·밑줄로 시작하면 코드 키가 아니다. 남는 글자가 없으면 기본값으로.
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return isCodeKey(key) ? key : 'NEW_CODE'
}

/**
 * 이 값을 지울 수 있는가.
 *
 * ⚠️ **쓰이고 있으면 못 지운다.** 412건이 `ACCOUNT` 를 들고 있는데 그 값을 지우면
 *    그 데이터들이 무엇인지 알 수 없게 된다. 감추면 새로 못 고르고 기존은 남는다
 *    (docs/ARCHITECTURE.md §29.1).
 */
export const canDeleteValue = (v: CodeValue): boolean => v.uses === 0

/** 그룹에서 실제로 지울 수 있는 값들 */
export const deletableValues = (g: CodeGroup): CodeValue[] => g.values.filter(canDeleteValue)

/** 목록 필터 */
export type CodeFilter = {
  category?: string
  /** 그룹명 · 코드 키 · 코드 값 부분 일치 */
  q?: string
}

export function filterGroups(list: CodeGroup[], f: CodeFilter): CodeGroup[] {
  const q = f.q?.trim().toUpperCase()
  return list.filter((g) => {
    if (f.category && f.category !== '전체' && g.category !== f.category) return false
    if (!q) return true
    return (
      g.name.toUpperCase().includes(q) ||
      g.codeKey.includes(q) ||
      // 코드 값으로도 찾는다 — 「이 값이 어느 그룹 거지」 가 실제 쓰임이다.
      g.values.some((v) => v.code.includes(q) || v.label.toUpperCase().includes(q))
    )
  })
}

/** 목록 위 지표 */
export type CodeSummary = {
  groups: number
  /** 전체 코드 값 수 */
  values: number
  /** 지금 쓰이는 분류 수 */
  categories: number
  /** 감춰 둔 값 수 */
  hidden: number
}

export function summarizeCodes(list: CodeGroup[]): CodeSummary {
  return {
    groups: list.length,
    values: list.reduce((sum, g) => sum + g.values.length, 0),
    categories: new Set(list.map((g) => g.category)).size,
    hidden: list.reduce((sum, g) => sum + g.values.filter((v) => !v.visible).length, 0),
  }
}

/** 어느 칸이 왜 막혔는가 */
export type CodeErrors = {
  name?: string
  codeKey?: string
  /** 값 전체에 대한 하나의 메시지 */
  values?: string
}

/**
 * 그룹 등록 검증.
 *
 * @param takenKeys 이미 쓰고 있는 코드 키들. **대소문자 구분 없이 막는다**
 */
export function validateCodeGroup(input: CodeGroupInput, takenKeys: string[] = []): CodeErrors {
  const errors: CodeErrors = {}

  if (!input.name.trim()) errors.name = '그룹명을 입력하세요.'

  const key = input.codeKey.trim()
  if (!key) errors.codeKey = '코드 키를 입력하세요.'
  else if (!isCodeKey(key)) errors.codeKey = '코드 키는 영문 대문자와 밑줄만 씁니다.'
  else if (takenKeys.some((t) => t.toUpperCase() === key.toUpperCase())) {
    errors.codeKey = '이미 쓰고 있는 코드 키입니다.'
  }

  const values = input.values.filter((v) => v.code.trim() || v.label.trim())
  if (values.length === 0) errors.values = '값을 하나 이상 넣으세요.'
  else if (values.some((v) => !isCodeKey(v.code.trim()))) {
    errors.values = '코드는 영문 대문자와 밑줄만 씁니다.'
  } else if (values.some((v) => !v.label.trim())) {
    errors.values = '표시 이름을 모두 채우세요.'
  } else {
    // ⚠️ 같은 코드가 둘이면 저장된 데이터가 어느 쪽인지 알 수 없다.
    //    여기 오면 위에서 `isCodeKey` 를 통과해 **이미 전부 대문자**다 —
    //    `toUpperCase()` 를 한 번 더 하면 테스트가 증명할 수 없는 방어가 된다.
    const seen = new Set(values.map((v) => v.code.trim()))
    if (seen.size !== values.length) errors.values = '코드가 중복됐습니다.'
  }

  return errors
}

/** 빈 값 줄을 걸러 낸 실제 입력 값 */
export const usableValues = (input: CodeGroupInput): CodeGroupInput['values'] =>
  input.values.filter((v) => v.code.trim() || v.label.trim())

/** 새 값 한 줄의 기본형 */
export const emptyValue = (): { code: string; label: string; tone: CodeTone } => ({
  code: '',
  label: '',
  tone: '회색',
})
