import { useState, type FormEvent } from 'react'

import { useLocation, useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { LOGO } from '@/assets/brand'

import { Button } from '@/shared/ui/Button'
import { Checkbox } from '@/shared/ui/Checkbox'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'

import type { Viewer } from '@/domain/access'
import { matchScreen, SCREENS } from '@/domain/screens'

import { IS_MOCK_LOGIN, useLogin } from '@/api/auth'

import { useThemeStore } from '@/stores/themeStore'
import { useViewerStore } from '@/stores/viewerStore'

import { BrandPanel } from './BrandPanel'
import { PasswordField, TextField } from './Field'
import { TotpStep } from './TotpStep'

/**
 * 로그인 화면. 어드민 셸(사이드바·탭) 밖이라 `AdminLayout` 을 쓰지 않는다.
 *
 * 디자인 원본에는 OTP · 생체 등록 · 완료 단계가 더 있는데, 둘 다 서버 계약이 필요해
 * (OTP 발송·검증 엔드포인트, WebAuthn challenge) 백엔드 스펙이 나온 뒤로 미뤘다.
 * "완료" 단계는 정적 캔버스라 필요했던 것이고, SPA 에서는 바로 어드민으로 보낸다.
 */
/**
 * 로그인 뒤 어디로 갈 것인가.
 *
 * `RequireAuth` 가 실어 보낸 목적지를 그대로 쓰되, **화면을 가리키지 않으면 지표로** 보낸다.
 *
 * ⚠️ **루트(`/`)가 그 경우다.** 배포 주소를 그냥 열면 가드가 `from: '/'` 를 실어 보내는데,
 *    `/` 는 어느 화면에도 매칭되지 않아(docs/ARCHITECTURE.md §10) 로그인하자마자 **빈 작업공간**이 뜬다 —
 *    "로그인했는데 아무것도 없다" 로 읽힌다. 처음 들어온 사람이 가장 먼저 보는 화면이라
 *    지표가 맞다.
 *
 * ⚠️ **`/` 자체를 지표로 리다이렉트하는 것과 다르다.** 셸 안에서 마지막 탭을 닫으면
 *    여전히 `/` 로 가고 빈 작업공간이 뜬다 — 그건 "열린 탭이 없음" 을 URL 로 말하는
 *    의도된 상태다(§10). 여기서 바꾸는 것은 **로그인 직후 한 번**뿐이다.
 *
 * 북마크한 `/items/3` 은 그대로 그리로 간다.
 */
function landingPath(from: string | undefined): string {
  // `from` 은 `pathname + search` 라 쿼리를 떼고 봐야 한다.
  if (from && matchScreen(from.split('?')[0]!)) return from
  return SCREENS.dash.path
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useViewerStore((s) => s.signIn)
  const { mutate, isPending, error, reset } = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  /** 1차를 통과하면 받는 일회용 토큰. 있으면 2차 화면이다. */
  const [challenge, setChallenge] = useState<string | null>(null)

  /** 가드가 붙잡아 온 원래 목적지. 화면을 가리키지 않으면 지표로 (§16.4). */
  const from = landingPath((location.state as { from?: string } | null)?.from)

  const finish = (viewer: Viewer) => {
    signIn(viewer)
    navigate(from, { replace: true })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    mutate(
      { email, password, keepSignedIn },
      {
        onSuccess: (result) => {
          // 세션은 2차까지 통과해야 열린다. 1차만으로 들여보내면 2FA 가 무의미하다.
          if (result.status === 'totp_required') setChallenge(result.challenge)
          else finish(result.viewer)
        },
      },
    )
  }

  return (
    <div
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        minHeight: '100vh',
        bg: 'page',
        color: 'ink',
      })}
    >
      <BrandPanel />

      {/*
        `<main>` 이 있어야 스크린리더가 "본문으로 건너뛰기"를 할 수 있다.
        어드민 셸에는 이미 있는데(`AdminLayout`), 로그인은 셸 밖이라 따로 붙인다.
        브랜드 패널은 장식이므로 본문에 넣지 않는다.
      */}
      <main
        className={css({
          flex: '1 1 420px',
          minWidth: '0',
          display: 'flex',
          flexDirection: 'column',
          p: '22px clamp(20px, 4vw, 40px) 40px',
        })}
      >
        <div className={css({ display: 'flex', justifyContent: 'flex-end' })}>
          <ThemeToggle />
        </div>

        <div
          className={css({
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          })}
        >
          <div className={css({ width: 'full', maxWidth: '372px' })}>
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                mb: '26px',
              })}
            >
              <img
                src={LOGO}
                alt=""
                width={40}
                height={40}
                className={css({ flex: 'none', display: 'block' })}
              />
              <div>
                <div
                  className={css({
                    fontSize: '15px',
                    fontWeight: '700',
                    letterSpacing: '-0.4px',
                  })}
                >
                  리루티
                </div>
                <div className={css({ textStyle: 'micro', color: 'faint' })}>운영 어드민</div>
              </div>
            </div>

            {challenge ? (
              <TotpStep
                challenge={challenge}
                onBack={() => {
                  setChallenge(null)
                  reset()
                }}
                onSuccess={finish}
              />
            ) : (
              <>
                <h1
                  className={css({
                    m: '0',
                    fontSize: '25px',
                    lineHeight: '34px',
                    letterSpacing: '-0.7px',
                    fontWeight: '700',
                  })}
                >
                  로그인
                </h1>
                <p className={css({ m: '7px 0 24px', textStyle: 'body', color: 'sub' })}>
                  운영팀 계정으로 접속하세요.
                </p>

                {IS_MOCK_LOGIN && <DemoNotice />}

                {error && <ErrorBanner message={error.message} />}

                <form
                  onSubmit={submit}
                  className={css({ display: 'flex', flexDirection: 'column', gap: '14px' })}
                >
                  <TextField
                    label="아이디"
                    type="email"
                    value={email}
                    onChange={(v) => {
                      setEmail(v)
                      reset()
                    }}
                    placeholder="name@riruti.co"
                    autoComplete="username"
                    autoFocus
                  />
                  <PasswordField
                    label="비밀번호"
                    value={password}
                    onChange={(v) => {
                      setPassword(v)
                      reset()
                    }}
                  />

                  <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
                    <Checkbox
                      checked={keepSignedIn}
                      onChange={setKeepSignedIn}
                      label="로그인 상태 유지"
                    />
                    <div className={css({ flex: '1' })} />
                    {/* TODO(백엔드 스펙 확정 후): 비밀번호 재설정 흐름 */}
                    <span
                      className={css({
                        textStyle: 'label',
                        fontWeight: '600',
                        color: 'faint',
                        cursor: 'not-allowed',
                      })}
                    >
                      비밀번호 재설정
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isPending}
                    className={css({ mt: '2px', py: '12px' })}
                  >
                    {isPending ? '확인 중…' : '로그인'}
                  </Button>
                </form>
              </>
            )}

            <div
              className={css({
                mt: '26px',
                pt: '18px',
                borderTop: '1px solid token(colors.ln)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 14px',
                alignItems: 'center',
                textStyle: 'micro',
                color: 'faint',
              })}
            >
              <span>문의: ops@riruti.co</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const dark = theme === 'dark'
  return (
    <Button
      size="icon"
      onClick={toggle}
      aria-label={dark ? '밝은 화면으로' : '어두운 화면으로'}
      className={css({ color: 'sub' })}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8,1.4 V3 M8,13 V14.6 M1.4,8 H3 M13,8 H14.6 M3.4,3.4 L4.5,4.5 M11.5,11.5 L12.6,12.6 M12.6,3.4 L11.5,4.5 M4.5,11.5 L3.4,12.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M13.2,10.2 A5.6,5.6 0 0,1 5.8,2.8 A5.9,5.9 0 1,0 13.2,10.2 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </Button>
  )
}

