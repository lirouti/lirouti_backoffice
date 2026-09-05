/**
 * 문의 상세 — 대화 · 답변 · 작성자.
 *
 * **작성자는 실제 회원이다** — 문의가 `userKey` 로 가리키고 파사드가 합쳐 준다
 * (docs/ARCHITECTURE.md §28.2).
 */
import { useState } from 'react'

import { useNavigate, useParams } from 'react-router'

import { css } from 'styled-system/css'

import { useFormDraft } from '@/shared/hooks/useFormDraft'
import { changed, restoreDraft } from '@/shared/lib/draft'
import { date, num } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { DraftNotice, DraftSavedAt } from '@/shared/ui/DraftNotice'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Select } from '@/shared/ui/Select'
import { SkeletonHeader, SkeletonRows } from '@/shared/ui/Skeleton'
import { Switch } from '@/shared/ui/Switch'
import { Textarea } from '@/shared/ui/Textarea'

import { replyTemplates } from '@/domain/faq'
import {
  canHold,
  canReply,
  durationLabel,
  INQUIRY_CATEGORY_TONE,
  INQUIRY_STATUS_TONE,
  isOpen,
  isOverdue,
  validateReply,
  waitMinutes,
  type InquiryMessage,
} from '@/domain/inquiry'
import { PAY_STATUS_LABEL, PAY_STATUS_TONE } from '@/domain/payment'
import { SCREENS } from '@/domain/screens'
import { SOCIAL_LABEL, USER_STATUS_LABEL } from '@/domain/user'

import { useFaqs } from '@/api/faq'
import {
  useHoldInquiry,
  useInquiry,
  useReplyInquiry,
  type InquiryDetail,
} from '@/api/inquiries'

import { useViewer } from '@/stores/viewerStore'

export default function InquiryDetailPage() {
  const { qnaId = '' } = useParams()
  const { data, isPending, error } = useInquiry(qnaId)

  if (isPending) {
    // ⚠️ **제목을 그릴 수 없다** — 상세 화면의 제목은 불러온 값이다(「소이」 · 「첫 알」).
    //    그래서 헤더도 자리만 잡는다. 아는 것과 모르는 것을 섞지 않는다 (docs/ARCHITECTURE.md §43.2).

    return (
      <>
        <SkeletonHeader />

        <SkeletonRows rows={6} silent />
      </>
    )
  }
  if (error || !data)
    return <ErrorBanner message={error?.message ?? '문의를 불러오지 못했습니다.'} />

  // ⚠️ **`key={qnaId}` 가 없어도 되는 이유는 keep-alive 다.** 문의를 옮겼는데 같은
  //    인스턴스가 남으면 1번에 쓰다 만 답변이 `inquiries:2` 에 쓰인다(§33.7 이 FAQ 에서
  //    겪은 것). 여기서 안 나는 것은 `KeepAlive` 의 `activeCacheKey` 가 **경로**라
  //    상세마다 캐시 항목이 갈리기 때문이다 — 넣어 보고 뺐다(측정: 캐시된 2번으로 옮겨도
  //    입력칸이 비어 있고 `inquiries:2` 가 생기지 않는다).
  return <Detail detail={data} />
}

/**
 * 작성 중인 답변.
 *
 * ⚠️ **문의마다 따로 남긴다.** 한 칸을 나눠 쓰면 A 문의에 쓰다 만 답변이 B 문의를 열었을 때
 *    입력창에 들어앉는다 — 남의 문의에 남의 답을 보내게 된다 (docs/ARCHITECTURE.md §58).
 */
type ReplyDraft = { text: string; notify: boolean }

const draftScope = (qnaId: number): string => `inquiries:${qnaId}`

const EMPTY_DRAFT: ReplyDraft = { text: '', notify: true }

