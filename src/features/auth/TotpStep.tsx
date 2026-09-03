import { useState, type FormEvent } from 'react'

import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { OtpInput } from '@/shared/ui/OtpInput'

import type { Viewer } from '@/domain/access'
import { TOTP_CODE_LENGTH } from '@/domain/totp'

import { useVerifyTotp } from '@/api/auth'

/**
 * 2차 인증 — TOTP 코드 입력.
 *
 * 디자인 원본의 OTP 화면을 가져오되 **타이머와 "코드 다시 받기" 를 뺐다.**
 * 원본은 이메일로 코드를 보내는 방식이라 만료·재전송이 필요했지만,
 * TOTP 는 인증 앱이 30초마다 스스로 코드를 바꾸므로 보낼 것도 만료시킬 것도 없다.
 *
 * 대신 **백업 코드** 경로를 넣었다 — 폰을 잃으면 들어올 방법이 있어야 한다.
 * 백업 코드는 자릿수가 정해져 있지 않아 칸이 아니라 보통 입력창을 쓴다.
 */
export function TotpStep({
  challenge,
  onBack,
  onSuccess,
}: {
  challenge: string
  onBack: () => void
  onSuccess: (viewer: Viewer) => void
}) {
  const { mutate, isPending, error, reset } = useVerifyTotp()

  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)

  /**
   * 검증을 실제로 부르는 한 자리. 「확인」 과 자동 검증이 같은 길을 지난다.
   *
   * ⚠️ **인자로 받은 코드를 쓴다.** 자동 검증은 마지막 글자를 입력한 그 이벤트에서
   *    불리는데, 그때 `code` 는 아직 한 글자 전이다.
   */
  const verify = (v: string) => {
    // 앞선 요청이 아직 돌고 있으면 겹쳐 보내지 않는다 — 코드는 일회용이다.
    if (isPending) return
    mutate({ challenge, code: v, isBackup: useBackup }, { onSuccess })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    verify(code)
  }

  const change = (v: string) => {
    setCode(v)
    reset()
  }

  const toggleBackup = () => {
    setUseBackup((v) => !v)
    setCode('')
    reset()
  }

  return (
    <form onSubmit={submit}>
      <button
        type="button"
        onClick={onBack}
        className={css({
          appearance: 'none',
          border: '0',
          bg: 'transparent',
          font: 'inherit',
          textStyle: 'label',
          fontWeight: '600',
          color: 'sub',
          cursor: 'pointer',
          p: '0',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          mb: '12px',
          _hover: { color: 'ink' },
        })}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M7.5,2 L3.5,6 L7.5,10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        로그인으로
      </button>

      <h1 className={css({ m: '0', fontSize: '25px', lineHeight: '34px', letterSpacing: '-0.7px', fontWeight: '700' })}>
        인증 코드 입력
      </h1>
      <p className={css({ m: '7px 0 22px', textStyle: 'body', color: 'sub' })}>
        {useBackup
          ? '발급받아 보관 중인 백업 코드를 입력하세요.'
          : '인증 앱에 표시된 6자리 코드를 입력하세요.'}
      </p>

      {error && <ErrorBanner message={error.message} />}

      {useBackup ? (
        <input
          value={code}
          onChange={(e) => change(e.target.value)}
          placeholder="백업 코드"
          autoComplete="off"
          aria-label="백업 코드"
          autoFocus
          className={css({
            width: 'full',
            appearance: 'none',
            border: '1px solid token(colors.bd)',
            borderRadius: 'lg',
            p: '11px 13px',
            font: 'inherit',
            fontSize: '13.5px',
            letterSpacing: '-0.3px',
            color: 'ink',
            bg: 'surf',
            _focusVisible: {
              outline: 'none',
              borderColor: 'ringBd',
              boxShadow: '0 0 0 3px token(colors.ring)',
            },
            _placeholder: { color: 'faint' },
          })}
        />
      ) : (
        <OtpInput
          value={code}
          onChange={change}
          onComplete={verify}
          length={TOTP_CODE_LENGTH}
          invalid={!!error}
          autoFocus
          aria-label="인증 코드 6자리"
        />
      )}

      <div className={css({ display: 'flex', mt: '14px' })}>
        <button
          type="button"
          onClick={toggleBackup}
          className={css({
            appearance: 'none',
            border: '0',
            bg: 'transparent',
            font: 'inherit',
            textStyle: 'label',
            fontWeight: '700',
            color: 'pri',
            cursor: 'pointer',
            p: '0',
            _hover: { color: 'priD' },
          })}
        >
          {useBackup ? '인증 앱 코드로 돌아가기' : '백업 코드로 인증하기'}
        </button>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isPending}
        className={css({ width: 'full', mt: '18px', py: '12px' })}
      >
        {isPending ? '확인 중…' : '확인'}
      </Button>
    </form>
  )
}
