import { css, cx } from 'styled-system/css'

import { IMAGES, isAssetId } from '@/assets/images'

type AssetThumbProps = {
  /** 에셋 id — 'as_head_0' */
  assetId: string
  /**
   * 그림의 URL. 주면 이걸 그리고, 없으면 `assetId` 로 빌드 에셋을 찾는다.
   *
   * 올린 에셋이 이 경로를 탄다 — 빌드에 없는 그림이라 `assetId` 로는 못 찾는다.
   * 목에서는 `blob:` URL 이라 새로고침하면 깨진다(그때는 아이템도 함께 사라진다).
   */
  src?: string
  /** 한 변의 길이(px). `fluid` 면 무시된다 */
  size?: number
  /**
   * 담는 칸의 **폭을 채우고 정사각으로** 늘어난다 (그리드 타일).
   *
   * 테두리와 모서리는 그리지 않는다 — 감싸는 쪽이 이미 갖고 있어서
   * 안쪽에 또 그리면 둥근 상자 안에 둥근 상자가 생긴다.
   */
  fluid?: boolean
  /** 스크린리더용 이름. 없으면 장식으로 처리한다. */
  alt?: string
  className?: string
} & PlateProps

/**
 * 그림 뒤에 깔리는 판.
 *
 * ⚠️ **판 없이 세워야 하는 그림이 있다.** 업적 뱃지가 그렇다 — 원본이 「배경판 없이
 *    오브젝트 자체로 선다」 고 정했고, 판을 깔면 12종이 한 세트로 보이던 게 깨진다.
 *
 * `paid` 는 **판의 색**이라 판이 없으면 뜻이 없다. 유니온으로 묶어 둘을 같이 넘기면
 * 타입에서 걸리게 한다 — 조용히 무시하면 왜 안 어두워지는지 알 수 없다 (`Switch` 와 같은 방식).
 */
type PlateProps =
  | {
      plate?: true
      /** 유료 등급이면 타일 배경을 어둡게 (원본 규칙) */
      paid?: boolean
    }
  | { plate: false; paid?: never }

/**
 * 캐릭터 에셋 썸네일.
 *
 * 에셋 SVG 는 색이 박혀 있어 currentColor 를 쓰지 않으므로 `<img>` 로 띄운다.
 * 파일 단위로 캐시되고, 화면에 실제로 보이는 것만 내려받는다 — 50개를 한 덩어리로
 * 받던 예전 스프라이트 방식과 다른 점이다. (docs/ARCHITECTURE.md §8)
 */
export function AssetThumb({ assetId, src: given, size = 42, fluid = false, plate = true, paid = false, alt, className }: AssetThumbProps) {
  const src = given ?? (isAssetId(assetId) ? IMAGES[assetId] : null)

  return (
    <div
      className={cx(
        css({
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }),
        fluid
          ? css({ width: 'full', aspectRatio: '1' })
          : css({ flex: 'none', borderRadius: 'lg', border: '1px solid token(colors.ln)' }),
        plate ? css({ bg: paid ? 'tilePaid' : 'prev' }) : undefined,
        className,
      )}
      style={fluid ? undefined : { width: size, height: size }}
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
        //
        // ⚠️ 대체 표시에서도 `alt` 를 **접근 가능한 이름으로** 살려야 한다.
        //    `title` 만으로는 보장되지 않는다 — 접근 가능한 이름 계산에서 최후순위이고
        //    무시하는 스크린리더가 있다. 그러면 아이템 이름 대신 "물음표"가 읽힌다.
        //    지금 실제로 `as_face_9`(광대코)가 이 경로를 탄다.
        <span
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
          title={`에셋 없음: ${assetId}`}
          className={css({ textStyle: 'micro', color: 'faint' })}
        >
          ?
        </span>
      )}
    </div>
  )
}
