import { useState } from 'react'

import { css } from 'styled-system/css'

import { Button } from '@/shared/ui/Button'
import { Checkbox } from '@/shared/ui/Checkbox'

import { backupCodesText } from '@/domain/totp'

import { useUnsavedGuard } from '@/stores/dirtyStore'

import { CopyButton } from './CopyButton'

/**
 * 백업 코드 표시 — **이 화면을 벗어나면 다시 볼 수 없다.**
 *
 * 서버는 해시만 갖고 있어서 되돌려 줄 방법이 없다. 그래서 "다시 보기" 가 아니라
 * "재발급" 이고, 여기서 못 챙기면 폰을 잃었을 때 들어올 길이 사라진다.
 *
 * 그 무게를 UI 로 표현한다:
 *   - 보관 확인 체크 전에는 **완료 버튼이 잠긴다**
 *   - 확인 전까지 이 탭을 **미저장으로 표시**한다 (탭 스트립의 ●, 새로고침 경고)
 */
export function BackupCodesPanel({
  codes,
  account,
  reason,
  onDone,
}: {
  codes: string[]
  account: string
  reason: 'enrolled' | 'regenerated'
  onDone: () => void
}) {
  const [saved, setSaved] = useState(false)

  useUnsavedGuard(!saved)

  const text = backupCodesText(codes, account)

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'riruti-admin-backup-codes.txt'
    a.click()
    // 넘겨준 뒤에는 우리가 들고 있을 이유가 없다. 안 지우면 탭이 닫힐 때까지 메모리에 남는다.
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h3 className={css({ m: '0 0 6px', textStyle: 'h3', color: 'ink' })}>
        {reason === 'enrolled' ? '2단계 인증이 켜졌습니다' : '백업 코드를 새로 발급했습니다'}
      </h3>
      <p className={css({ m: '0 0 14px', textStyle: 'body', color: 'sub' })}>
        {reason === 'regenerated' && '이전 백업 코드는 모두 무효가 되었습니다. '}
        아래 코드를 안전한 곳에 보관하세요.{' '}
        <strong className={css({ color: 'ink' })}>이 화면을 벗어나면 다시 볼 수 없습니다.</strong>
      </p>

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
          gap: '8px',
          p: '14px',
          bg: 'nBg',
          border: '1px solid token(colors.ln)',
          borderRadius: 'lg',
        })}
      >
        {codes.map((c) => (
          <span
            key={c}
            className={css({
              fontFamily: 'mono',
              fontSize: '13.5px',
              letterSpacing: '0.5px',
              color: 'ink',
              textAlign: 'center',
              userSelect: 'all',
            })}
          >
            {c}
          </span>
        ))}
      </div>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px', mt: '12px' })}>
        <CopyButton text={text} label="모두 복사" />
        <Button size="sm" onClick={download}>
          파일로 저장
        </Button>
      </div>

      <div className={css({ mt: '18px', pt: '14px', borderTop: '1px solid token(colors.ln)' })}>
        <Checkbox checked={saved} onChange={setSaved} label="안전한 곳에 보관했습니다" />
        <Button
          variant="primary"
          disabled={!saved}
          onClick={onDone}
          className={css({ mt: '12px' })}
        >
          완료
        </Button>
      </div>
    </div>
  )
}
