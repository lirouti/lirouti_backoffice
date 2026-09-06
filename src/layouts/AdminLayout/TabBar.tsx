import { useEffect, useRef, useState } from 'react'

import { useLocation, useNavigate } from 'react-router'

import { css, cx } from 'styled-system/css'

import { Dialog } from '@/shared/ui/Dialog'

import { canAccess } from '@/domain/access'
import { matchScreen, SCREENS, sectionOf, type ScreenId } from '@/domain/screens'

import { useDirtyStore } from '@/stores/dirtyStore'
import { livePaths, useTabsStore, type OpenTab } from '@/stores/tabsStore'
import { useViewer } from '@/stores/viewerStore'

/**
 * 스크롤되는 스트립.
 *
 * 흐림 폭 28px 은 탭 하나(약 90~200px)의 일부만 덮는 값이다. 더 넓으면 탭 라벨이
 * 읽히지 않고, 더 좁으면 "잘렸다"가 아니라 "렌더가 덜 됐다"처럼 보인다.
 *
 * `data-fade` 로 정적 규칙 네 개를 미리 만들어 둔다 — 값을 인라인 style 로 넣으면
 * Panda 가 정적 추출을 못 해 클래스 자체가 만들어지지 않는다.
 */
const strip = css({
  display: 'flex',
  // ⚠️ **`stretch` 다**(원본). `center` 로 바꾸면 탭이 스트립 높이를 채우지 않아
  //    밑줄이 스트립 바닥에서 떠 버린다.
  alignItems: 'stretch',
  // 활성 탭을 끌어올 때 `offsetLeft` 를 쓴다. 그 값은 **가장 가까운 위치 지정
  // 조상** 기준이라, 스트립에 position 이 없으면 바깥 요소(셸의 sticky 헤더)가
  // 기준이 되어 scrollLeft 와 좌표계가 어긋난다. 여기로 고정한다.
  position: 'relative',
  px: 'clamp(10px, 1.6vw, 22px)',
  minHeight: '37px',
  overflowX: 'auto',
  // 끝에서 계속 밀어도 브라우저 뒤로가기(가로 오버스크롤)가 발동하지 않게
  overscrollBehaviorX: 'contain',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
  '&[data-fade="left"]': {
    maskImage: 'linear-gradient(to right, transparent, black 28px)',
  },
  '&[data-fade="right"]': {
    maskImage: 'linear-gradient(to left, transparent, black 28px)',
  },
  '&[data-fade="both"]': {
    maskImage:
      'linear-gradient(to right, transparent, black 28px, black calc(100% - 28px), transparent)',
  },
})

/**
 * 열린 화면 탭 스트립.
 *
 * 탭 키는 **사이드바의 서브 메뉴**다. 상세·등록·수정 화면은 부모 탭 안에서 바뀌며,
 * 탭 이름은 서브 메뉴 이름을 유지한다 (docs/ARCHITECTURE.md §6.3).
 *
 * ### 가로 스크롤을 손으로 만든 이유
 *
 * 탭이 `MAX_TABS`(12)까지 열리므로 넘치는 게 예외가 아니라 기본이다. 그런데 37px 짜리
 * 스트립에 네이티브 스크롤바가 들어가면 높이의 1/4 을 잡아먹는다. 숨기는 건 쉽지만,
 * **숨기기만 하면 마우스로는 스크롤할 방법이 사라진다** — 브라우저는 세로 휠을 가로
 * 스크롤로 바꿔주지 않고, 드래그할 스크롤바도 없어지기 때문이다. 트랙패드만 쓰는 사람은
 * 눈치채지 못하는 종류의 고장이다.
 *
 * 그래서 넷을 묶어서 한다:
 *   1. 스크롤바를 숨기고
 *   2. 세로 휠을 가로 스크롤로 바꾸고 (마우스 사용자)
 *   3. 넘친 쪽 가장자리를 흐리게 해서 "더 있다"를 보여준다 (스크롤바가 하던 일)
 *   4. 고정된 좌우 버튼으로 휠이 없는 입력 장치에서도 옮길 수 있게 한다
 *
 * 추가로 **활성 탭이 화면 밖이면 끌어온다.** 사이드바로 이동했는데 그 탭이 스크롤 밖에
 * 있으면 지금 어디에 있는지 알 수 없다.
 */
