/**
 * 관리자 초대.
 *
 * ⚠️ **임시 비밀번호를 화면에 띄우지 않는다.** 원본은 미리보기 카드에 `RT-0000` 을
 *    보여 줬는데, 어깨너머로 읽히는 것도 문제지만 그 값이 **아이디 길이로 만들어져**
 *    누구나 계산할 수 있었다. 초대는 메일로만 간다 (docs/ARCHITECTURE.md §31.7).
 */
import { useState } from 'react'

import { useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Segmented } from '@/shared/ui/Segmented'
import { SkeletonCards } from '@/shared/ui/Skeleton'

import {
  ADMIN_EMAIL_DOMAIN,
  ADMIN_ROLE_DESC,
  ADMIN_ROLE_LABEL,
  ASSIGNABLE_SCOPES,
  normalizeAdminInput,
  validateAdmin,
  type AdminInput,
  type AdminRole,
} from '@/domain/admin'
import { SCREENS } from '@/domain/screens'

import { useAdmins, useInviteAdmin } from '@/api/admins'

import { ScopeGrid } from './ScopeGrid'

const ROLES: { value: AdminRole; label: string }[] = [
  { value: 'operator', label: ADMIN_ROLE_LABEL.operator },
  { value: 'top', label: ADMIN_ROLE_LABEL.top },
]

/** 초대 메일을 받은 사람이 실제로 밟는 순서. 미구현 단계는 넣지 않는다 */
const STEPS = [
  ['1', '초대 메일 수신', '메일의 링크로 첫 로그인'],
  ['2', '비밀번호 설정', '임시 비밀번호는 그때 만료됩니다'],
  ['3', '2단계 인증 등록', '인증 앱 등록까지 마쳐야 들어옵니다'],
]

const EMPTY: AdminInput = { name: '', email: '', role: 'operator', scopes: [] }

