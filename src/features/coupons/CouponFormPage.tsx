/**
 * 쿠폰 발급 — 코드 미리보기를 옆에 둔다.
 *
 * **방식이 나머지를 정한다** — 단일·인플루언서는 코드를, 일괄·시리얼은 수량을 받는다
 * (docs/ARCHITECTURE.md §30.4).
 */
import { useState } from 'react'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { changed, restoreDraft } from '@/shared/lib/draft'
import { num } from '@/shared/lib/format'
import { today } from '@/shared/lib/today'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Select } from '@/shared/ui/Select'
import { SkeletonForm } from '@/shared/ui/Skeleton'
import { Switch } from '@/shared/ui/Switch'

import {
  bulkPrefix,
  COUPON_KIND_HINT,
  COUPON_KIND_LABEL,
  COUPON_KINDS,
  generateCouponCode,
  isSingleCode,
  REWARD_KIND_LABEL,
  validateCoupon,
  type CouponInput,
  type CouponKind,
  type CouponReward,
} from '@/domain/coupon'
import { SCREENS } from '@/domain/screens'

import { useCoupons, useIssueCoupon } from '@/api/coupons'

import { useUnsavedGuard } from '@/stores/dirtyStore'
import { useViewer } from '@/stores/viewerStore'

const REWARD_KINDS: CouponReward['kind'][] = ['gem', 'item', 'boost', 'emoji']

const newReward = (): CouponReward => ({ kind: 'gem', label: '젬', note: '재화', qty: 100 })

/**
 * 초안 칸 이름.
 *
 * ⚠️ **엔티티 이름을 붙인다.** 그냥 `'new'` 로 두면 화면마다의 `/…/new` 가 **같은 칸을
 *    써서 하나가 다른 하나를 덮어쓴다** (docs/ARCHITECTURE.md §33.2).
 */
const DRAFT = 'coupons:new'

const EMPTY: CouponInput = {
  kind: 'single',
  name: '',
  code: '',
  qty: 0,
  owner: '',
  startAt: '',
  endAt: '',
  rewards: [newReward()],
  limits: { perUser: true, firstCome: false, firstComeQty: 0, dated: false },
}

/** 로딩 중에도 그리므로 두 곳이 같은 문장을 쓰게 상수로 둔다 (§43.2) */
const FORM_SUB = '한 쿠폰으로 여러 보상을 한 번에 지급합니다.'

