/**
 * 코드 그룹 추가 — 드롭다운 미리보기를 옆에 둔다.
 *
 * **코드 키는 저장된 데이터가 그대로 들고 다니는 값**이라, 등록 뒤에는 못 바꾼다는
 * 전제로 만든다 (docs/ARCHITECTURE.md §29.3).
 */
import { useState } from 'react'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { changed, restoreDraft } from '@/shared/lib/draft'
import { num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { Textarea } from '@/shared/ui/Textarea'

import {
  CODE_CATEGORIES,
  CODE_RULE_TEXT,
  CODE_TONE_BADGE,
  CODE_TONES,
  emptyValue,
  suggestCodeKey,
  usableValues,
  validateCodeGroup,
  type CodeGroupInput,
  type CodeTone,
} from '@/domain/code'
import { SCREENS } from '@/domain/screens'

import { useCodeGroups, useCreateCodeGroup } from '@/api/codes'

import { useUnsavedGuard } from '@/stores/dirtyStore'
import { useViewer } from '@/stores/viewerStore'

/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 화면마다의 `/…/new` 가 **같은 칸을
 *    써서 하나가 다른 하나를 덮어쓴다** (docs/ARCHITECTURE.md §33.2).
 */
const DRAFT = 'codes:new'

const EMPTY: CodeGroupInput = {
  name: '',
  codeKey: '',
  category: '공통',
  note: '',
  values: [emptyValue(), emptyValue()],
}

export default function CodeFormPage() {
  const navigate = useNavigate()
  const viewer = useViewer()
  const { data, isPending, error } = useCodeGroups({})
  const create = useCreateCodeGroup()
  // 폼을 만들기 **전에** 읽는다 — 만든 뒤에는 초기값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(DRAFT, EMPTY))
  const [form, setForm] = useState<CodeGroupInput>(restored ?? EMPTY)
  // ⚠️ **알림 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정이라
  //    「새로 시작」 으로 버려도 계속 참이고 알림이 안 지워진다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  const [tried, setTried] = useState(false)
  // ⚠️ **폼 전체를 본다.** 이름·키만 보면 설명·분류·값만 채운 사람이 경고 없이 잃는다.
  const markSaved = useUnsavedGuard(changed(form, EMPTY))
  const draft = useFormDraft(DRAFT, form, changed(form, EMPTY))

  const errors = validateCodeGroup(form, data?.takenKeys ?? [])
  const rows = usableValues(form)

  if (isPending) return <Skeleton rows={8} />
  if (error || !data) return <ErrorBanner message={error?.message ?? '코드 목록을 불러오지 못했습니다.'} />

  const set = <K extends keyof CodeGroupInput>(k: K, v: CodeGroupInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const setValue = (i: number, patch: Partial<CodeGroupInput['values'][number]>) =>
    set('values', form.values.map((v, at) => (at === i ? { ...v, ...patch } : v)))

  const back = () => navigate(SCREENS.codes.path)

  const commit = () => {
    setTried(true)
    if (Object.keys(errors).length > 0) return
    create.mutate({ input: form, by: viewer.name }, { onSuccess: () => { draft.clear(); markSaved(); back() } })
  }

  return (
    <>
      <PageHeader
        title="코드 그룹 추가"
        sub="드롭다운과 배지에 쓰일 값을 만듭니다."
        actions={
          <>
            <Button onClick={back}>취소</Button>
            <Button onClick={draft.saveNow} disabled={!changed(form, EMPTY)}>
              임시 저장
            </Button>
            <Button variant="primary" onClick={commit} disabled={create.isPending}>
              그룹 등록
            </Button>
          </>
        }
      />

      {noticeOpen && (
        <DraftNotice
          onDiscard={() => {
            draft.clear()
            setForm(EMPTY)
            setNoticeOpen(false)
          }}
        />
      )}
      <DraftSavedAt at={draft.savedAt} />

      {create.error && <ErrorBanner message={create.error.message} />}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <div className={css({ flex: '2 1 420px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '18px' })}>
          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="그룹 정보" />
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '13px', mt: '13px' })}>
              <Input
                value={form.name}
                onChange={(v) => set('name', v)}
                label="그룹명"
                placeholder="예: 신고 유형"
                error={tried ? errors.name : undefined}
                required
              />

              <div>
                <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '8px' })}>
                  <div className={css({ flex: '1', minWidth: '0' })}>
                    <Input
                      value={form.codeKey}
                      onChange={(v) => set('codeKey', v)}
                      label="코드 키"
                      placeholder="REPORT_KIND"
                      hint={`${CODE_RULE_TEXT} · 등록 뒤에는 바꿀 수 없습니다`}
                      error={tried ? errors.codeKey : undefined}
                      required
                    />
                  </div>
                  {/* 자동은 제안일 뿐이다 — 채운 뒤 고칠 수 있다 */}
                  <Button onClick={() => set('codeKey', suggestCodeKey(form.name))}>자동</Button>
                </div>
              </div>

              <div>
                <div className={css({ mb: '6px', textStyle: 'label', fontWeight: '600', color: 'ink' })}>분류</div>
                <Segmented
                  value={form.category}
                  onChange={(v) => set('category', v)}
                  options={CODE_CATEGORIES}
                  aria-label="분류"
                />
              </div>

              <Textarea
                value={form.note}
                onChange={(v) => set('note', v)}
                label="설명"
                placeholder="이 코드가 어디에 쓰이는지 한 줄로 적어주세요"
                rows={2}
              />
            </div>
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' })}>
              <div className={css({ flex: '1 1 160px', minWidth: '0' })}>
                <CardTitle title="초기 값" sub="순서는 등록 후 상세에서 바꿉니다." />
              </div>
              <Button onClick={() => set('values', [...form.values, emptyValue()])}>값 추가</Button>
            </div>

            {tried && errors.values && (
              <p className={css({ m: '10px 0 0', textStyle: 'caption', color: 'rFg' })}>{errors.values}</p>
            )}

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '10px', mt: '13px' })}>
              {form.values.map((v, i) => (
                <div key={i} className={css({ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap' })}>
                  <span className={css({ flex: 'none', width: '20px', pb: '9px', textStyle: 'caption', color: 'faint' })}>
                    {i + 1}
                  </span>
                  <div className={css({ flex: '1 1 120px', minWidth: '0' })}>
                    <Input
                      value={v.code}
                      // 코드는 언제나 대문자다 — 소문자로 저장되면 비교가 어긋난다.
                      onChange={(next) => setValue(i, { code: next.toUpperCase() })}
                      label={i === 0 ? '코드' : undefined}
                      aria-label={`${i + 1}번 코드`}
                      placeholder="CODE"
                    />
                  </div>
                  <div className={css({ flex: '1 1 140px', minWidth: '0' })}>
                    <Input
                      value={v.label}
                      onChange={(next) => setValue(i, { label: next })}
                      label={i === 0 ? '표시 이름' : undefined}
                      aria-label={`${i + 1}번 표시 이름`}
                      placeholder="표시 이름"
                    />
                  </div>
                  <div className={css({ flex: '0 1 110px', minWidth: '0' })}>
                    <Select
                      value={v.tone}
                      onChange={(next) => setValue(i, { tone: next as CodeTone })}
                      label={i === 0 ? '배지 색' : undefined}
                      aria-label={`${i + 1}번 배지 색`}
                      options={CODE_TONES.map((t) => ({ value: t, label: t }))}
                    />
                  </div>
                  <Button
                    variant="danger"
                    // 마지막 한 줄은 지우지 않는다 — 값이 하나도 없는 폼은 만들 수 없다.
                    disabled={form.values.length <= 1}
                    onClick={() => set('values', form.values.filter((_, at) => at !== i))}
                    aria-label={`${i + 1}번 값 삭제`}
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px 17px' })}>
          <CardTitle title="드롭다운 미리보기" sub="이 순서 그대로 화면에 나옵니다." />
          <div
            className={css({
              mt: '12px',
              borderRadius: 'lg',
              border: '1px solid token(colors.bd)',
              bg: 'prev',
              overflow: 'hidden',
            })}
          >
            <div className={css({ p: '9px 12px', borderBottom: '1px solid token(colors.bd)', textStyle: 'caption', fontWeight: '700', color: 'ink' })}>
              {form.name.trim() || '그룹명'}
            </div>
            {rows.length === 0 ? (
              <p className={css({ m: '0', p: '16px 12px', textAlign: 'center', textStyle: 'caption', color: 'faint' })}>
                값을 넣으면 여기에 보입니다.
              </p>
            ) : (
              <ul className={css({ listStyle: 'none', m: '0', p: '0' })}>
                {rows.map((v, i) => (
                  <li
                    key={i}
                    className={css({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      p: '8px 12px',
                      borderTop: i === 0 ? '0' : '1px solid token(colors.ln)',
                    })}
                  >
                    <Badge tone={CODE_TONE_BADGE[v.tone]} size="sm">
                      {v.label.trim() || '표시 이름'}
                    </Badge>
                    <span className={css({ flex: '1' })} />
                    <span className={css({ fontFamily: 'mono', textStyle: 'micro', color: 'faint' })}>
                      {v.code.trim() || 'CODE'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <dl className={css({ m: '13px 0 0', display: 'flex', flexDirection: 'column', gap: '9px' })}>
            <Row k="코드 키" v={form.codeKey.trim() || '—'} mono />
            <Row k="분류" v={form.category} />
            <Row k="값 개수" v={`${num(rows.length)}개`} />
          </dl>
        </Card>
      </div>
    </>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '64px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textAlign: 'right',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
          fontFamily: mono ? 'mono' : undefined,
        })}
      >
        {v}
      </dd>
    </div>
  )
}