export default function AdminInvitePage() {
  const navigate = useNavigate()
  // 중복 아이디를 막으려면 이미 쓰이는 목록이 필요하다. 목록 화면과 같은 쿼리라 캐시를 탄다.
  const { data, isPending, error } = useAdmins({ tab: '전체' })
  const invite = useInviteAdmin()
  const [form, setForm] = useState<AdminInput>(EMPTY)
  // ⚠️ **누르기 전에는 빨갛게 하지 않는다** — 열자마자 혼나는 기분이 든다 (§18.7).
  const [tried, setTried] = useState(false)

  const errors = validateAdmin(form, data?.takenEmails ?? [])
  // ⚠️ **미리보기는 저장될 값을 보여야 한다.** 친 그대로 두면 `JIMIN@Riruti.CO ` 로
  //    발급된다고 말해 놓고 `jimin@riruti.co` 를 만든다 (docs/ARCHITECTURE.md §31.4).
  const saved = normalizeAdminInput(form)
  const top = form.role === 'top'
  const allPicked = form.scopes.length === ASSIGNABLE_SCOPES.length

  const patch = (v: Partial<AdminInput>) => setForm((f) => ({ ...f, ...v }))

  const toggle = (scope: (typeof ASSIGNABLE_SCOPES)[number]) =>
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }))

  const submit = () => {
    setTried(true)
    if (errors.name || errors.email || errors.scopes) return
    invite.mutate(
      { input: form, invitedBy: '김하늘' },
      { onSuccess: () => navigate(SCREENS.admins.path) },
    )
  }

  return (
    <>
      <PageHeader title="관리자 초대" sub="초대 메일을 보내면 계정이 「대기」 상태로 만들어집니다." />

      {/* ⚠️ **헤더는 로딩 중에도 그린다** — 제목·부제·버튼이 데이터를 안 쓴다 (§43.2) */}
      {isPending ? (
        <SkeletonCards count={6} min={220} />
      ) : error ? (
        <ErrorBanner message={error.message} />
      ) : (
        <>
          {invite.error && <ErrorBanner message={invite.error.message} />}

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
                flex: '3 1 480px',
                minWidth: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              })}
            >
              <Card className={css({ p: '18px 20px' })}>
                <CardTitle title="계정 정보" />
                <div
                  className={css({
                    mt: '13px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                  })}
                >
                  <Input
                    value={form.name}
                    onChange={(v) => patch({ name: v })}
                    label="이름"
                    placeholder="예: 김하늘"
                    error={tried ? errors.name : undefined}
                    required
                  />
                  <Input
                    value={form.email}
                    onChange={(v) => patch({ email: v })}
                    label="아이디 (사내 이메일)"
                    placeholder={`name${ADMIN_EMAIL_DOMAIN}`}
                    hint={`${ADMIN_EMAIL_DOMAIN} 로 끝나야 합니다`}
                    error={tried ? errors.email : undefined}
                    required
                  />
                </div>
                <div className={css({ mt: '14px' })}>
                  <div
                    className={css({
                      textStyle: 'label',
                      fontWeight: '600',
                      color: 'ink',
                      mb: '7px',
                    })}
                  >
                    역할
                  </div>
                  <Segmented
                    value={form.role}
                    onChange={(v) => patch({ role: v })}
                    options={ROLES}
                    aria-label="역할"
                  />
                  <p className={css({ m: '7px 0 0', textStyle: 'micro', color: 'sub' })}>
                    {ADMIN_ROLE_DESC[form.role]}
                  </p>
                </div>
              </Card>

              <Card className={css({ p: '18px 20px' })}>
                <div
                  className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '10px',
                  })}
                >
                  <CardTitle title="담당 모듈" />
                  <div className={css({ flex: '1' })} />
                  <Button
                    size="sm"
                    disabled={top}
                    onClick={() => patch({ scopes: allPicked ? [] : [...ASSIGNABLE_SCOPES] })}
                  >
                    {allPicked ? '전체 해제' : '전체 선택'}
                  </Button>
                </div>
                <p
                  className={css({
                    m: '7px 0 12px',
                    textStyle: 'label',
                    color: top ? 'sub' : 'sub',
                  })}
                >
                  {top
                    ? '최고 관리자는 모든 모듈에 접근하며 개별 선택이 필요하지 않습니다.'
                    : '선택한 모듈만 사이드바에 나타납니다.'}
                </p>
                {tried && errors.scopes && <ErrorBanner message={errors.scopes} />}
                <ScopeGrid selected={form.scopes} onToggle={toggle} allOn={top} />
              </Card>

              <Card className={css({ p: '18px 20px' })}>
                <CardTitle title="보안" />
                <ul
                  className={css({
                    m: '12px 0 0',
                    p: '0',
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  })}
                >
                  <Note label="2단계 인증 필수" on>
                    모든 계정이 인증 앱을 등록해야 들어올 수 있습니다. 끌 수 없습니다.
                  </Note>
                  {/* TODO(패스키를 붙이면): 최초 로그인 후 등록 화면을 띄우는 옵션 */}
                  <Note label="생체 등록 안내">패스키가 아직 없습니다. 준비 중입니다.</Note>
                  {/* TODO(서버가 접속 대역을 보기 시작하면): 허용 IP 대역 입력 */}
                  <Note label="사내 IP만 허용">
                    접속 대역을 서버가 아직 보지 않습니다. 준비 중입니다.
                  </Note>
                </ul>
              </Card>

              <div className={css({ display: 'flex', gap: '8px', justifyContent: 'flex-end' })}>
                <Button onClick={() => navigate(SCREENS.admins.path)}>취소</Button>
                <Button variant="primary" onClick={submit} disabled={invite.isPending}>
                  {invite.isPending ? '보내는 중…' : '초대 메일 발송'}
                </Button>
              </div>
            </div>

            <Card className={css({ flex: '1 1 300px', minWidth: '280px', p: '18px 20px' })}>
              <CardTitle title="발급될 계정" />
              <dl
                className={css({
                  m: '13px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '9px',
                })}
              >
                <Row k="이름" v={saved.name || '이름 미입력'} />
                <Row k="아이디" v={saved.email || `name${ADMIN_EMAIL_DOMAIN}`} />
                <Row k="역할" v={ADMIN_ROLE_LABEL[saved.role]} />
                <Row
                  k="담당 모듈"
                  v={
                    top ? `전체 ${ASSIGNABLE_SCOPES.length}개` : `${saved.scopes.length}개 선택`
                  }
                />
                <Row k="첫 로그인 기한" v="발송 후 72시간" />
              </dl>

              <div
                className={css({
                  mt: '15px',
                  pt: '13px',
                  borderTop: '1px solid token(colors.ln)',
                })}
              >
                <div
                  className={css({
                    textStyle: 'label',
                    fontWeight: '700',
                    color: 'ink',
                    mb: '9px',
                  })}
                >
                  받는 사람이 하는 일
                </div>
                <ol
                  className={css({
                    m: '0',
                    p: '0',
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  })}
                >
                  {STEPS.map(([n, label, note]) => (
                    <li key={n} className={css({ display: 'flex', gap: '9px' })}>
                      <span
                        className={css({
                          flex: 'none',
                          w: '20px',
                          h: '20px',
                          borderRadius: 'full',
                          bg: 'soft',
                          color: 'priD',
                          textStyle: 'micro',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        })}
                      >
                        {n}
                      </span>
                      <span className={css({ minWidth: '0' })}>
                        <span
                          className={css({
                            display: 'block',
                            textStyle: 'label',
                            fontWeight: '600',
                            color: 'ink',
                          })}
                        >
                          {label}
                        </span>
                        <span
                          className={css({
                            display: 'block',
                            textStyle: 'micro',
                            color: 'sub',
                          })}
                        >
                          {note}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                {/* 원본에는 임시 비밀번호가 여기 적혀 있었다. 파일 머리말 참고 */}
                <p className={css({ m: '11px 0 0', textStyle: 'micro', color: 'faint' })}>
                  임시 비밀번호는 초대 메일로만 전달되며 화면에 표시되지 않습니다.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

function Note({ label, on, children }: { label: string; on?: boolean; children: string }) {
  return (
    <li className={css({ display: 'flex', gap: '9px', alignItems: 'flex-start' })}>
      <span
        className={css({
          flex: 'none',
          mt: '3px',
          w: '7px',
          h: '7px',
          borderRadius: 'full',
          bg: on ? 'dot' : 'faint2',
        })}
      />
      <span className={css({ minWidth: '0' })}>
        <span className={css({ display: 'block', textStyle: 'label', fontWeight: '600', color: on ? 'ink' : 'sub' })}>
          {label}
        </span>
        <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>{children}</span>
      </span>
    </li>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'baseline', gap: '10px' })}>
      <dt className={css({ flex: 'none', w: '92px', textStyle: 'caption', color: 'faint' })}>{k}</dt>
      <dd
        className={css({
          m: '0',
          flex: '1',
          minWidth: '0',
          textStyle: 'label',
          fontWeight: '600',
          color: 'ink',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        })}
      >
        {v}
      </dd>
    </div>
  )
}
