import { useState, type FormEvent } from 'react'

import { useLocation, useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { LOGO } from '@/assets/brand'

import { Button } from '@/shared/ui/Button'
import { Checkbox } from '@/shared/ui/Checkbox'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'

import type { Viewer } from '@/domain/access'
import { SCREENS } from '@/domain/screens'

import { useLogin } from '@/api/auth'

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

  /** 가드가 붙잡아 온 원래 목적지. 없으면 지표로. */
  const from = (location.state as { from?: string } | null)?.from ?? SCREENS.dash.path

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
                    {/* TODO: 비밀번호 재설정 흐름은 백엔드 스펙 확정 후 */}
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
