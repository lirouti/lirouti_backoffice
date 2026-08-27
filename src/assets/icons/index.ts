// 자동 생성됨 — 편집하지 마세요. `bun run assets` 로 다시 만듭니다.
import ic_bird from './ic_bird.svg?react'
import ic_card from './ic_card.svg?react'
import ic_chart from './ic_chart.svg?react'
import ic_chat from './ic_chat.svg?react'
import ic_code from './ic_code.svg?react'
import ic_cog from './ic_cog.svg?react'
import ic_flag from './ic_flag.svg?react'
import ic_gem from './ic_gem.svg?react'
import ic_image from './ic_image.svg?react'
import ic_medal from './ic_medal.svg?react'
import ic_shield from './ic_shield.svg?react'
import ic_shield2 from './ic_shield2.svg?react'
import ic_shirt from './ic_shirt.svg?react'
import ic_up from './ic_up.svg?react'
import ic_user from './ic_user.svg?react'

/** currentColor 를 쓰므로 컴포넌트로 인라인한다. */
export const ICONS = {
  ic_bird,
  ic_card,
  ic_chart,
  ic_chat,
  ic_code,
  ic_cog,
  ic_flag,
  ic_gem,
  ic_image,
  ic_medal,
  ic_shield,
  ic_shield2,
  ic_shirt,
  ic_up,
  ic_user,
} as const

export type IconId = keyof typeof ICONS
export const ICON_IDS = Object.keys(ICONS) as IconId[]
