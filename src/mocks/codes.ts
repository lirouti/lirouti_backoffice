/**
 * 공통 코드 목 데이터. 디자인 원본 `GROUPS` 9개를 값 그대로 옮겼다.
 *
 * ⚠️ **사용처를 실제 화면 id 로 붙였다.** 원본은 `riruti-admin-cs.dc.html#qna` 처럼
 *    디자인 파일을 가리키는데, 어드민 안에서는 열 수 없는 주소다 — 「어디서 쓰나」 를
 *    보러 온 사람이 그 화면으로 못 간다 (docs/ARCHITECTURE.md §29.2).
 */
import type {
  CodeCategory,
  CodeGroup,
  CodeGroupInput,
  CodeLog,
  CodeTone,
  CodeValue,
} from '@/domain/code'
import type { ScreenId } from '@/domain/screens'

type RawValue = [code: string, label: string, tone: CodeTone, uses: number]
type RawUsage = [screen: ScreenId, where: string]

type Row = [
  name: string,
  codeKey: string,
  category: CodeCategory,
  note: string,
  values: RawValue[],
  usages: RawUsage[],
  /** `YYYY-MM-DD HH:mm` */
  updatedAt: string,
  updatedBy: string,
]

// ⚠️ **한 줄이 한 레코드다.** 표처럼 읽는 것이 이 파일의 목적이라 자동 포맷을 끈다 —
//    풀어 놓으면 12칸짜리 한 줄이 14줄이 되어 무엇이 무엇인지 보이지 않는다.
// prettier-ignore
const ROWS: Row[] = [
  [
    '문의 분류', 'QNA_CATEGORY', '고객 소통', '1:1 문의를 접수할 때 유저가 고르는 분류',
    [['ACCOUNT', '계정 · 로그인', '파랑', 412], ['PAY', '결제 · 환불', '빨강', 286],
     ['BUG', '오류 · 버그', '노랑', 193], ['CHAR', '캐릭터 · 성장', '초록', 148],
     ['ITEM', '아이템 · 상점', '보라', 97], ['ETC', '기타', '회색', 64]],
    [['qna', '1:1 문의 분류 필터'], ['faq', 'FAQ 분류']],
    '2026-08-09 14:22', '박서준',
  ],
  [
    '아이템 슬롯', 'ITEM_SLOT', '아이템', '의상이 붙는 부위. 캐릭터 리그와 짝을 이룹니다',
    [['HEAD', '머리', '파랑', 10], ['BODY', '몸', '파랑', 13], ['HAND', '손', '파랑', 13], ['FACE', '얼굴', '파랑', 14]],
    [['items', '등록 · 목록 필터'], ['rig', '리그 슬롯 표']],
    '2026-07-30 11:05', '최지우',
  ],
  [
    '아이템 등급', 'ITEM_TIER', '아이템', '무료와 유료를 나누는 등급',
    [['FREE', '무료', '회색', 36], ['PAID', '유료', '노랑', 20]],
    [['items', '등급 배지 · 필터'], ['shop', '상점 진열 배지']],
    '2026-06-18 09:44', '박서준',
  ],
  [
    '시즌', 'SEASON', '운영', '시즌제 콘텐츠를 묶는 단위',
    [['S1', '시즌 1', '회색', 54], ['S2', '시즌 2', '회색', 61], ['S3', '시즌 3', '초록', 48], ['NONE', '상시', '파랑', 72]],
    [['itemnew', '시즌 선택'], ['chal', '시즌 챌린지']],
    '2026-08-01 10:12', '김하늘',
  ],
  [
    '챌린지 유형', 'CHALLENGE_KIND', '챌린지', '반복 주기로 나눈 챌린지 종류',
    [['DAILY', '일상', '파랑', 9], ['WEEKLY', '주간', '보라', 6], ['SEASON', '시즌', '초록', 3]],
    [['chal', '목록 탭 · 등록']],
    '2026-05-22 16:31', '이도윤',
  ],
  [
    '진행 상태', 'RUN_STATUS', '공통', '챌린지와 이벤트가 공유하는 상태값',
    [['DRAFT', '작성 중', '회색', 7], ['REVIEW', '검수 중', '노랑', 4], ['LIVE', '진행 중', '초록', 12],
     ['ENDED', '종료', '회색', 31], ['STOPPED', '중단', '빨강', 2]],
    [['chal', '상태 배지'], ['event', '이벤트 상태'], ['ach', '공개 여부']],
    '2026-07-14 13:58', '김하늘',
  ],
  [
    '지급 사유', 'GRANT_REASON', '운영', '젬과 아이템을 지급하거나 회수할 때 고르는 사유',
    [['MAINT', '점검 보상', '파랑', 18], ['EVENT', '이벤트 보상', '초록', 24], ['CS', '문의 처리', '노랑', 41],
     ['REFUND', '환불 회수', '빨강', 6], ['TEST', '테스트', '회색', 12]],
    [['grant', '지급 · 회수 사유']],
    '2026-08-05 09:20', '정민재',
  ],
  [
    '성장 단계', 'GROWTH_STAGE', '캐릭터', '알에서 성체까지의 단계',
    [['EGG', '알', '회색', 4], ['HATCH', '부화', '노랑', 3], ['JUVENILE', '유체', '파랑', 5], ['ADULT', '성체', '초록', 13]],
    [['growth', '성장 단계 화면'], ['levels', '레벨 테이블 구간']],
    '2026-04-11 15:07', '최지우',
  ],
  [
    '알림 채널', 'NOTI_CHANNEL', '운영', '공지와 이벤트를 내보내는 경로',
    [['PUSH', '앱 푸시', '파랑', 86], ['INAPP', '앱 내 배너', '초록', 52], ['MAIL', '이메일', '회색', 19]],
    [['notice', '공지 발송 채널']],
    '2026-07-02 11:33', '박서준',
  ],
]