/**
 * 이 경로가 속한 서브 메뉴. 매칭되지 않는 경로(있어서는 안 되지만)는 `undefined`.
 */
function sectionOfPath(pathname: string): ScreenId | null {
  const screen = matchScreen(pathname)
  return screen ? sectionOf(screen) : null
}

/**
 * 탭에 쓸 이름 — **서브 메뉴 이름 그대로.**
 *
 * 파생 화면에 들어가도 바뀌지 않는다. 한때 `아이템 목록 › 아이템 상세` 처럼 덧붙였는데,
 * **화면 이름 둘을 이어 붙이니 읽기 나빴고** 어차피 브레드크럼이 같은 것을 이미 말한다
 * (`리루티 › 아이템 › 아이템 목록 › 아이템 상세`). 탭은 "어느 메뉴에 있는가"만 맡는다.
 */
const tabLabel = (tab: OpenTab): string => SCREENS[tab.screen].label

export function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabs = useTabsStore((s) => s.tabs)
  const close = useTabsStore((s) => s.close)
  const reset = useTabsStore((s) => s.reset)
  const dirty = useDirtyStore((s) => s.dirty)
  const viewer = useViewer()
  const [fade, setFade] = useState<'none' | 'left' | 'right' | 'both'>('none')
  /** 미저장인데 닫으려는 탭. 확인 창이 떠 있는 동안만 값이 있다 */
  const [pending, setPending] = useState<OpenTab | null>(null)
  const [closeAllOpen, setCloseAllOpen] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)

  const shown = tabs.filter((t) => canAccess(viewer, SCREENS[t.screen].scope))
  // 지금 보고 있는 화면이 속한 서브 메뉴. 파생 화면(`/items/3`)도 부모 탭을 켠다.
  const activeSection = sectionOfPath(pathname)
  /** 이 탭이 들고 있는 화면 중 하나라도 저장 안 됐는가 */
  const isDirty = (t: OpenTab) => livePaths(t).some((p) => dirty[p])
  const dirtyCount = shown.filter(isDirty).length

  // 어느 쪽으로 더 스크롤할 수 있는지 → 가장자리 흐림. 스크롤바가 알려주던 정보다.
  useEffect(() => {
    const el = stripRef.current
    if (!el) return

    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      // 1px 여유 — 소수점 레이아웃에서는 끝에 닿아도 max 와 정확히 같아지지 않는다.
      const left = el.scrollLeft > 1
      const right = el.scrollLeft < max - 1
      setFade(left && right ? 'both' : left ? 'left' : right ? 'right' : 'none')
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    // 창 크기가 바뀌면 넘침 여부도 바뀐다.
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [shown.length])

  // 세로 휠 → 가로 스크롤.
  // React 의 `onWheel` 은 passive 로 붙어 preventDefault 가 먹지 않아서 직접 단다.
  useEffect(() => {
    const el = stripRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      // 트랙패드의 가로 스와이프는 브라우저가 이미 처리한다 — 가로 성분이 크면 손대지 않는다.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // 탭이 0개면 이 컴포넌트가 null 을 돌려주어 ref 가 비어 있다. 의존성이 []
    // 이면 그때 한 번 돌고 끝이라, 나중에 탭이 생겨도 **휠 핸들러가 영영 안 붙는다**
    // — 마우스로는 스크롤이 안 되는 상태가 된다. 스트립이 생길 때 다시 붙인다.
  }, [shown.length])

  // 활성 탭이 스크롤 밖이면 끌어온다.
  // `scrollIntoView` 는 쓰지 않는다 — 조상까지 스크롤해서 본문이 같이 튄다.
  useEffect(() => {
    const el = stripRef.current
    const active = el?.querySelector<HTMLElement>('[data-active]')
    if (!el || !active) return

    const pad = 16
    const left = active.offsetLeft
    const right = left + active.offsetWidth
    if (left < el.scrollLeft) el.scrollLeft = left - pad
    else if (right > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = right - el.clientWidth + pad
    }
  }, [pathname, shown.length])

  if (!shown.length) return null

  const closeTab = (tab: OpenTab) => {
    close(tab.screen)
    if (tab.screen !== activeSection) return

    // 활성 탭을 닫으면 남은 마지막 탭으로 간다. 남은 게 없으면 `/` —
    // **경로를 그대로 두면 사이드바가 방금 닫은 화면을 계속 가리킨다.**
    const next = shown.filter((t) => t.screen !== tab.screen).at(-1)
    navigate(next ? next.path : '/')
  }

  const onClose = (tab: OpenTab) => {
    // 탭을 닫으면 keep-alive 캐시가 파기되어 작성 중이던 내용이 사라진다.
    // 새로고침(`beforeunload`)과 달리 여기서는 문구를 우리가 정할 수 있다
    // (docs/ARCHITECTURE.md §9).
    if (isDirty(tab)) setPending(tab)
    else closeTab(tab)
  }

  const closeAll = () => {
    reset()
    navigate('/')
  }

  const onCloseAll = () => {
    if (dirtyCount) setCloseAllOpen(true)
    else closeAll()
  }

  const scroll = (direction: -1 | 1) => {
    stripRef.current?.scrollBy({ left: direction * 220, behavior: 'smooth' })
  }

  return (
    // 배경·아래 테두리는 **바깥**이 갖는다. 흐림(mask)은 칠해진 픽셀을 투명하게 만드는 것이라
    // 스크롤 요소가 배경까지 들고 있으면 가장자리에서 배경에 구멍이 뚫린다.
    <nav
      aria-label="열린 화면"
      className={css({
        display: 'flex',
        bg: 'surf',
        borderBottom: '1px solid token(colors.bd)',
      })}
    >
      <div
        ref={stripRef}
        data-fade={fade}
        className={cx(strip, css({ flex: '1', minWidth: '0' }))}
      >
        {shown.map((t) => {
          const on = t.screen === activeSection
          return (
            <div
              key={t.screen}
              data-active={on ? '' : undefined}
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                // ⚠️ **원본 그대로다** — `padding: 0 11px` · `border-bottom: 2px solid`.
                //    카드형(테두리+라운드+그림자)으로 바꿨다가 되돌렸다: 원본이 밑줄이고,
                //    ⚠️ **`px` 는 `padding-inline` 이라 값을 둘까지만 받는다** — 넷을 주면
                //    브라우저가 통째로 버려 **좌우 여백이 0 이 된다**(실측: `paddingLeft: 0px`).
                //    그러면 탭 글자와 닫기 × 가 붙어 여러 탭이 한 덩어리로 읽힌다
                //    (docs/ARCHITECTURE.md §64).
                px: '11px',
                flex: 'none',
                whiteSpace: 'nowrap',
                borderBottom: '2px solid',
                borderBottomColor: on ? 'pri' : 'transparent',
                bg: on ? 'prev2' : 'transparent',
              })}
            >
              <button
                type="button"
                onClick={() => navigate(t.path)}
                aria-current={on ? 'page' : undefined}
                title={t.path}
                className={css({
                  border: '0',
                  bg: 'transparent',
                  cursor: 'pointer',
                  p: '0',
                  // ⚠️ **`font: 'inherit'` 이 아니라 `fontFamily` 다.** `font` 는 축약형이라
                  //    **`font-size` 까지** 물려받아 바로 아래 `textStyle` 을 덮는다 —
                  //    12px 이어야 할 탭 글자가 **16px 로 렌더됐다**(실측). 버튼이 시스템
                  //    폰트로 떨어지는 것만 막으면 되므로 `fontFamily` 로 충분하다
                  //    (docs/ARCHITECTURE.md §64.2).
                  fontFamily: 'inherit',
                  textStyle: 'label',
                  fontWeight: on ? '700' : '500',
                  // 활성 탭은 **파란 글자**다(원본). `ink` 로 바꾸면 밑줄만 남아 약해진다.
                  color: on ? 'priD' : 'sub',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                })}
              >
                {tabLabel(t)}
              </button>
              {isDirty(t) && (
                <span
                  title="저장하지 않은 변경사항"
                  className={css({
                    width: '6px',
                    height: '6px',
                    flex: 'none',
                    borderRadius: '50%',
                    bg: 'aFg',
                  })}
                />
              )}
              <button
                type="button"
                aria-label={`${tabLabel(t)} 탭 닫기`}
                onClick={() => onClose(t)}
                className={css({
                  width: '17px',
                  height: '17px',
                  flex: 'none',
                  borderRadius: '5px',
                  border: '0',
                  bg: 'transparent',
                  cursor: 'pointer',
                  p: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'faint2',
                  _hover: { bg: 'hov', color: 'ink' },
                })}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                  <path
                    d="M2,2 L8,8 M8,2 L2,8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          flex: 'none',
          minHeight: '37px',
          px: '8px',
          borderLeft: fade === 'none' ? '0' : '1px solid token(colors.bd)',
        })}
      >
        {fade !== 'none' && (
          <>
            <button
              type="button"
              aria-label="이전 탭 보기"
              disabled={fade === 'right'}
              onClick={() => scroll(-1)}
              className={css({
                width: '28px',
                height: '28px',
                border: '0',
                borderRadius: 'sm',
                bg: 'transparent',
                color: 'sub',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                _hover: { bg: 'hov', color: 'ink' },
                _disabled: { color: 'faint2', cursor: 'default', opacity: '.55' },
              })}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M7.5,2 L3.5,6 L7.5,10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="다음 탭 보기"
              disabled={fade === 'left'}
              onClick={() => scroll(1)}
              className={css({
                width: '28px',
                height: '28px',
                border: '0',
                borderRadius: 'sm',
                bg: 'transparent',
                color: 'sub',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                _hover: { bg: 'hov', color: 'ink' },
                _disabled: { color: 'faint2', cursor: 'default', opacity: '.55' },
              })}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M4.5,2 L8.5,6 L4.5,10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}

        {shown.length > 1 && (
          <button
            type="button"
            onClick={onCloseAll}
            className={css({
              height: '28px',
              px: '9px',
              border: '1px solid token(colors.bd)',
              borderRadius: 'sm',
              bg: 'surf',
              color: 'sub',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textStyle: 'caption',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              _hover: { bg: 'hov', color: 'ink' },
            })}
          >
            모두 닫기
          </button>
        )}
      </div>

      <Dialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) closeTab(pending)
          setPending(null)
        }}
        tone="danger"
        title="저장하지 않고 닫을까요?"
        body={`"${pending ? tabLabel(pending) : ''}" 탭에 저장하지 않은 변경사항이 있습니다. 닫으면 사라집니다.`}
        confirmLabel="닫기"
        cancelLabel="계속 편집"
      />

      <Dialog
        open={closeAllOpen}
        onCancel={() => setCloseAllOpen(false)}
        onConfirm={() => {
          closeAll()
          setCloseAllOpen(false)
        }}
        tone="danger"
        title="열린 탭을 모두 닫을까요?"
        body={`저장하지 않은 탭 ${dirtyCount}개가 있습니다. 모두 닫으면 작성 중인 내용이 사라집니다.`}
        confirmLabel="모두 닫기"
        cancelLabel="계속 편집"
      />
    </nav>
  )
}
