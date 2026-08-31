/**
 * 알림 작성 — 미리보기 + 예상 대상.
 *
 * ⚠️ **야간 마케팅 발송은 막는다.** 정보통신망법상 광고성 정보는 21시–08시에 보내려면
 *    별도 동의가 필요한데 우리는 그 동의를 받지 않는다 (docs/ARCHITECTURE.md §26.2).
 */
import { useState } from 'react'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { changed, restoreDraft } from '@/shared/lib/draft'
import { num, share } from '@/shared/lib/format'
import { nowAt } from '@/shared/lib/today'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { Skeleton } from '@/shared/ui/EmptyState'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Icon } from '@/shared/ui/Icon'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import { Textarea } from '@/shared/ui/Textarea'

import {
  NIGHT_FROM,
  NIGHT_TO,
  PUSH_KIND_HINT,
  PUSH_KIND_LABEL,
  PUSH_LIMITS,
  reachOf,
  validatePush,
  type PushAudience,
  type PushInput,
  type PushKind,
  type PushLink,
} from '@/domain/push'
import { SCREENS } from '@/domain/screens'

import { useCheckDirect, useConsent, useSendPush } from '@/api/push'

import { useUnsavedGuard } from '@/stores/dirtyStore'
import { useViewer } from '@/stores/viewerStore'

const KINDS: PushKind[] = ['service', 'marketing', 'routine']
const AUDIENCES: PushAudience[] = ['전체', '30일 내 접속', '미인증 회원', '휴면 회원', '직접 지정']
const LINKS: PushLink[] = ['앱 열기', '오늘의 루틴', '상점', '내 캐릭터', '월간 리포트', '1:1 문의']

/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 화면마다의 `/…/new` 가 **같은 칸을
 *    써서 하나가 다른 하나를 덮어쓴다** (docs/ARCHITECTURE.md §33.2).
 */
const DRAFT = 'push:new'

const EMPTY: PushInput = {
  kind: 'service',
  title: '',
  body: '',
  link: '앱 열기',
  audience: '전체',
  ids: '',
  now: true,
  at: '',
}

