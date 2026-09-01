/**
 * 배경 엔티티 타입.
 *
 * 배경은 **장소를 정하는 슬롯**이고 둥지와 독립이라 조합해서 쓴다. 그래서 착용 슬롯도
 * 노출 상태도 없다 — 아이템과 달리 「어디에 다는가」 가 하나뿐이다.
 */
import type { AssetExt } from '../asset'
import type { Tier } from '../item/types'

export type Background = {
  key: number
  /** 에셋 파일 id — 'as_bg_0' */
  assetId: string
  /**
   * 그림의 URL. **서버가 채운다** — 올린 에셋은 빌드에 없어 `assetId` 로 찾을 수 없다.
   * 비어 있으면 빌드 에셋이라는 뜻이고, 폼이 편집하는 값이 아니라 `BackgroundInput` 에는 없다.
   */
  assetSrc?: string
  /** 그림의 파일 형식. 없으면 빌드 에셋이라 SVG 다 */
  assetExt?: AssetExt
  /** 「스튜디오」 · 「밤하늘」 */
  name: string
  /**
   * 과금 등급. **아이템의 `Tier` 를 그대로 쓴다.**
   *
   * 같은 게임의 같은 「무료/유료」 개념이라 따로 정의하면 라벨이 두 벌이 되고, 한쪽만
   * 바뀌었을 때 화면마다 다른 말을 하게 된다. 함께 바뀌어야 하는 값이라 함께 둔다.
   */
  tier: Tier
  /** 젬 가격. 무료면 0 */
  price: number
}

/**
 * 폼이 편집하는 부분만. `key` 는 서버가 소유한다.
 *
 * 분류(시간·계절·장소·상황)는 **여기 없다.** 원본 에셋 표에는 있지만 이 화면 어디에도
 * 표시되지 않아서, 폼에 두면 아무 데도 나타나지 않는 값을 운영자가 고르게 된다.
 * 그 정보는 에셋 카탈로그(`mocks/assetTable.ts`)가 들고 있다.
 */
export type BackgroundInput = Pick<Background, 'assetId' | 'name' | 'tier' | 'price'>
