import { css } from 'styled-system/css'

import { Card } from '@/shared/ui/Card'
import { PageHeader } from '@/shared/ui/PageHeader'

import { useViewer } from '@/stores/viewerStore'

import { TotpCard } from './TotpCard'

/**
 * 내 계정 보안.
 *
 * 다른 화면과 달리 **권한 스코프가 `me`** 라 누구나 열 수 있다 (`domain/access.ts`).
 * 스코프가 하나도 없는 사람도 자기 계정의 2단계 인증은 켤 수 있어야 한다.
 * 그래서 사이드바 내비에는 없고, 하단 프로필에서 들어온다.
 *
 * 폭을 좁게 잡는다 — 설정 화면은 한 줄이 길어지면 어느 항목의 설명인지 놓친다.
 * 목록 화면처럼 1700px 를 다 쓸 이유가 없다.
 */
export default function SecurityPage() {
  const viewer = useViewer()

  return (
    <div className={css({ maxWidth: '760px' })}>
      <PageHeader title="내 계정 보안" sub="로그인에 쓰이는 인증 수단을 관리합니다." />

      <div className={css({ display: 'flex', flexDirection: 'column', gap: '12px' })}>
        <Card className={css({ p: '16px 20px' })}>
          <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '10px 28px' })}>
            <Line label="이름" value={viewer.name} />
            <Line label="아이디" value={viewer.email} />
            <Line label="권한" value={viewer.role === 'top' ? '최고 관리자' : '라이브 운영'} />
          </div>
        </Card>

        <TotpCard />

        {/*
          패스키는 2차 수단이 아니라 **비번+TOTP 를 통째로 대체하는 별도 경로**로 붙인다
          (패스키 자체가 이미 다요소다). 비번 경로는 남긴다 — 로그인 위치와 기기가 바뀐다.
          WebAuthn challenge 발급·검증 엔드포인트가 필요해 서버 스펙이 나온 뒤로 미뤘다.
        */}
        <Card className={css({ p: '14px 20px' })}>
          <div className={css({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' })}>
            <div className={css({ textStyle: 'body', fontWeight: '700', color: 'faint' })}>
              패스키
            </div>
            <div className={css({ textStyle: 'label', color: 'faint' })}>
              준비 중 · 등록하면 비밀번호와 인증 코드 없이 한 번에 로그인합니다
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className={css({ textStyle: 'micro', color: 'faint', mb: '2px' })}>{label}</div>
      <div className={css({ textStyle: 'body', fontWeight: '600', color: 'ink' })}>{value}</div>
    </div>
  )
}