/** 운영자가 감춰 둔 값. **점수나 사용 건수와 무관하게 사람이 정한다** (§29.1) */
const HIDDEN: Record<string, string[]> = { RUN_STATUS: ['DRAFT'], GRANT_REASON: ['TEST'] }

let GROUPS: CodeGroup[] = ROWS.map(
  ([name, codeKey, category, note, values, usages, updatedAt, updatedBy], key) => ({
    key,
    name,
    codeKey,
    category,
    note,
    values: values.map(([code, label, tone, uses]) => ({
      code,
      label,
      tone,
      uses,
      visible: !(HIDDEN[codeKey] ?? []).includes(code),
    })),
    usages: usages.map(([screen, where]) => ({ screen, where })),
    updatedAt,
    updatedBy,
  }),
)

export const allCodeGroups = (): CodeGroup[] => GROUPS

/**
 * 그룹의 값 순서·노출을 통째로 저장한다.
 *
 * ⚠️ **`uses` 는 받지 않는다.** 집계 결과라 서버가 소유한다 — 화면이 보낸 값을
 *    그대로 쓰면 「쓰이는데 지울 수 있는」 값이 생긴다.
 */
export function saveCodeValues(key: number, values: CodeValue[]): CodeGroup | undefined {
  const found = GROUPS.find((g) => g.key === key)
  if (!found) return undefined
  const byCode = new Map(found.values.map((v) => [v.code, v]))
  found.values = values.map((v) => ({ ...v, uses: byCode.get(v.code)?.uses ?? 0 }))
  return found
}

let nextKey = ROWS.length

/**
 * 새 그룹을 만든다.
 *
 * ⚠️ **여기서 다듬지 않는다.** `normalizeCodeGroupInput` 이 이미 했다 —
 *    두 곳에서 다듬으면 한쪽만 고쳤을 때 검증과 저장이 갈린다 (§29.3.1).
 */
export function addCodeGroup(input: CodeGroupInput, by: string, at: string): CodeGroup {
  const created: CodeGroup = {
    key: nextKey,
    name: input.name,
    codeKey: input.codeKey,
    category: input.category,
    note: input.note,
    // 새 그룹의 값은 아직 아무 데도 안 쓰인다.
    values: input.values.map((v) => ({ ...v, uses: 0, visible: true })),
    // 사용처는 코드를 쓰는 화면이 생겨야 붙는다. 등록만으로는 아무 데도 안 쓰인다.
    usages: [],
    updatedAt: at,
    updatedBy: by,
  }
  nextKey += 1
  GROUPS = [...GROUPS, created]
  return created
}

/**
 * 변경 이력. **원본이 문의 분류 그룹 하나에만 붙여 둔 것을 그룹별로 만든다.**
 *
 * ⚠️ 실서버에서는 저장할 때마다 쌓인다. 목은 그룹의 마지막 수정 정보로 첫 줄을 만든다.
 */
export function codeLogs(g: CodeGroup): CodeLog[] {
  const first = g.values[0]
  return [
    {
      at: g.updatedAt,
      kind: '값 추가',
      what: `${first?.label ?? '값'} · ${first?.code ?? ''} 추가`,
      by: g.updatedBy,
    },
    { at: '2026-08-05 10:11', kind: '순서 변경', what: '두 번째 값을 위로 이동', by: '김하늘' },
    { at: '2026-07-14 09:52', kind: '숨김', what: '쓰지 않는 값 숨김 처리', by: '정민재' },
    { at: '2026-06-02 11:07', kind: '그룹 생성', what: '코드 그룹 최초 등록', by: '김하늘' },
  ]
}
