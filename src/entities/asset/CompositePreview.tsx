/**
 * 올린 그림을 **제자리에 놓고** 보여 준다.
 *
 * 규격 검사는 가로세로를 보지 않는다 — 파일을 열어야 알 수 있고 SVG 는 `viewBox` 를 믿을
 * 수 없다. 그래서 「그림이 맞는지는 미리보기로 사람이 본다」 고 정해 뒀는데
 * (docs/ARCHITECTURE.md §8.5), **파일만 띄우면 그 미리보기가 제 몫을 못 한다.**
 *
 * ⚠️ **둥지를 단독으로 띄우면 위쪽 3/4 이 비어 있다.** 배경 위에 얹히는 오브젝트라 배경과
 *    좌표계가 같고(`0 0 586 576`) 실제 형상이 아래쪽에만 있기 때문이다 (§41.5).
 *    멀쩡한 그림인데 **「잘못 올렸나?」 로 읽힌다** — 배경을 깔아야 비로소 읽힌다.
 *
 * ⚠️ **캐릭터는 배경 위에 얹지 않는다.** 좌표계가 둘이기 때문이다.
 *
 * | | viewBox |
 * |---|---|
 * | 배경 · 둥지 | `0 0 586 576` |
 * | 리그 · 의상 · 성장 | `298 -6 341 491` |
 *
 * 두 공간 사이의 변환은 **클라이언트가 들고 있고 이 저장소에는 없다.** 그래서 캐릭터를
 * 배경에 겹쳐 그리면 **우리가 지어낸 자리**를 보여 주게 된다 — 확인하려던 것이 「자리에
 * 맞는가」 인데 틀린 자리를 보여 주면 없느니만 못하다. 캐릭터는 **리그 프레임 위**에서
 * 앵커선과 맞춰 본다(§19). 어차피 맞춰야 할 대상이 그것이다.
 */
import type { ReactNode } from 'react'

import { css } from 'styled-system/css'

import { IMAGES, isAssetId } from '@/assets/images'

/** 미리보기 틀의 최대 높이(px). 창 안에 버튼까지 들어와야 한다 */
const MAX_H = 330

/** 리그 프레임(`298 -6 341 491`) 안에서 앵커가 차지하는 자리 (%) */
const ANCHOR_PCT = { axisX: 49.85, groundY: 99.19 } as const

type CompositePreviewProps = {
  /**
   * 그릴 그림의 id. **`src` 가 없으면 여기서 빌드 에셋을 찾는다** — `AssetThumb` 과 같은
   * 방식이다.
   *
   * ⚠️ **id 를 안 받으면 「있는 것 중에서 고르기」 가 빈 칸으로 보인다.** 올린 그림만
   *    `src` 를 갖기 때문이다 — 실제로 그렇게 비어 있었다.
   */
  assetId?: string
  /** 올린 그림의 URL (`blob:`). 빌드 에셋이면 없다 */
  src?: string
  /** 어디에 놓고 볼 것인가 */
  on: 'background' | 'rig'
  /** 바닥에 깔 배경. `on === 'background'` 일 때만 쓴다 */
  backdropId?: string
  alt: string
}

/**
 * 합성 미리보기.
 *
 * `background` — 배경 위에 겹친다. 좌표계가 같아 **겹치기만 하면 제자리다.**
 * `rig` — 리그 프레임 위에 겹치고 중심축·접지선을 그어 준다.
 */
export function CompositePreview({
  assetId,
  src: given,
  on,
  backdropId,
  alt,
}: CompositePreviewProps) {
  const backdrop = backdropId && isAssetId(backdropId) ? IMAGES[backdropId] : undefined
  const src = given ?? (assetId && isAssetId(assetId) ? IMAGES[assetId] : undefined)

  if (!src) return <Frame on={on}>{null}</Frame>

  return (
    <Frame on={on}>
      {on === 'background' && backdrop && (
        <img
          src={backdrop}
          alt=""
          className={css({ position: 'absolute', inset: '0', width: 'full', height: 'full' })}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={css({ position: 'absolute', inset: '0', width: 'full', height: 'full' })}
      />
      {on === 'rig' && <Anchors />}
    </Frame>
  )
}

/**
 * 앵커선. **장식이 아니라 판단 기준이다** — 올린 그림의 발이 접지선에 닿는지, 중심이
 * 축에 맞는지가 이 화면에서 확인하려는 전부다.
 */
function Anchors() {
  return (
    <>
      <span
        aria-hidden="true"
        style={{ left: `${ANCHOR_PCT.axisX}%` }}
        className={css({
          position: 'absolute',
          top: '0',
          bottom: '0',
          width: '1px',
          bg: 'pri',
          opacity: '0.45',
        })}
      />
      <span
        aria-hidden="true"
        style={{ top: `${ANCHOR_PCT.groundY}%` }}
        className={css({
          position: 'absolute',
          left: '0',
          right: '0',
          height: '1px',
          bg: 'pri',
          opacity: '0.45',
        })}
      />
    </>
  )
}

/**
 * 비율을 잡는 틀.
 *
 * ⚠️ **비율을 인라인 `style` 로 준다.** 종류마다 다른 값이라 Panda 가 정적으로 못 읽는다 —
 *    `css({ aspectRatio: ratio })` 로 쓰면 클래스 이름만 나가고 규칙이 안 생긴다 (§65).
 *
 * ⚠️ **폭이 아니라 높이를 기준으로 잡는다.** 창 폭을 다 쓰면 캐릭터 프레임(341:491)이
 *    806px 까지 자라 **확인·취소 버튼이 화면 밖으로 밀린다.** 높이를 `MAX_H` 로 정하고
 *    폭을 비율에서 역산한다 — 미리보기는 창 안에 들어와야 미리보기다.
 */
function Frame({ on, children }: { on: 'background' | 'rig'; children: ReactNode }) {
  const [w, h] = on === 'background' ? [586, 576] : [341, 491]

  return (
    <div
      style={{ aspectRatio: `${w} / ${h}`, maxWidth: `${Math.round((MAX_H * w) / h)}px` }}
      className={css({
        position: 'relative',
        width: 'full',
        m: '0 auto',
        borderRadius: 'lg',
        overflow: 'hidden',
        bg: 'prev',
        border: '1px dashed token(colors.bd)',
        display: 'grid',
        placeItems: 'center',
      })}
    >
      {children ?? (
        <span className={css({ textStyle: 'micro', color: 'faint' })}>
          그림을 고르면 여기에 놓고 보여 줍니다
        </span>
      )}
    </div>
  )
}
