// 자동 생성됨 — 편집하지 마세요. `bun run assets` 로 다시 만듭니다.
import as_body_0 from './as_body_0.svg'
import as_body_1 from './as_body_1.svg'
import as_body_10 from './as_body_10.svg'
import as_body_11 from './as_body_11.svg'
import as_body_12 from './as_body_12.svg'
import as_body_2 from './as_body_2.svg'
import as_body_3 from './as_body_3.svg'
import as_body_4 from './as_body_4.svg'
import as_body_5 from './as_body_5.svg'
import as_body_6 from './as_body_6.svg'
import as_body_7 from './as_body_7.svg'
import as_body_8 from './as_body_8.svg'
import as_body_9 from './as_body_9.svg'
import as_face_0 from './as_face_0.svg'
import as_face_1 from './as_face_1.svg'
import as_face_2 from './as_face_2.svg'
import as_face_3 from './as_face_3.svg'
import as_face_4 from './as_face_4.svg'
import as_face_5 from './as_face_5.svg'
import as_face_6 from './as_face_6.svg'
import as_face_7 from './as_face_7.svg'
import as_face_8 from './as_face_8.svg'
import as_hand_0 from './as_hand_0.svg'
import as_hand_1 from './as_hand_1.svg'
import as_hand_10 from './as_hand_10.svg'
import as_hand_11 from './as_hand_11.svg'
import as_hand_12 from './as_hand_12.svg'
import as_hand_2 from './as_hand_2.svg'
import as_hand_3 from './as_hand_3.svg'
import as_hand_4 from './as_hand_4.svg'
import as_hand_5 from './as_hand_5.svg'
import as_hand_6 from './as_hand_6.svg'
import as_hand_7 from './as_hand_7.svg'
import as_hand_8 from './as_hand_8.svg'
import as_hand_9 from './as_hand_9.svg'
import as_head_0 from './as_head_0.svg'
import as_head_1 from './as_head_1.svg'
import as_head_2 from './as_head_2.svg'
import as_head_3 from './as_head_3.svg'
import as_head_4 from './as_head_4.svg'
import as_head_5 from './as_head_5.svg'
import as_head_6 from './as_head_6.svg'
import as_head_7 from './as_head_7.svg'
import as_head_8 from './as_head_8.svg'
import as_head_9 from './as_head_9.svg'
import nst3b from './nst3b.svg'
import nst3f from './nst3f.svg'
import rg from './rg.svg'
import rgB from './rgB.svg'
import rgE from './rgE.svg'

/** 색이 박혀 있어 <img> 로 지연 로드한다. 값은 번들러가 준 URL. */
export const IMAGES = {
  as_body_0,
  as_body_1,
  as_body_10,
  as_body_11,
  as_body_12,
  as_body_2,
  as_body_3,
  as_body_4,
  as_body_5,
  as_body_6,
  as_body_7,
  as_body_8,
  as_body_9,
  as_face_0,
  as_face_1,
  as_face_2,
  as_face_3,
  as_face_4,
  as_face_5,
  as_face_6,
  as_face_7,
  as_face_8,
  as_hand_0,
  as_hand_1,
  as_hand_10,
  as_hand_11,
  as_hand_12,
  as_hand_2,
  as_hand_3,
  as_hand_4,
  as_hand_5,
  as_hand_6,
  as_hand_7,
  as_hand_8,
  as_hand_9,
  as_head_0,
  as_head_1,
  as_head_2,
  as_head_3,
  as_head_4,
  as_head_5,
  as_head_6,
  as_head_7,
  as_head_8,
  as_head_9,
  nst3b,
  nst3f,
  rg,
  rgB,
  rgE,
} as const

export type AssetId = keyof typeof IMAGES
export const ASSET_IDS = Object.keys(IMAGES) as AssetId[]
export const isAssetId = (v: string): v is AssetId => v in IMAGES
