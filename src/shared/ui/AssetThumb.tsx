import { css, cx } from 'styled-system/css'

import { IMAGES, isAssetId } from '@/assets/images'

type AssetThumbProps = {
  /** 에셋 id — 'as_head_0' */
  assetId: string
  size?: number
  /** 유료 등급이면 타일 배경을 어둡게 (원본 규칙) */
  paid?: boolean
  /** 스크린리더용 이름. 없으면 장식으로 처리한다. */
  alt?: string
  className?: string
}

/**
 * 캐릭터 에셋 썸네일.
 *
 * 에셋 SVG 는 색이 박혀 있어 currentColor 를 쓰지 않으므로 `<img>` 로 띄운다.
 * 파일 단위로 캐시되고, 화면에 실제로 보이는 것만 내려받는다 — 50개를 한 덩어리로
 * 받던 예전 스프라이트 방식과 다른 점이다. (docs/ARCHITECTURE.md §8)
 */
export function AssetThumb({ assetId, size = 42, paid = false, alt, className }: AssetThumbProps) {
  const src = isAssetId(assetId) ? IMAGES[assetId] : null

  return (
    <div
      className={cx(
        css({
          flex: 'none',
          borderRadius: 'lg',
          border: '1px solid token(colors.ln)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bg: paid ? 'tilePaid' : 'prev',
        }),
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? ''}
          loading="lazy"
          decoding="async"
          width={size}
          height={size}
          className={css({ display: 'block', width: 'full', height: 'full' })}
        />
      ) : (
        // 원본이 잘려 빠진 에셋(as_face_9 등). 조용히 비우지 않고 표시해 둔다.
        <span
          title={`에셋 없음: ${assetId}`}
          className={css({ textStyle: 'micro', color: 'faint' })}
        >
          ?
        </span>
      )}
    </div>
  )
}
