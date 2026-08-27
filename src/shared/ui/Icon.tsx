import { css, cx } from 'styled-system/css'

import { ICONS, type IconId } from '@/assets/icons'

export type { IconId }

type IconProps = {
  name: IconId
  size?: number
  className?: string
}

/**
 * UI 아이콘.
 *
 * 아이콘 SVG 는 `stroke="currentColor"` 를 쓰므로 **인라인 컴포넌트여야** 색을 물려받는다.
 * (`<img>` 로는 CSS color 가 닿지 않는다.) svgr 이 각 .svg 를 컴포넌트로 바꿔주고,
 * 실제로 import 된 것만 번들에 들어간다.
 */
export function Icon({ name, size = 16, className }: IconProps) {
  const Svg = ICONS[name]
  return (
    <Svg
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cx(css({ flex: 'none' }), className)}
    />
  )
}
