/**
 * 성장 단계 — 알에서 성체까지 (docs/ARCHITECTURE.md §42).
 *
 * **네 단계는 기획으로 고정이다.** 운영자가 늘리거나 지우지 않는다 — 늘리면 클라이언트에
 * 그 연출이 없다. 대신 **그림과 기준 일수는 바뀐다**(§19.3): 디자이너가 다시 그리고
 * 기획이 경계를 조정한다.
 */
import type { AssetExt } from '../asset'

/**
 * 한 단계.
 *
 * ⚠️ **모든 단계가 날짜로 끝나지는 않는다.** 「금」 은 알과 유체 사이의 짧은 연출이고
 *    **시간이 아니라 사건(부화)으로** 끝난다. 그래서 일수를 갖는 단계와 갈라 둔다 —
 *    하나로 합치면 「금」 에 일수를 넣는 코드가 짜여 버린다.
 */
export type GrowthStage =
  | {
      kind: 'days'
      /** 에셋 파일 id — `as_growth_0` */
      assetId: string
      /** 「알」 */
      name: string
      /**
       * 이 단계가 시작되는 누적 일수. **끝나는 날은 저장하지 않는다** —
       * 다음 단계의 `fromDay` 에서 나온다 (§25.1 과 같은 규칙).
       */
      fromDay: number
      /**
       * 올린 그림의 URL. **파사드가 실어 준다**(`withAssetSrc`) — 올린 에셋은 빌드에 없어
       * `assetId` 로 못 찾기 때문이다 (docs/ARCHITECTURE.md §8.5).
       *
       * 비어 있으면 빌드 에셋이라는 뜻이다.
       */
      assetSrc?: string
      /** 그림의 파일 형식. 없으면 빌드 에셋이라 SVG 다 */
      assetExt?: AssetExt
      /** 이 단계에서 열리는 것 — 「기본 배경 · 잔가지 둥지」 */
      unlock: string
    }
  | {
      kind: 'event'
      assetId: string
      name: string
      /** 날짜 대신 적는 말 — 「부화 직전」 */
      note: string
      /**
       * 올린 그림의 URL. **파사드가 실어 준다**(`withAssetSrc`) — 올린 에셋은 빌드에 없어
       * `assetId` 로 못 찾기 때문이다 (docs/ARCHITECTURE.md §8.5).
       *
       * 비어 있으면 빌드 에셋이라는 뜻이다.
       */
      assetSrc?: string
      /** 그림의 파일 형식. 없으면 빌드 에셋이라 SVG 다 */
      assetExt?: AssetExt
      unlock: string
    }

/** 일수를 갖는 단계만. 경계 계산은 전부 이 좁힌 타입 위에서 한다 */
export type DayStage = Extract<GrowthStage, { kind: 'days' }>

/**
 * 운영자가 고치는 값. **`fromDay` 만 담는다** — 이름·해금·그림은 다른 경로다.
 *
 * 첫 단계(알)는 언제나 0일차부터라 **경계가 아니다.** 그래서 네 단계 중 고치는 것은
 * 둘뿐이다 (유체 시작 · 성체 시작).
 */
export type GrowthBoundaries = {
  /** 유체가 시작되는 날 */
  juvenileFrom: number
  /** 성체가 시작되는 날 */
  adultFrom: number
}
