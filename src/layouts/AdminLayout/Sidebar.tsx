/**
 * 사이드바 — 내비 트리와 하단 프로필.
 *
 * 트리는 `domain/nav` 에서 오고 권한 필터는 `useScopedNav` 가 한다.
 * ⚠️ **`layouts` 는 `api` 를 부를 수 없다** (docs/ARCHITECTURE.md §4.3). 로그아웃은 `setSignOutHandler`
 *    로 주입받는다 — 401 핸들러와 같은 패턴이다.
 */
import { NavLink, useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { LOGO } from '@/assets/brand'

import { Icon } from '@/shared/ui/Icon'

import { groupOf, type NavGroup } from '@/domain/nav'
import { LOGIN_PATH, SCREENS, sectionOf } from '@/domain/screens'

import { useNavStore } from '@/stores/navStore'
import { useViewer, useViewerStore } from '@/stores/viewerStore'

import { useCurrentScreen, useScopedNav } from './useScopedNav'

export function Sidebar() {
  const navigate = useNavigate()
  const nav = useScopedNav()
  const current = useCurrentScreen()
  const viewer = useViewer()

  const activeGroup = current ? groupOf(current, nav) : undefined

  return (
    <aside
      className={css({
        width: '238px',
        minWidth: '200px',
        flex: 'none',
        bg: 'surf',
        borderRight: '1px solid token(colors.bd)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: '0',
        height: '100vh',
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          p: '18px 18px 16px',
        })}
      >
        {/* 로고가 이미 파란 그라디언트라 배경 사각형을 씌우면 겹친다. 그대로 놓는다. */}
        <img
          src={LOGO}
          alt=""
          width={32}
          height={32}
          className={css({ flex: 'none', display: 'block' })}
        />
        <div>
          <div className={css({ textStyle: 'body', fontWeight: '700', color: 'ink' })}>
            리루티
          </div>
          <div className={css({ textStyle: 'micro', color: 'faint' })}>운영 어드민</div>
        </div>
      </div>

      <nav
        className={css({
          flex: '1',
          overflowY: 'auto',
          p: '4px 10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        })}
      >
        {nav.map((g) => (
          <Group key={g.label} group={g} isActiveGroup={activeGroup?.label === g.label} />
        ))}
      </nav>

      <div
        className={css({
          p: '12px 14px',
          borderTop: '1px solid token(colors.ln)',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
        })}
      >
        {/*
          내 계정 보안(`/security`)은 **내비 트리에 없다** — 사이드바 그룹은 권한 스코프
          단위인데 자기 계정 설정은 권한과 무관하다. 대신 프로필을 누르면 열린다.
        */}
        <button
          type="button"
          onClick={() => navigate(SCREENS.security.path)}
          title="내 계정 보안"
          className={css({
            flex: '1',
            minWidth: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            appearance: 'none',
            border: '0',
            bg: 'transparent',
            font: 'inherit',
            textAlign: 'left',
            p: '4px 6px',
            m: '-4px -6px',
            borderRadius: 'md',
            cursor: 'pointer',
            _hover: { bg: 'hov' },
          })}
        >
          <span
            aria-hidden="true"
            className={css({
              width: '28px',
              height: '28px',
              flex: 'none',
              borderRadius: '50%',
              bg: 'avB',
              color: 'avF',
              textStyle: 'micro',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            {viewer.name.charAt(0)}
          </span>
          <span className={css({ flex: '1', minWidth: '0' })}>
            <span
              className={css({
                display: 'block',
                textStyle: 'label',
                fontWeight: '700',
                color: 'ink',
              })}
            >
              {viewer.name}
            </span>
            <span className={css({ display: 'block', textStyle: 'micro', color: 'faint' })}>
              {viewer.role === 'top' ? '최고 관리자' : '라이브 운영'}
            </span>
          </span>
        </button>
        <SignOutButton />
      </div>
    </aside>
  )
}

function Group({ group, isActiveGroup }: { group: NavGroup; isActiveGroup: boolean }) {
  const navigate = useNavigate()
  const current = useCurrentScreen()
  const open = useNavStore((s) => s.open[group.label])
  const toggle = useNavStore((s) => s.toggle)

  // 값이 저장되어 있지 않으면 "현재 화면이 속한 그룹이면 펼침"이 기본값이다.
  const expanded = open ?? isActiveGroup

  if (!group.children) {
    const on = group.screen === current
    return (
      <button
        type="button"
        onClick={() => navigate(SCREENS[group.screen!].path)}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          p: '9px 10px',
          borderRadius: 'md',
          border: '0',
          cursor: 'pointer',
          textAlign: 'left',
          bg: on ? 'soft' : 'transparent',
          color: on ? 'priD' : 'ink',
          _hover: { bg: on ? 'soft' : 'hov' },
        })}
      >
        <Icon name={group.icon} className={css({ color: on ? 'pri' : 'faint' })} />
        <span className={css({ flex: '1', textStyle: 'body', fontWeight: '600' })}>
          {group.label}
        </span>
      </button>
    )
  }

  return (
    <div className={css({ display: 'flex', flexDirection: 'column' })}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => toggle(group.label, isActiveGroup)}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          p: '9px 10px',
          borderRadius: 'md',
          border: '0',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'ink',
          bg: isActiveGroup && !expanded ? 'soft' : 'transparent',
          _hover: { bg: 'hov' },
        })}
      >
        <Icon name={group.icon} className={css({ color: isActiveGroup ? 'pri' : 'faint' })} />
        <span className={css({ flex: '1', textStyle: 'body', fontWeight: '600' })}>
          {group.label}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={css({ flex: 'none', color: 'faint2', transition: 'transform .15s' })}
          style={{ transform: expanded ? 'none' : 'rotate(-90deg)' }}
        >
          <path
            d="M2.5,4.5 L6,8.5 L9.5,4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {expanded && (
        <div
          className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            p: '2px 0 4px',
          })}
        >
          {group.children.map((c) => (
            <NavLink
              key={c.screen}
              to={SCREENS[c.screen].path}
              className={({ isActive }) => {
                const on = isActive || (current != null && sectionOf(current) === c.screen)
                return css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  p: '7px 10px 7px 35px',
                  borderRadius: 'md',
                  textStyle: 'body',
                  // 활성 화면이 없으면(탭을 다 닫음) 아무것도 켜지 않는다.
                  // `?? 'dash'` 로 두면 지표가 켜진 것처럼 보인다.
                  bg: on ? 'soft' : 'transparent',
                  color: on ? 'priD' : 'sub',
                  fontWeight: on ? '700' : '500',
                  _hover: { bg: 'hov' },
                })
              }}
            >
              <span>{SCREENS[c.screen].label}</span>
              {c.count != null && (
                <span
                  className={css({
                    ml: 'auto',
                    textStyle: 'micro',
                    fontWeight: '700',
                    color: 'sub',
                    bg: 'nBg',
                    p: '1px 6px',
                    borderRadius: 'xs',
                  })}
                >
                  {c.count}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function SignOutButton() {
  const navigate = useNavigate()
  const signOut = useViewerStore((s) => s.signOut)

  return (
    <button
      type="button"
      aria-label="로그아웃"
      title="로그아웃"
      onClick={async () => {
        await signOut()
        navigate(LOGIN_PATH, { replace: true })
      }}
      className={css({
        width: '28px',
        height: '28px',
        flex: 'none',
        borderRadius: 'sm',
        border: '0',
        bg: 'transparent',
        color: 'faint2',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: '0',
        _hover: { bg: 'hov', color: 'ink' },
      })}
    >
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M6.2,2.6 H3.4 A1,1 0 0,0 2.4,3.6 V12.4 A1,1 0 0,0 3.4,13.4 H6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M10,5 L13,8 L10,11 M13,8 H6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
