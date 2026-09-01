/**
 * 업적 엔티티 타입.
 *
 * 아이템과 달리 **등급·노출 상태가 없다.** 업적은 달성하거나 못 하거나라서 진열이라는
 * 개념이 없고, 그래서 한글로 옮길 코드값도 없다 — `labels.ts` 를 두지 않은 이유다.
 */
import type { AssetExt } from '../asset'

export type Achievement = {
  key: number
  /** 에셋 파일 id — 'as_ach_0' */
  assetId: string
  /**
   * 그림의 URL. **서버가 채운다** — 올린 에셋은 빌드에 없어 `assetId` 로 찾을 수 없다.
   * 비어 있으면 빌드 에셋이라는 뜻이다. 폼이 편집하는 값이 아니라 `AchievementInput` 에는 없다.
   */
  assetSrc?: string
  /** 그림의 파일 형식. 없으면 빌드 에셋이라 SVG 다 */
  assetExt?: AssetExt
  /** 「첫 알」 */
  name: string
  /**
   * 조형 설명 — 「금속 메달 · 월계관」.
   *
   * 다른 엔티티의 `sub` 와 성격이 다르다. 업적은 **규격만 공유하고 조형은 전부 달라서**
   * 무엇으로 그렸는지가 식별 정보다. 카드에서 이름 바로 아래 붙는다.
   */
  sub: string
  /** 달성 조건 — 「계정 생성」. 자유 문자열이다 (판정은 게임 서버가 한다) */
  cond: string
  /** 보상 — 「젬 50」 · 「보금자리」. 젬과 아이템이 섞이므로 자유 문자열이다 */
  reward: string
  /** 달성한 사람 수. 「달성자」 열이 쓴다 */
  earned: number
  /** 달성률 (%). `earned` 와 함께 **서버가 준다** — 전체 유저 수를 화면이 모른다 */
  rate: number
}

/**
 * 폼이 편집하는 부분만.
 *
 * `key`·`earned`·`rate` 는 **서버가 소유한다** — 사람이 손으로 넣는 값이 아니다.
 */
export type AchievementInput = Pick<Achievement, 'assetId' | 'name' | 'sub' | 'cond' | 'reward'>
