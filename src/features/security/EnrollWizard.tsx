import { useState, type FormEvent } from 'react'

import { QRCodeSVG } from 'qrcode.react'

import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { OtpInput } from '@/shared/ui/OtpInput'

import { groupSecret, otpauthUri, TOTP_CODE_LENGTH, type TotpEnrollment } from '@/domain/totp'

import { useConfirmTotpEnrollment } from '@/api/security'

import { CopyButton } from './CopyButton'

/**
 * 2단계 인증 등록 마법사 — 스캔 → 확인.
 *
 * 시크릿은 이미 발급받아 prop 으로 받는다. 마법사가 마운트되면서 스스로 발급하지 않는
 * 이유는, 그러면 "켜기" 를 눌렀다가 마음을 바꿔 닫을 때마다 서버에 쓰레기 시크릿이
 * 쌓이기 때문이다. 발급은 버튼을 실제로 누른 순간 한 번만 일어난다.
 *
 * **확인 단계는 건너뛸 수 없다.** 인증 앱이 실제로 맞는 코드를 내는지 보지 않고 켜면,
 * QR 을 잘못 스캔한 사람이 그대로 계정에서 잠긴다.
 */
export function EnrollWizard({
  enrollment,
  onIssued,
  onCancel,
}: {
  enrollment: TotpEnrollment
  /** 등록 완료 — 서버가 발급한 백업 코드 */
  onIssued: (codes: string[]) => void
  onCancel: () => void
}) {
  const { mutate, isPending, error, reset } = useConfirmTotpEnrollment()

  const [step, setStep] = useState<'scan' | 'confirm'>('scan')
  const [code, setCode] = useState('')

  /** 「2단계 인증 켜기」 와 자동 검증이 같은 길을 지난다 (`TotpStep` 과 같은 이유) */
  const verify = (v: string) => {
    if (isPending) return
    mutate({ secret: enrollment.secret, code: v }, { onSuccess: onIssued })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    verify(code)
  }

  const changeCode = (v: string) => {
    setCode(v)
    // 검증이 도는 중에는 `reset()` 하지 않는다 (`TotpStep` 과 같은 이유)
    if (!isPending) reset()
  }

  if (step === 'confirm') {
    return (
      <form onSubmit={submit}>
        <StepTitle n={2} title="인증 앱에 뜬 코드를 입력하세요" />
        <p className={css({ m: '0 0 16px', textStyle: 'body', color: 'sub' })}>
          코드는 {TOTP_CODE_LENGTH}자리이고 30초마다 바뀝니다. 곧 바뀔 것 같으면 다음 코드를
          기다렸다 입력하세요.
        </p>

        {error && <ErrorBanner message={error.message} />}

        <div className={css({ maxWidth: '340px' })}>
          <OtpInput
            value={code}
            onChange={changeCode}
            onComplete={verify}
            length={TOTP_CODE_LENGTH}
            invalid={!!error}
            autoFocus
            aria-label={`인증 코드 ${TOTP_CODE_LENGTH}자리`}
          />
        </div>

        <div className={css({ display: 'flex', gap: '8px', mt: '18px' })}>
          <Button
            onClick={() => {
              setStep('scan')
              reset()
            }}
          >
            이전
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? '확인 중…' : '2단계 인증 켜기'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div>
      <StepTitle n={1} title="인증 앱으로 QR 을 스캔하세요" />
      <p className={css({ m: '0 0 16px', textStyle: 'body', color: 'sub' })}>
        Google Authenticator · 1Password · Authy 등 TOTP 를 지원하는 앱이면 무엇이든 됩니다.
      </p>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' })}>
        {/*
          QR 은 **테마를 따르지 않는다.** 어두운 배경에 검은 모듈을 그리면 스캐너가 못 읽는다.
          여백(quiet zone)도 흰색이어야 해서 흰 카드를 통째로 깔고 그 위에 그린다.
        */}
        <div
          className={css({
            flex: 'none',
            bg: '#FFFFFF',
            p: '12px',
            borderRadius: 'lg',
            border: '1px solid token(colors.bd)',
            lineHeight: '0',
          })}
        >
          <QRCodeSVG
            value={otpauthUri(enrollment)}
            size={168}
            // 로고를 얹지 않으므로 낮은 정정 수준으로 충분하다. 모듈이 적을수록 잘 읽힌다.
            level="M"
            bgColor="#FFFFFF"
            fgColor="#000000"
            marginSize={0}
          />
        </div>

        <div className={css({ flex: '1 1 280px', minWidth: '0' })}>
          <div className={css({ textStyle: 'label', fontWeight: '700', color: 'sub', mb: '6px' })}>
            QR 을 쓸 수 없나요?
          </div>
          <p className={css({ m: '0 0 10px', textStyle: 'caption', color: 'faint' })}>
            앱에 이 키를 직접 입력하세요. 계정 이름은 <strong>{enrollment.account}</strong> 입니다.
          </p>
          <div
            className={css({
              p: '10px 12px',
              bg: 'nBg',
              border: '1px solid token(colors.ln)',
              borderRadius: 'md',
              fontFamily: 'mono',
              fontSize: '12.5px',
              letterSpacing: '0.6px',
              lineHeight: '20px',
              color: 'ink',
              wordBreak: 'break-all',
              userSelect: 'all',
            })}
          >
            {groupSecret(enrollment.secret)}
          </div>
          <div className={css({ mt: '8px' })}>
            <CopyButton text={enrollment.secret} label="키 복사" />
          </div>
        </div>
      </div>

      <div className={css({ display: 'flex', gap: '8px', mt: '20px' })}>
        <Button onClick={onCancel}>취소</Button>
        <Button variant="primary" onClick={() => setStep('confirm')}>
          다음
        </Button>
      </div>
    </div>
  )
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '9px', mb: '6px' })}>
      <span
        aria-hidden="true"
        className={css({
          width: '22px',
          height: '22px',
          flex: 'none',
          borderRadius: '50%',
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
      <h3 className={css({ m: '0', textStyle: 'h3', color: 'ink' })}>
        <span className={css({ srOnly: true })}>{n}단계. </span>
        {title}
      </h3>
    </div>
  )
}