export default function CouponFormPage() {
  const navigate = useNavigate()
  const viewer = useViewer()
  const { data, isPending, error } = useCoupons({})
  const issue = useIssueCoupon()
  // 폼을 만들기 **전에** 읽는다 — 만든 뒤에는 초기값을 갈아 끼울 수 없다.
  const [restored] = useState(() => restoreDraft(DRAFT, EMPTY))
  const [form, setForm] = useState<CouponInput>(restored ?? EMPTY)
  // ⚠️ **알림 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정이라
  //    「새로 시작」 으로 버려도 계속 참이고 알림이 안 지워진다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  const [tried, setTried] = useState(false)
  // 임시 저장은 발급이 아니다 — 초안이 있어도 폼이 더러우면 경고를 켠다.
  const markSaved = useUnsavedGuard(changed(form, EMPTY))
  const draft = useFormDraft(DRAFT, form, changed(form, EMPTY))

  const errors = validateCoupon(form, data?.takenCodes ?? [])
  const single = isSingleCode(form.kind)

  if (isPending) {
    // ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제가 데이터를 안 쓰므로 아는 값이다.
    //    지웠다 다시 그리면 아는 것까지 튄다 (docs/ARCHITECTURE.md §43.2).
    //    다만 **버튼은 빼둔다** — 아직 없는 데이터를 대상으로 하는 동작이다.
    return (
      <>
        <PageHeader title="쿠폰 발급" sub={FORM_SUB} />
        <SkeletonForm fields={6} />
      </>
    )
  }
  if (error || !data)
    return <ErrorBanner message={error?.message ?? '쿠폰 목록을 불러오지 못했습니다.'} />

  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))
  const setLimit = <K extends keyof CouponInput['limits']>(k: K, v: CouponInput['limits'][K]) =>
    set('limits', { ...form.limits, [k]: v })
  const setReward = (i: number, patch: Partial<CouponReward>) =>
    set(
      'rewards',
      form.rewards.map((r, at) => (at === i ? { ...r, ...patch } : r)),
    )

  const back = () => navigate(SCREENS.coupons.path)

  const commit = () => {
    setTried(true)
    if (Object.keys(errors).length > 0) return
    issue.mutate(
      { input: form, by: viewer.name },
      {
        onSuccess: () => {
          draft.clear()
          markSaved()
          back()
        },
      },
    )
  }

  // 일괄·시리얼은 개별 코드를 서버가 만든다 — 화면은 접두사만 보여 준다.
  const previewCode = single
    ? form.code.trim().toUpperCase() || '코드 미입력'
    : `${bulkPrefix(form.name)}-XXXX`

  return (
    <>
      <PageHeader
        title="쿠폰 발급"
        sub={FORM_SUB}
        actions={
          <>
            <Button onClick={back}>취소</Button>
            <Button onClick={draft.saveNow} disabled={!changed(form, EMPTY)}>
              임시 저장
            </Button>
            <Button variant="primary" onClick={commit} disabled={issue.isPending}>
              {single ? '발급' : '일괄 발급'}
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

      {issue.error && <ErrorBanner message={issue.error.message} />}

      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          gap: '18px',
          alignItems: 'flex-start',
        })}
      >
        <div
          className={css({
            flex: '2 1 420px',
            minWidth: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          })}
        >
          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="발급 방식" sub="코드가 하나인지 여럿인지가 여기서 갈립니다." />
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                mt: '13px',
              })}
            >
              {COUPON_KINDS.map((k) => (
                <KindOption key={k} kind={k} on={form.kind === k} pick={() => set('kind', k)} />
              ))}
            </div>
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="기본 정보" />
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '13px',
                mt: '13px',
              })}
            >
              <Input
                value={form.name}
                onChange={(v) => set('name', v)}
                label="쿠폰 이름"
                placeholder="예: 여름 이벤트 보상"
                error={tried ? errors.name : undefined}
                required
              />

              {/* 방식에 따라 요구하는 칸이 다르다 — 안 쓰는 칸은 아예 안 그린다 */}
              {single ? (
                <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '8px' })}>
                  <div className={css({ flex: '1', minWidth: '0' })}>
                    <Input
                      value={form.code}
                      onChange={(v) => set('code', v.toUpperCase())}
                      label="코드"
                      placeholder="SUMMER2026"
                      hint="영문 대문자 · 숫자 · 하이픈"
                      error={tried ? errors.code : undefined}
                      required
                    />
                  </div>
                  {/* 자동 생성은 헷갈리는 글자(I·O·0·1)를 안 쓴다 (§30.2) */}
                  <Button onClick={() => set('code', generateCouponCode())}>생성</Button>
                </div>
              ) : (
                <Input
                  value={form.qty === 0 ? '' : String(form.qty)}
                  onChange={(v) => set('qty', Number(v.replace(/\D/g, '')) || 0)}
                  label="발급 수량"
                  placeholder="1000"
                  inputMode="numeric"
                  error={tried ? errors.qty : undefined}
                  required
                />
              )}

              {form.kind === 'influencer' && (
                <Input
                  value={form.owner}
                  onChange={(v) => set('owner', v)}
                  label="인플루언서"
                  placeholder="채널명 또는 담당자"
                  error={tried ? errors.owner : undefined}
                  required
                />
              )}
            </div>
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              })}
            >
              <div className={css({ flex: '1 1 160px', minWidth: '0' })}>
                <CardTitle
                  title="보상 묶음"
                  sub="한 쿠폰으로 여러 항목을 한 번에 지급합니다."
                />
              </div>
              <Button onClick={() => set('rewards', [...form.rewards, newReward()])}>
                항목 추가
              </Button>
            </div>

            {tried && errors.rewards && (
              <p className={css({ m: '10px 0 0', textStyle: 'caption', color: 'rFg' })}>
                {errors.rewards}
              </p>
            )}

            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                mt: '13px',
              })}
            >
              {form.rewards.map((r, i) => (
                <div
                  key={i}
                  className={css({
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '8px',
                    flexWrap: 'wrap',
                  })}
                >
                  <div className={css({ flex: '0 1 110px', minWidth: '0' })}>
                    <Select
                      value={r.kind}
                      onChange={(v) => setReward(i, { kind: v as CouponReward['kind'] })}
                      label={i === 0 ? '종류' : undefined}
                      aria-label={`${i + 1}번 보상 종류`}
                      options={REWARD_KINDS.map((k) => ({
                        value: k,
                        label: REWARD_KIND_LABEL[k],
                      }))}
                    />
                  </div>
                  <div className={css({ flex: '1 1 130px', minWidth: '0' })}>
                    <Input
                      value={r.label}
                      onChange={(v) => setReward(i, { label: v })}
                      label={i === 0 ? '항목' : undefined}
                      aria-label={`${i + 1}번 보상 항목`}
                      placeholder="젬"
                    />
                  </div>
                  <div className={css({ flex: '0 1 90px', minWidth: '0' })}>
                    <Input
                      value={r.qty === 0 ? '' : String(r.qty)}
                      onChange={(v) => setReward(i, { qty: Number(v.replace(/\D/g, '')) || 0 })}
                      label={i === 0 ? '수량' : undefined}
                      aria-label={`${i + 1}번 보상 수량`}
                      inputMode="numeric"
                    />
                  </div>
                  <Button
                    variant="danger"
                    disabled={form.rewards.length <= 1}
                    onClick={() =>
                      set(
                        'rewards',
                        form.rewards.filter((_, at) => at !== i),
                      )
                    }
                    aria-label={`${i + 1}번 보상 삭제`}
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className={css({ p: '15px 17px' })}>
            <CardTitle title="사용 제한" />
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '13px',
                mt: '13px',
              })}
            >
              <Switch
                checked={form.limits.perUser}
                onChange={(v) => setLimit('perUser', v)}
                label="1인 1회 제한"
                hint="같은 계정이 두 번 사용할 수 없습니다"
              />
              <Switch
                checked={form.limits.firstCome}
                onChange={(v) => setLimit('firstCome', v)}
                label="선착순 수량 제한"
                hint="정한 수량이 소진되면 자동으로 종료됩니다"
              />
              {form.limits.firstCome && (
                <Input
                  value={form.limits.firstComeQty === 0 ? '' : String(form.limits.firstComeQty)}
                  onChange={(v) => setLimit('firstComeQty', Number(v.replace(/\D/g, '')) || 0)}
                  label="선착순 인원"
                  placeholder="500"
                  inputMode="numeric"
                  error={tried ? errors.firstComeQty : undefined}
                  required
                />
              )}
              <Switch
                checked={form.limits.dated}
                // 켜면 오늘부터 시작하도록 **실제로 채운다.** 빈 칸 두 개를 남기면
                // 켜자마자 오류가 뜨고, 운영자가 오늘 날짜를 직접 쳐야 한다.
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    limits: { ...f.limits, dated: v },
                    startAt: v && !f.startAt ? today() : f.startAt,
                  }))
                }
                label="기간 한정"
                hint="노출 기간이 지나면 사용할 수 없습니다"
              />
              {form.limits.dated && (
                <div className={css({ display: 'flex', gap: '10px', flexWrap: 'wrap' })}>
                  <div className={css({ flex: '1 1 140px', minWidth: '0' })}>
                    <Input
                      value={form.startAt}
                      onChange={(v) => set('startAt', v)}
                      label="노출 시작"
                      placeholder={today()}
                      hint="YYYY-MM-DD"
                    />
                  </div>
                  <div className={css({ flex: '1 1 140px', minWidth: '0' })}>
                    <Input
                      value={form.endAt}
                      onChange={(v) => set('endAt', v)}
                      label="노출 종료"
                      placeholder={today()}
                      error={tried ? errors.period : undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className={css({ flex: '1 1 280px', minWidth: '0', p: '15px 17px' })}>
          <CardTitle title="코드 미리보기" sub="유저가 입력할 값입니다." />
          <div
            className={css({
              mt: '12px',
              p: '15px 13px',
              borderRadius: 'lg',
              bg: 'prev',
              border: '1px dashed token(colors.bd)',
              textAlign: 'center',
            })}
          >
            <div className={css({ textStyle: 'micro', color: 'sub' })}>
              {COUPON_KIND_LABEL[form.kind]}
            </div>
            <div
              className={css({
                mt: '7px',
                fontFamily: 'mono',
                textStyle: 'h3',
                fontWeight: '700',
                color: 'priD',
                wordBreak: 'break-all',
              })}
            >
              {previewCode}
            </div>
            <div className={css({ mt: '6px', textStyle: 'micro', color: 'faint' })}>
              {single
                ? '모든 유저가 같은 코드를 입력합니다'
                : `${num(form.qty)}개를 개별 발급합니다`}
            </div>
          </div>

          <dl
            className={css({
              m: '13px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
            })}
          >
            <Row k="보상" v={`${num(form.rewards.length)}개 항목`} />
            <Row k="발급 수량" v={single ? '무제한' : `${num(form.qty)}개`} />
            <Row
              k="기간"
              v={
                form.limits.dated && form.startAt && form.endAt
                  ? `${form.startAt.slice(5)} – ${form.endAt.slice(5)}`
                  : '제한 없음'
              }
            />
          </dl>

          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '5px', mt: '13px' })}>
            {form.limits.perUser && <Badge size="sm">1인 1회</Badge>}
            {form.limits.firstCome && form.limits.firstComeQty > 0 && (
              <Badge size="sm" tone="warn">
                선착순 {num(form.limits.firstComeQty)}
              </Badge>
            )}
            {form.limits.dated && <Badge size="sm">기간 한정</Badge>}
          </div>
        </Card>
      </div>
    </>
  )
}

function KindOption({ kind, on, pick }: { kind: CouponKind; on: boolean; pick: () => void }) {
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
      <span
        className={css({
          display: 'block',
          textStyle: 'label',
          fontWeight: '700',
          color: on ? 'priD' : 'ink',
        })}
      >
        {COUPON_KIND_LABEL[kind]}
      </span>
      <span className={css({ display: 'block', mt: '2px', textStyle: 'micro', color: 'sub' })}>
        {COUPON_KIND_HINT[kind]}
      </span>
    </button>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
      <dt
        className={css({ flex: 'none', width: '72px', textStyle: 'caption', color: 'faint' })}
      >
        {k}
      </dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textAlign: 'right',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
        })}
      >
        {v}
      </dd>
    </div>
  )
}