/**
 * 데모 안내.
 *
 * **잠금이 아니라 안내다.** 목 로그인은 아무나 통과시키므로 막는 역할을 할 수 없다.
 * 대신 두 가지를 막는다 — 우연히 들어온 사람이 **진짜 운영 어드민으로 오해하는 것**과,
 * 데모를 보는 사람이 **로그인 정보를 물어보는 것**.
 *
 * ⚠️ **목일 때만 뜬다**(`IS_MOCK_LOGIN`). 실서버에서는 이 문구가 거짓말이 된다.
 *
 * 규칙은 `domain/access.ts` 의 `validateCredentials` 와 `api/auth.ts` 의 목 분기에서 온다 —
 * 그쪽이 바뀌면 이 문구도 함께 고쳐야 한다.
 */
function DemoNotice() {
  return (
    <div
      className={css({
        p: '11px 14px',
        mb: '16px',
        borderRadius: 'lg',
        bg: 'aBg',
        border: '1px solid token(colors.warnBd)',
        textStyle: 'caption',
        color: 'warnFg',
        lineHeight: '19px',
      })}
    >
      <strong className={css({ fontWeight: '700' })}>데모 환경입니다.</strong> 실제 데이터가 아니며
      아무 계정으로 들어옵니다 — <strong className={css({ fontWeight: '700' })}>이메일 형식 아이디</strong>와{' '}
      <strong className={css({ fontWeight: '700' })}>8자 이상 비밀번호</strong>, 인증 코드는{' '}
      <code className={css({ fontFamily: 'mono' })}>000000</code> 이 아닌 아무 6자리.
      <br />
      아이디를 <code className={css({ fontFamily: 'mono' })}>op@</code> 로 시작하면 권한이 제한된
      운영자 화면을 볼 수 있습니다.
    </div>
  )
}
