import { useState, type FormEvent } from 'react'

import { css } from 'styled-system/css'

import { date } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { Icon } from '@/shared/ui/Icon'
import { OtpInput } from '@/shared/ui/OtpInput'
import { SkeletonRows } from '@/shared/ui/Skeleton'

import { TOTP_CODE_LENGTH, type TotpEnrollment } from '@/domain/totp'

import {
  useDisableTotp,
  useRegenerateBackupCodes,
  useStartTotpEnrollment,
  useTotpStatus,
} from '@/api/security'

import { useViewer } from '@/stores/viewerStore'

import { BackupCodesPanel } from './BackupCodesPanel'
import { EnrollWizard } from './EnrollWizard'

/**
 * 지금 카드가 무엇을 보여주고 있는가.
 *
 * 불리언 서너 개(`enrolling`·`disabling`·`showingCodes`)로 두면 둘이 동시에 켜지는
 * 상태가 만들어진다. 한 번에 하나만 열리는 게 규칙이므로 합집합 타입으로 못 하게 막는다.
 */
type Panel =
  | { kind: 'none' }
  | { kind: 'enroll'; enrollment: TotpEnrollment }
  | { kind: 'disable' }
  | { kind: 'codes'; codes: string[]; reason: 'enrolled' | 'regenerated' }

export function TotpCard() {
  const viewer = useViewer()
  const { data, isPending, error } = useTotpStatus()
  const start = useStartTotpEnrollment()
  const regenerate = useRegenerateBackupCodes()

  const [panel, setPanel] = useState<Panel>({ kind: 'none' })

  const busy = start.isPending || regenerate.isPending

  // ⚠️ `Shell` 은 오류에만 쓴다 — 「오는 중」은 글자가 아니라 자리로 말한다 (docs/ARCHITECTURE.md §43).
  if (isPending) {
    return (
      <Card className={css({ p: '18px 20px' })}>
        <SkeletonRows rows={3} />
      </Card>
    )
  }
  if (error) return <Shell tone="danger">{error.message}</Shell>

  const beginEnroll = () =>
    start.mutate(viewer.email, {
      onSuccess: (enrollment) => setPanel({ kind: 'enroll', enrollment }),
    })

  const beginRegenerate = () =>
    regenerate.mutate(undefined, {
      onSuccess: (codes) => setPanel({ kind: 'codes', codes, reason: 'regenerated' }),
    })

  return (
    <Card className={css({ p: '18px 20px 20px' })}>
      <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' })}>
        <Icon name="ic_shield" className={css({ color: data.enabled ? 'gFg' : 'faint' })} />
        <div className={css({ textStyle: 'h3', color: 'ink' })}>2단계 인증</div>
        <Badge tone={data.enabled ? 'success' : 'warn'} size="md">
          {data.enabled ? '켜짐' : '꺼짐'}
        </Badge>

        <div className={css({ flex: '1' })} />

        {panel.kind === 'none' &&
          (data.enabled ? (
            <div className={css({ display: 'flex', gap: '8px' })}>
              <Button size="sm" disabled={busy} onClick={beginRegenerate}>
                {regenerate.isPending ? '발급 중…' : '백업 코드 재발급'}
              </Button>
              <Button size="sm" onClick={() => setPanel({ kind: 'disable' })}>
                끄기
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="primary" disabled={busy} onClick={beginEnroll}>
              {start.isPending ? '준비 중…' : '2단계 인증 켜기'}
            </Button>
          ))}
      </div>

      <p className={css({ m: '10px 0 0', textStyle: 'body', color: 'sub' })}>
        {data.enabled ? (
          <>
            {data.enrolledAt && `${date(data.enrolledAt)} 등록 · `}
            백업 코드 {data.backupCodesLeft}개 남음
          </>
        ) : (
          '비밀번호만으로 로그인할 수 있는 상태입니다. 인증 앱을 등록해 두면 비밀번호가 새어도 계정이 열리지 않습니다.'
        )}
      </p>

      {(start.error || regenerate.error) && (
        <div className={css({ mt: '14px' })}>
          <ErrorBanner message={(start.error ?? regenerate.error)!.message} />
        </div>
      )}

      {panel.kind !== 'none' && (
        <div className={css({ mt: '18px', pt: '18px', borderTop: '1px solid token(colors.ln)' })}>
          {panel.kind === 'enroll' && (
            <EnrollWizard
              enrollment={panel.enrollment}
              onCancel={() => setPanel({ kind: 'none' })}
              onIssued={(codes) => setPanel({ kind: 'codes', codes, reason: 'enrolled' })}
            />
          )}

          {panel.kind === 'codes' && (
            <BackupCodesPanel
              codes={panel.codes}
              account={viewer.email}
              reason={panel.reason}
              onDone={() => setPanel({ kind: 'none' })}
            />
          )}

          {panel.kind === 'disable' && <DisablePanel onClose={() => setPanel({ kind: 'none' })} />}
        </div>
      )}
    </Card>
  )
}

/**
 * 해제 — **현재 코드를 요구한다.**
 *
 * 확인 창 한 번으로 끌 수 있으면, 자리를 비운 사이 누구나 2단계 인증을 걷어내고
 * 비밀번호만으로 들어올 수 있다. 그러면 켜 둔 의미가 없다.
 */
function DisablePanel({ onClose }: { onClose: () => void }) {
  const { mutate, isPending, error, reset } = useDisableTotp()

  const [code, setCode] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    mutate(code, { onSuccess: onClose })
  }

  return (
    <form onSubmit={submit} noValidate>
      <h3 className={css({ m: '0 0 6px', textStyle: 'h3', color: 'ink' })}>2단계 인증 끄기</h3>
      <p className={css({ m: '0 0 14px', textStyle: 'body', color: 'sub' })}>
        본인 확인을 위해 인증 앱에 표시된 코드를 입력하세요. 끄면 남은 백업 코드도 모두
        무효가 됩니다.
      </p>

      {error && <ErrorBanner message={error.message} />}

      {/*
        ⚠️ **여기는 `onComplete` 를 달지 않는다.** 로그인과 등록은 코드를 다 넣으면 바로
           검증하지만(§16.3.1), 해제는 **끄는 동작**이다 — 자리를 채우는 것으로 2단계 인증이
           걷히면 「끄기」 를 누르게 한 이유가 사라진다. 마지막 한 번의 누름이 안전장치다.
      */}
      <div className={css({ maxWidth: '340px' })}>
        <OtpInput
          value={code}
          onChange={(v) => {
            setCode(v)
            // 해제가 도는 중에는 `reset()` 하지 않는다 (§16.3.1)
            if (!isPending) reset()
          }}
          length={TOTP_CODE_LENGTH}
          invalid={!!error}
          autoFocus
          aria-label={`인증 코드 ${TOTP_CODE_LENGTH}자리`}
        />
      </div>

      <div className={css({ display: 'flex', gap: '8px', mt: '18px' })}>
        <Button onClick={onClose}>취소</Button>
        <Button type="submit" disabled={isPending} className={css({ color: 'rFg' })}>
          {isPending ? '해제 중…' : '끄기'}
        </Button>
      </div>
    </form>
  )
}

function Shell({ children, tone }: { children: React.ReactNode; tone?: 'danger' }) {
  return (
    <Card className={css({ p: '18px 20px' })}>
      <div className={css({ textStyle: 'body', color: tone === 'danger' ? 'rFg' : 'faint' })}>
        {children}
      </div>
    </Card>
  )
}
