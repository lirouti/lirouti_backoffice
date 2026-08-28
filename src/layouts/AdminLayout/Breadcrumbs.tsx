/**
 * 브레드크럼.
 *
 * 경로가 아니라 **화면 메타**(`domain/screens`)에서 만든다. 상세 화면은
 * `sectionOf` 로 부모 목록을 한 단계 끼워 넣는다 — `/items/3` 은
 * "리루티 > 아이템 > 아이템 목록 > 아이템 상세".
 */
import { Link } from 'react-router'

import { css } from 'styled-system/css'

import type { IconId } from '@/assets/icons'

import { Icon } from '@/shared/ui/Icon'

import { groupOf } from '@/domain/nav'
import { SCREENS, sectionOf, type ScreenId } from '@/domain/screens'

import { useScopedNav } from './useScopedNav'

type Crumb = {
  label: string
  icon?: IconId
  to?: string
}

export function Breadcrumbs({ current }: { current: ScreenId | null }) {
  const nav = useScopedNav()
  const crumbs = buildCrumbs(nav, current)

  return (
    <nav
      aria-label="현재 위치"
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        minWidth: '0',
        flex: '0 1 auto',
      })}
    >
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <div key={`${c.label}-${i}`} className={css({ display: 'flex', alignItems: 'center', gap: '5px', minWidth: '0' })}>
            {i > 0 && (
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" className={css({ flex: 'none', color: 'faint2' })}>
                <path d="M4.5,2.5 L8,6 L4.5,9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <Crumb crumb={c} last={last} />
          </div>
        )
      })}
    </nav>
  )
}

function Crumb({ crumb, last }: { crumb: Crumb; last: boolean }) {
  const style = css({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    minWidth: '0',
    p: '3px 7px',
    borderRadius: 'sm',
    textStyle: 'label',
    fontWeight: last ? '700' : '500',
    color: last ? 'ink' : 'sub',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    _hover: last ? {} : { bg: 'hov' },
  })

  const inner = (
    <>
      {crumb.icon && <Icon name={crumb.icon} size={13} className={css({ color: last ? 'pri' : 'faint' })} />}
      <span className={css({ overflow: 'hidden', textOverflow: 'ellipsis' })}>{crumb.label}</span>
    </>
  )

  if (last || !crumb.to) return <span className={style}>{inner}</span>
  return (
    <Link to={crumb.to} className={style}>
      {inner}
    </Link>
  )
}

function buildCrumbs(nav: ReturnType<typeof useScopedNav>, current: ScreenId | null): Crumb[] {
  const out: Crumb[] = [{ label: '리루티', icon: 'ic_bird', to: SCREENS.dash.path }]
  if (!current) return out

  const group = groupOf(current, nav)
  if (group) {
    const groupTarget = group.screen ?? group.children?.[0]?.screen
    out.push({
      label: group.label,
      icon: group.icon,
      to: groupTarget ? SCREENS[groupTarget].path : undefined,
    })
  }

  // 상세 화면이면 부모 섹션을 한 단계 더 끼워 넣는다.
  const section = sectionOf(current)
  if (section !== current) out.push({ label: SCREENS[section].label, to: SCREENS[section].path })

  const leaf = SCREENS[current].label
  // 그룹 라벨과 잎 라벨이 같으면 중복 표시하지 않는다.
  if (out[out.length - 1]!.label !== leaf) out.push({ label: leaf })
  return out
}
