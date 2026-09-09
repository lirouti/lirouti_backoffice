import { css } from 'styled-system/css'

import { Icon } from '@/shared/ui/Icon'

type CertPhotoPanelProps = {
  /** 자리 아래 덧붙일 설명. 화면마다 무엇을 보고 있는지가 다르다 */
  caption?: string
}

/**
 * 인증 사진 자리.
 *
 * **원본은 목에 없고, 있어도 이 화면 밖으로 나가면 안 되는 개인 콘텐츠다.** 그래서 빈 칸을
 * 두지 않고 **무엇이 들어올 자리인지와 취급 규칙**을 적는다 (docs/ARCHITECTURE.md §23.5).
 *
 * ⚠️ **「열람 기록은 감사 로그에 남습니다」 라고 쓰지 말 것.** 감사 로그 API 가 아직 없다.
 *    남는다고 적으면 운영자는 **추적되고 있다고 믿는다** — 헤더의 정적 「● 라이브」 배지를
 *    지운 것과 같은 문제다. **없는 보증을 표시하는 것은 아무 말도 안 하는 것보다 나쁘다.**
 *    규칙은 지금도 유효하므로 남기고, **상태만 사실대로** 적는다.
 *
 * 신고 처리(§23)와 AI 심사(§23.8)가 같은 사진을 다른 시점에 본다 — 신고는 올라온 뒤,
 * AI 는 올라오는 시점이다. **취급 규칙은 시점과 무관하게 같아서** 여기로 올렸다 (§4.4.2).
 */
export function CertPhotoPanel({ caption }: CertPhotoPanelProps) {
  return (
    <>
      <div
        className={css({
          display: 'grid',
          placeItems: 'center',
          gap: '6px',
          p: '34px 16px',
          borderRadius: 'lg',
          bg: 'prev',
          border: '1px dashed token(colors.bd)',
          color: 'faint',
        })}
      >
        <Icon name="ic_image" size={40} />
        <div className={css({ textStyle: 'label', fontWeight: '600', color: 'sub' })}>
          인증 사진 원본
        </div>
        <div className={css({ textStyle: 'micro' })}>
          모더레이션 화면에서만 열람 · 내려받기 차단
        </div>
        {caption && <div className={css({ textStyle: 'micro' })}>{caption}</div>}
      </div>

      <p
        className={css({
          m: '12px 0 0',
          p: '10px 13px',
          borderRadius: 'lg',
          bg: 'aBg',
          border: '1px solid token(colors.warnBd)',
          textStyle: 'caption',
          color: 'warnFg',
        })}
      >
        <strong>개인 콘텐츠입니다.</strong> 이 화면에서만 열람하고 내려받지 마세요.{' '}
        <strong>열람 기록은 아직 남지 않습니다</strong> — 감사 로그 연동 전이라 지금은
        규칙으로만 지켜집니다.
      </p>
    </>
  )
}
