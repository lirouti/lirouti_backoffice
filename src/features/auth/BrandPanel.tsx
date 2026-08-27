import { css } from 'styled-system/css'

import { LOGO } from '@/assets/brand'

/**
 * 로그인 좌측 패널. 흐르는 그라디언트 위에 블롭 셋이 각각 다른 주기로 떠다닌다.
 * 원본 디자인의 연출을 그대로 옮겼고, keyframes 는 `panda.config.ts` 에 있다.
 */
export function BrandPanel() {
  return (
    <div
      aria-hidden="true"
      className={css({
        flex: '1 1 460px',
        minWidth: '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '30px',
        p: '64px 40px',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage:
          'linear-gradient(160deg,#5FD8EE 0%,#48B6EC 16%,#3B92EC 32%,#3070E2 50%,#2653CA 70%,#1D3C9E 88%,#17318A 100%)',
        backgroundSize: '180% 180%',
        animation: 'rvFlow 24s ease-in-out infinite',
      })}
    >
      <Blob
        className={css({
          top: '-18%',
          left: '-14%',
          width: '520px',
          height: '520px',
          animation: 'rvBlobA 26s ease-in-out infinite',
        })}
        tint="rgba(160,240,255,"
        blur={40}
      />
      <Blob
        className={css({
          bottom: '-22%',
          right: '-16%',
          width: '560px',
          height: '560px',
          animation: 'rvBlobB 32s ease-in-out infinite',
        })}
        tint="rgba(56,110,220,"
        blur={48}
      />
      <Blob
        className={css({
          top: '2%',
          left: '46%',
          width: '320px',
          height: '320px',
          animation: 'rvBlobC 38s ease-in-out infinite',
        })}
        tint="rgba(255,255,255,"
        blur={44}
        faint
      />

      {/* 아래쪽을 눌러 텍스트 대비를 확보한다 */}
      <div
        className={css({
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(180deg,rgba(9,26,74,0) 34%,rgba(9,26,74,.3) 68%,rgba(9,26,74,.52) 100%)',
        })}
      />

      <div
        className={css({
          position: 'relative',
          animation: 'rvFloat 6.5s ease-in-out infinite',
        })}
      >
        <div
          className={css({
            width: '132px',
            height: '132px',
            borderRadius: '34px',
            bg: '#fff',
            border: '1px solid rgba(255,255,255,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 48px rgba(12,42,96,.28)',
          })}
        >
          <img src={LOGO} alt="" width={104} height={104} className={css({ display: 'block' })} />
        </div>
      </div>

      <div className={css({ position: 'relative', textAlign: 'center', maxWidth: '380px' })}>
        <div className={css({ fontSize: '23px', lineHeight: '32px', letterSpacing: '-0.6px', fontWeight: '700', color: '#fff' })}>
          리루티 운영 어드민
        </div>
        <p className={css({ m: '10px 0 0', fontSize: '13.5px', lineHeight: '21px', letterSpacing: '-0.35px', color: '#fff' })}>
          캐릭터와 챌린지, 재화와 상점을 한곳에서 관리합니다. 계정은 운영팀 관리자에게 요청해
          발급받으세요.
        </p>
      </div>
    </div>
  )
}

/**
 * prop 이름을 `color` 로 두면 안 된다 — Panda 가 JSX prop 을 훑어 CSS 속성으로 해석하고
 * `.c_rgba\(160\,240\,255\,` 같은 깨진 클래스를 만든다. 그래서 `tint` 로 부른다.
 */
function Blob({
  className,
  tint,
  blur,
  faint,
}: {
  className: string
  /** `rgba(r,g,b,` 까지의 접두 — 아래에서 알파를 붙인다 */
  tint: string
  blur: number
  faint?: boolean
}) {
  const stops = faint
    ? `${tint}.2) 0%,${tint}.06) 42%,${tint}0) 70%`
    : `${tint}.62) 0%,${tint}.24) 38%,${tint}0) 70%`
  return (
    <div
      className={`${css({ position: 'absolute', borderRadius: '50%' })} ${className}`}
      style={{ background: `radial-gradient(circle,${stops})`, filter: `blur(${blur}px)` }}
    />
  )
}