export default function PushFormPage() {
  const navigate = useNavigate()
  const viewer = useViewer()
  const { data: consent, isPending, error } = useConsent()
  const send = useSendPush()
  const check = useCheckDirect()
  // 폼을 만들기 **전에** 읽는다 — 만든 뒤에는 초기값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(DRAFT, EMPTY))
  const [form, setForm] = useState<PushInput>(restored ?? EMPTY)
  // ⚠️ **알림 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정이라
  //    「새로 시작」 으로 버려도 계속 참이고 알림이 안 지워진다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  const [tried, setTried] = useState(false)
  const [asking, setAsking] = useState(false)
  const markSaved = useUnsavedGuard(form.title !== '' || form.body !== '')
  const draft = useFormDraft(DRAFT, form, changed(form, EMPTY))

  if (isPending) return <Skeleton rows={8} />
  if (error || !consent) return <ErrorBanner message={error?.message ?? '수신 동의 정보를 불러오지 못했습니다.'} />

  const set = <K extends keyof PushInput>(k: K, v: PushInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  // 「지금 발송」 의 「지금」 은 누를 때가 아니라 그릴 때 기준으로 본다 — 야간 경계를
  // 넘어가면 경고가 바로 뜨는 것이 맞다.
  const sendAt = form.now ? nowAt() : form.at
  const errors = validatePush(form, consent, sendAt)
  const reach = reachOf(form, consent)
  const direct = form.audience === '직접 지정'
  // 확인 창에는 **실제로 갈 수**를 적는다. 세그먼트는 화면 계산이 곧 그 값이다.
  const confirmed = direct ? (check.data?.count ?? reach) : reach

  const ask = () => {
    setTried(true)
    if (Object.keys(errors).length > 0) return
    // 「직접 지정」 의 「예상 대상」 은 상한이다 — 누가 빠지는지는 실제로 풀어 봐야 안다.
    if (form.audience !== '직접 지정') {
      setAsking(true)
      return
    }
    check.mutate(form, { onSuccess: (r) => setAsking(r.count > 0) })
  }

  const commit = () =>
    send.mutate(
      { input: form, by: viewer.name },
      {
        onSuccess: () => {
          draft.clear()
          markSaved()
          navigate(SCREENS.push.path)
        },
      },
    )

  return (
    <>
      <PageHeader
        title="알림 작성"
        sub="잠금화면에 그대로 나갑니다. 보내면 되돌릴 수 없습니다."
        actions={
          <>
            <Button onClick={() => navigate(SCREENS.push.path)}>취소</Button>
            <Button onClick={draft.saveNow} disabled={!changed(form, EMPTY)}>
              임시 저장
            </Button>
            <Button variant="primary" onClick={ask} disabled={send.isPending}>
              {form.now ? '지금 발송' : '예약 저장'}
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

      {(send.error || check.error) && <ErrorBanner message={(send.error ?? check.error)!.message} />}

      {/* 0명이면 확인할 것이 없다 — 창을 열지 않고 그 자리에서 이유를 말한다 (§25.3.2) */}
      {check.data && check.data.count === 0 && (
        <ErrorBanner
          message={`보낼 대상이 없습니다.${check.data.missing.length > 0 ? ` 못 찾은 ID — ${check.data.missing.join(', ')}` : ''}${
            check.data.blocked.length > 0 ? ` 마케팅 미동의 — ${check.data.blocked.join(', ')}` : ''
          }`}
        />
      )}
      {tried && errors.kind && <ErrorBanner message={errors.kind} />}

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' })}>
        <div className={css({ flex: '2 1 420px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '18px' })}>
          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="알림 종류" sub="수신 동의를 볼지 말지가 여기서 갈립니다." />
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '8px', mt: '13px' })}>
              {KINDS.map((k) => (
                <KindOption key={k} kind={k} on={form.kind === k} pick={() => set('kind', k)} />
              ))}
            </div>
            {form.kind === 'marketing' && (
              <p
                className={css({
                  m: '12px 0 0',
                  p: '10px 13px',
                  borderRadius: 'lg',
                  bg: 'aBg',
                  border: '1px solid token(colors.warnBd)',
                  textStyle: 'caption',
                  color: 'warnFg',
                })}
              >
                마케팅 알림은 <strong>수신 동의한 회원에게만</strong> 갑니다. 대상 수가 전체보다 적은
                것이 정상이고, 야간({NIGHT_FROM}시–{NIGHT_TO}시) 발송은 막힙니다.
              </p>
            )}
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="내용" />
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '13px', mt: '13px' })}>
              <Input
                value={form.title}
                onChange={(v) => set('title', v)}
                label="제목"
                placeholder="예: 오늘의 루틴 잊지 않으셨죠?"
                hint={`${form.title.length} / ${PUSH_LIMITS.title}자`}
                error={tried ? errors.title : undefined}
                required
              />
              <Textarea
                value={form.body}
                onChange={(v) => set('body', v)}
                label="본문"
                placeholder="한 줄로 끝나는 문장이 열림률이 높습니다"
                hint={`${form.body.length} / ${PUSH_LIMITS.body}자`}
                error={tried ? errors.body : undefined}
                required
                rows={2}
              />
              <Select
                value={form.link}
                onChange={(v) => set('link', v as PushLink)}
                label="눌렀을 때 이동"
                options={LINKS.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="대상" />
            <div className={css({ mt: '13px' })}>
              <Segmented
                value={form.audience}
                onChange={(v) => set('audience', v)}
                options={AUDIENCES}
                aria-label="대상"
              />
            </div>
            {form.audience === '직접 지정' && (
              <div className={css({ mt: '13px' })}>
                <Input
                  value={form.ids}
                  onChange={(v) => set('ids', v)}
                  label="회원 ID"
                  placeholder="U-10240, U-10253"
                  hint="쉼표·줄바꿈으로 여러 명"
                  error={tried ? errors.ids : undefined}
                  required
                />
              </div>
            )}
            {form.audience !== '직접 지정' && tried && errors.ids && (
              <p className={css({ m: '10px 0 0', textStyle: 'caption', color: 'rFg' })}>{errors.ids}</p>
            )}
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="발송 시각" />
            <div className={css({ mt: '13px' })}>
              <Segmented
                value={form.now ? '지금 발송' : '예약'}
                onChange={(v) => set('now', v === '지금 발송')}
                options={['지금 발송', '예약']}
                aria-label="발송 시각"
              />
            </div>
            {!form.now && (
              <div className={css({ mt: '13px' })}>
                <Input
                  value={form.at}
                  onChange={(v) => set('at', v)}
                  label="예약 시각"
                  placeholder="2026-08-31 10:00"
                  hint="YYYY-MM-DD HH:mm"
                  error={tried ? errors.at : undefined}
                  required
                />
              </div>
            )}
            {/* 누르기 전에도 보여 준다 — 시각을 고르는 중에 알아야 고칠 수 있다 */}
            {errors.kind && (
              <p className={css({ m: '12px 0 0', textStyle: 'caption', color: 'rFg', fontWeight: '600' })}>
                {errors.kind} 시각을 바꾸거나 종류를 서비스 알림으로 바꾸세요.
              </p>
            )}
          </Card>
        </div>

        <div className={css({ flex: '1 1 280px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '18px' })}>
          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="잠금화면 미리보기" />
            <LockScreen title={form.title} body={form.body} />
            <p className={css({ m: '10px 0 0', textStyle: 'micro', color: 'faint' })}>
              기기에 따라 제목은 한 줄, 본문은 두 줄까지 보입니다. 넘치면 뒤가 잘립니다.
            </p>
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="예상 대상" />
            <div className={css({ mt: '10px', display: 'flex', alignItems: 'baseline', gap: '4px' })}>
              <span className={css({ textStyle: 'display', color: reach > 0 ? 'ink' : 'rFg' })}>
                {direct ? `최대 ${num(reach)}` : num(reach)}
              </span>
              <span className={css({ textStyle: 'body', color: 'sub' })}>명</span>
            </div>
            {/* 지목한 사람의 동의 여부는 서버가 안다 — 화면이 아는 것은 적어 낸 수뿐이다 */}
            {direct && (
              <p className={css({ m: '6px 0 0', textStyle: 'micro', color: 'faint' })}>
                {form.kind === 'marketing'
                  ? '마케팅에 동의하지 않은 회원은 보낼 때 빠집니다.'
                  : '없는 회원은 보낼 때 빠집니다.'}
              </p>
            )}
            <dl className={css({ m: '13px 0 0', display: 'flex', flexDirection: 'column', gap: '8px' })}>
              <Row k="전체 회원" v={`${num(consent.all)}명`} />
              <Row k="푸시 허용" v={`${num(consent.push)}명 (${share(consent.push, consent.all)})`} />
              <Row k="마케팅 동의" v={`${num(consent.marketing)}명 (${share(consent.marketing, consent.all)})`} />
              <Row k="대상 조건" v={form.audience} />
            </dl>
          </Card>
        </div>
      </div>

      <Dialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={commit}
        title={form.now ? '지금 발송' : '예약 저장'}
        tone="danger"
        confirmLabel={send.isPending ? '보내는 중…' : form.now ? `${num(confirmed)}명에게 발송` : '예약 저장'}
        body={
          <>
            <strong>{num(confirmed)}명</strong>에게 {PUSH_KIND_LABEL[form.kind]}을{' '}
            {form.now ? '지금 보냅니다' : `${form.at} 에 보냅니다`}.
            {form.now && ' 되돌릴 수 없습니다.'}
            {check.data && (check.data.missing.length > 0 || check.data.blocked.length > 0) && (
              <span className={css({ display: 'block', mt: '9px', color: 'rFg', fontWeight: '600' })}>
                {check.data.missing.length > 0 && `찾지 못한 회원 ${check.data.missing.length}명`}
                {check.data.missing.length > 0 && check.data.blocked.length > 0 && ' · '}
                {check.data.blocked.length > 0 && `마케팅 미동의 ${check.data.blocked.length}명`}
                {' 은 제외됩니다.'}
              </span>
            )}
          </>
        }
      />
    </>
  )
}

function KindOption({ kind, on, pick }: { kind: PushKind; on: boolean; pick: () => void }) {
  return (
    <button
      type="button"
      onClick={pick}
      aria-pressed={on}
      className={css({
        textAlign: 'left',
        p: '11px 13px',
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: on ? 'pri' : 'bd',
        bg: on ? 'soft' : 'surf',
        cursor: 'pointer',
        _focusVisible: { outline: '2px solid token(colors.ringBd)', outlineOffset: '2px' },
      })}
    >
      <span className={css({ display: 'block', textStyle: 'label', fontWeight: '700', color: on ? 'priD' : 'ink' })}>
        {PUSH_KIND_LABEL[kind]}
      </span>
      <span className={css({ display: 'block', mt: '2px', textStyle: 'micro', color: 'sub' })}>
        {PUSH_KIND_HINT[kind]}
      </span>
    </button>
  )
}

function LockScreen({ title, body }: { title: string; body: string }) {
  return (
    <div
      className={css({
        mt: '12px',
        p: '11px 13px',
        borderRadius: 'lg',
        bg: 'prev',
        border: '1px solid token(colors.bd)',
        display: 'flex',
        gap: '10px',
      })}
    >
      <span
        aria-hidden="true"
        className={css({
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          width: '30px',
          height: '30px',
          borderRadius: 'md',
          bg: 'surf',
          border: '1px solid token(colors.bd)',
          color: 'priD',
        })}
      >
        <Icon name="ic_bird" size={16} />
      </span>
      <span className={css({ flex: '1', minWidth: '0' })}>
        <span className={css({ display: 'flex', justifyContent: 'space-between', textStyle: 'micro', color: 'faint' })}>
          <span>리루티</span>
          <span>지금</span>
        </span>
        {/* 실제 잠금화면처럼 제목 한 줄 · 본문 두 줄에서 자른다 */}
        <span
          className={css({
            display: 'block',
            mt: '2px',
            textStyle: 'label',
            fontWeight: '700',
            color: 'ink',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {title.trim() || '제목이 여기에 보입니다'}
        </span>
        <span
          // 두 줄에서 자른다. Panda 가 `WebkitBoxOrient` 를 모르므로 인라인으로 준다 —
          // 값이 고정이라 정적 추출이 필요 없다.
          className={css({ display: '-webkit-box', overflow: 'hidden', textStyle: 'caption', color: 'sub' })}
          style={{ WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        >
          {body.trim() || '본문이 여기에 보입니다. 두 줄까지 노출됩니다.'}
        </span>
      </span>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt className={css({ flex: 'none', width: '78px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd className={css({ m: '0', flex: '1', minWidth: '0', textAlign: 'right', textStyle: 'label', fontWeight: '600', color: 'ink' })}>
        {v}
      </dd>
    </div>
  )
}