function Detail({
  detail: { inquiry: q, user, payments, past, now },
}: {
  detail: InquiryDetail
}) {
  const navigate = useNavigate()
  const viewer = useViewer()
  const { data: faqs } = useFaqs()
  const reply = useReplyInquiry()
  const hold = useHoldInquiry()
  const [restored] = useState(() => restoreDraft(draftScope(q.key), EMPTY_DRAFT))
  const [text, setText] = useState(restored?.text ?? EMPTY_DRAFT.text)
  const [notify, setNotify] = useState(restored?.notify ?? EMPTY_DRAFT.notify)
  const [asking, setAsking] = useState(false)
  const [tried, setTried] = useState(false)
  // ⚠️ **알림 표시 여부는 따로 둔다.** `restored` 는 마운트 시점에 고정이라
  //    「새로 시작」 으로 버려도 계속 참이고 알림이 안 지워진다.
  const [noticeOpen, setNoticeOpen] = useState(restored != null)
  const draft = useFormDraft(
    draftScope(q.key),
    { text, notify },
    changed({ text, notify }, EMPTY_DRAFT),
  )

  const errors = validateReply(text)
  const waited = waitMinutes(q, now)
  const late = isOverdue(q, now)
  const templates = replyTemplates(faqs?.faqs ?? [])

  const ask = () => {
    setTried(true)
    if (Object.keys(errors).length === 0) setAsking(true)
  }

  const commit = () =>
    reply.mutate(
      { qnaId: q.key, text, by: viewer.name, notify },
      {
        onSuccess: () => {
          setAsking(false)
          setTried(false)
          setText('')
          setNotify(EMPTY_DRAFT.notify)
          // ⚠️ **보낸 뒤에는 반드시 지운다.** 안 지우면 다음에 이 문의를 열었을 때
          //    **이미 보낸 답변**이 입력창에 남아, 두 번 보내기 쉬워진다.
          draft.clear()
          setNoticeOpen(false)
        },
      },
    )

  return (
    <>
      <PageHeader
        title={q.title}
        sub={`${q.code} · ${q.at} 접수`}
        actions={
          <>
            <Button onClick={() => navigate(SCREENS.qna.path)}>목록</Button>
            {canHold(q.status) && (
              <Button
                onClick={() => hold.mutate({ qnaId: q.key, by: viewer.name })}
                disabled={hold.isPending}
              >
                보류
              </Button>
            )}
            {/* 답변을 FAQ 로 올리면 다음 사람은 문의하지 않아도 된다 */}
            <Button
              onClick={() =>
                navigate(
                  `${SCREENS.faqnew.path}?q=${encodeURIComponent(q.title)}&a=${encodeURIComponent(text)}`,
                )
              }
            >
              FAQ로 등록
            </Button>
          </>
        }
      />

      {reply.error && <ErrorBanner message={reply.error.message} />}
      {hold.error && <ErrorBanner message={hold.error.message} />}

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          mb: '16px',
          flexWrap: 'wrap',
        })}
      >
        <Badge tone={INQUIRY_CATEGORY_TONE[q.category]}>{q.category}</Badge>
        <Badge tone={INQUIRY_STATUS_TONE[q.status]}>{q.status}</Badge>
        {q.reopened && <Badge tone="danger">재문의</Badge>}
        {waited !== null && (
          <span
            className={css({
              textStyle: 'caption',
              color: late ? 'rFg' : 'faint',
              fontWeight: late ? '700' : '400',
            })}
          >
            {/* 열린 건인지로 가른다 — `answeredAt` 으로 가르면 재문의 건이 「답변함」 이 된다 */}
            {isOpen(q.status)
              ? `${durationLabel(waited)} 대기 중`
              : `${durationLabel(waited)} 만에 답변`}
          </span>
        )}
      </div>

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
            <CardTitle title="대화" />
            <div
              className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '11px',
                mt: '13px',
              })}
            >
              {q.messages.map((m, i) => (
                <Bubble key={`${m.at}-${i}`} message={m} />
              ))}
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
                <CardTitle title="답변 작성" sub="앱 알림과 함께 전달됩니다." />
              </div>
              <Select
                value=""
                onChange={(v) => {
                  const hit = templates.find((f) => String(f.key) === v)
                  if (hit) setText(hit.answer)
                }}
                placeholder="FAQ 에서 불러오기"
                options={templates.map((f) => ({ value: String(f.key), label: f.question }))}
                aria-label="답변 템플릿"
              />
            </div>

            {noticeOpen && (
              <DraftNotice
                onDiscard={() => {
                  draft.clear()
                  setText(EMPTY_DRAFT.text)
                  setNotify(EMPTY_DRAFT.notify)
                  setNoticeOpen(false)
                }}
              />
            )}

            <div className={css({ mt: '13px' })}>
              <Textarea
                value={text}
                onChange={setText}
                label="답변"
                placeholder="유저에게 전달할 답변을 입력하세요."
                error={tried ? errors.text : undefined}
                required
                rows={5}
              />
            </div>

            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                mt: '13px',
                flexWrap: 'wrap',
              })}
            >
              <Switch checked={notify} onChange={setNotify} label="앱 알림 발송" />
              <span className={css({ flex: '1' })} />
              {/*
                ⚠️ **브라우저에만 남는다.** 다른 기기에서는 안 보이고 새 탭에서도 안 보인다
                   — 「쓰다 만 것을 잃지 않게」 가 목적이지 공유가 아니다 (§58).
                TODO(임시 저장 API 가 생기면): 서버에 남겨 기기 간에 이어 쓰게 한다
              */}
              <Button
                onClick={draft.saveNow}
                disabled={!changed({ text, notify }, EMPTY_DRAFT)}
              >
                임시 저장
              </Button>
              <Button
                variant="primary"
                onClick={ask}
                disabled={reply.isPending || !canReply(q.status)}
              >
                {canReply(q.status) ? '답변 발송' : '보류 중'}
              </Button>
            </div>

            <DraftSavedAt at={draft.savedAt} />
            {!canReply(q.status) && (
              <p className={css({ m: '10px 0 0', textStyle: 'caption', color: 'sub' })}>
                보류를 푼 뒤에 답할 수 있습니다.
              </p>
            )}
          </Card>
        </div>

        <div
          className={css({
            flex: '1 1 300px',
            minWidth: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          })}
        >
          <Card className={css({ p: '15px' })}>
            <CardTitle title="작성자" />
            {user ? (
              <>
                <div
                  className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    mt: '12px',
                  })}
                >
                  <span
                    aria-hidden="true"
                    className={css({
                      display: 'grid',
                      placeItems: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: 'full',
                      bg: 'avB',
                      color: 'avF',
                      textStyle: 'label',
                      fontWeight: '700',
                    })}
                  >
                    {user.nick.slice(0, 1)}
                  </span>
                  <span className={css({ minWidth: '0' })}>
                    <span
                      className={css({
                        display: 'block',
                        textStyle: 'label',
                        fontWeight: '700',
                        color: 'ink',
                      })}
                    >
                      {user.nick}
                    </span>
                    <span
                      className={css({
                        display: 'block',
                        fontFamily: 'mono',
                        textStyle: 'micro',
                        color: 'faint',
                      })}
                    >
                      {user.uid}
                    </span>
                  </span>
                </div>
                <dl
                  className={css({
                    m: '13px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  })}
                >
                  <Row k="상태" v={USER_STATUS_LABEL[user.status]} />
                  <Row k="로그인" v={SOCIAL_LABEL[user.social]} />
                  <Row k="파란보석" v={`${num(user.wallet.gem)}개`} />
                  {/* ⚠️ 원본은 「주황보석」 이라 부르지만 코드와 회원 상세는 「노란보석」 이다 */}
                  <Row k="노란보석" v={`${num(user.wallet.topaz)}개`} />
                  <Row k="누적 결제" v={`${num(user.paid)}원`} />
                  <Row k="누적 인증" v={`${num(user.certs)}회`} />
                  <Row k="가입" v={date(user.joinedAt)} />
                </dl>
                <div className={css({ mt: '13px' })}>
                  <Button
                    onClick={() =>
                      navigate(SCREENS.user.path.replace(':userId', String(user.key)))
                    }
                  >
                    회원 상세
                  </Button>
                </div>
              </>
            ) : (
              // 탈퇴했거나 지워진 회원. 빈 칸을 두면 화면이 고장난 것으로 보인다.
              <p className={css({ m: '12px 0 0', textStyle: 'body', color: 'rFg' })}>
                탈퇴했거나 찾을 수 없는 회원입니다. 답변은 앱에 남지만 알림은 가지 않습니다.
              </p>
            )}
          </Card>

          <Card className={css({ p: '15px' })}>
            <CardTitle title="최근 결제" sub="결제 문의는 여기부터 봅니다." />
            {payments.length === 0 ? (
              <p className={css({ m: '12px 0 0', textStyle: 'body', color: 'faint' })}>
                결제 내역이 없습니다.
              </p>
            ) : (
              <ul
                className={css({
                  listStyle: 'none',
                  m: '12px 0 0',
                  p: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                })}
              >
                {payments.map((p) => (
                  <li
                    key={p.key}
                    className={css({ display: 'flex', alignItems: 'center', gap: '9px' })}
                  >
                    <span className={css({ flex: '1', minWidth: '0' })}>
                      <span
                        className={css({
                          display: 'block',
                          textStyle: 'label',
                          fontWeight: '600',
                          color: 'ink',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        })}
                      >
                        {p.product}
                      </span>
                      <span
                        className={css({
                          display: 'block',
                          textStyle: 'micro',
                          color: 'faint',
                        })}
                      >
                        {p.at}
                      </span>
                    </span>
                    <span
                      className={css({
                        flex: 'none',
                        textStyle: 'caption',
                        fontWeight: '600',
                        color: 'ink',
                      })}
                    >
                      {num(p.amount)}원
                    </span>
                    <Badge tone={PAY_STATUS_TONE[p.status]} size="sm">
                      {PAY_STATUS_LABEL[p.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className={css({ p: '15px' })}>
            <CardTitle title="이 유저의 지난 문의" />
            {past.length === 0 ? (
              <p className={css({ m: '12px 0 0', textStyle: 'body', color: 'faint' })}>
                처음 보낸 문의입니다.
              </p>
            ) : (
              <ul
                className={css({
                  listStyle: 'none',
                  m: '12px 0 0',
                  p: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '9px',
                })}
              >
                {past.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(SCREENS.qnadet.path.replace(':qnaId', String(p.key)))
                      }
                      className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        textAlign: 'left',
                        border: '0',
                        bg: 'transparent',
                        p: '0',
                        cursor: 'pointer',
                        _focusVisible: {
                          outline: '2px solid token(colors.ringBd)',
                          outlineOffset: '2px',
                        },
                      })}
                    >
                      <Badge tone={INQUIRY_STATUS_TONE[p.status]} size="sm">
                        {p.status}
                      </Badge>
                      <span
                        className={css({
                          flex: '1',
                          minWidth: '0',
                          textStyle: 'caption',
                          color: 'ink',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        })}
                      >
                        {p.title}
                      </span>
                      <span
                        className={css({ flex: 'none', textStyle: 'micro', color: 'faint' })}
                      >
                        {p.at.slice(5, 10)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={asking}
        onCancel={() => setAsking(false)}
        onConfirm={commit}
        title="답변을 보냅니다"
        tone="danger"
        confirmLabel={reply.isPending ? '보내는 중…' : '답변 발송'}
        body={
          <>
            {user ? `${user.nick} 님` : '이 유저'}에게 답변이 전달됩니다.
            {notify && user && ' 앱 알림도 함께 갑니다.'}
            {' 보낸 답변은 되돌릴 수 없습니다.'}
            {!user && (
              <span
                className={css({
                  display: 'block',
                  mt: '9px',
                  color: 'rFg',
                  fontWeight: '600',
                })}
              >
                회원을 찾을 수 없어 알림은 가지 않습니다.
              </span>
            )}
          </>
        }
      />
    </>
  )
}

function Bubble({ message: m }: { message: InquiryMessage }) {
  const admin = m.from === 'admin'
  return (
    <div className={css({ display: 'flex', gap: '10px' })}>
      <span
        aria-hidden="true"
        className={css({
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          width: '28px',
          height: '28px',
          borderRadius: 'full',
          bg: admin ? 'pri' : 'avB',
          color: admin ? 'onPri' : 'avF',
          textStyle: 'micro',
          fontWeight: '700',
        })}
      >
        {admin ? '운' : m.name.slice(0, 1)}
      </span>
      <div
        className={css({
          flex: '1',
          minWidth: '0',
          p: '10px 13px',
          borderRadius: 'lg',
          bg: admin ? 'soft' : 'surf2',
          border: '1px solid',
          borderColor: admin ? 'liveBd' : 'ln',
        })}
      >
        <div
          className={css({
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px',
            mb: '5px',
          })}
        >
          <span className={css({ textStyle: 'caption', fontWeight: '700', color: 'ink' })}>
            {m.name}
          </span>
          {/* ⚠️ 운영자 말풍선은 `soft` 배경이라 `faint` 가 4.35:1 로 모자란다 (§3.5.1) */}
          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textStyle: 'micro',
              color: 'sub',
            })}
          >
            {/* 알림 없이 남긴 답변은 유저가 못 볼 수 있다 — 나중에 근거가 된다 (§28.4) */}
            {m.notified === false && (
              <span className={css({ color: 'warnFg', fontWeight: '700' })}>알림 없음</span>
            )}
            {m.at}
          </span>
        </div>
        <p className={css({ m: '0', textStyle: 'body', color: 'sub', whiteSpace: 'pre-line' })}>
          {m.text}
        </p>
      </div>
    </div>
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
