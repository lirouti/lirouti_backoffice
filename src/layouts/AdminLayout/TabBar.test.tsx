// @vitest-environment jsdom
/**
 * 전체 닫기는 열린 화면의 keep-alive 캐시까지 버리게 되는 출발점이다.
 * 버튼 노출 조건과 미저장 확인을 여기서 고정해 조용한 상태 손실을 막는다.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { TOP_VIEWER } from '@/domain/access'

import { useDirtyStore } from '@/stores/dirtyStore'
import { useTabsStore } from '@/stores/tabsStore'
import { useViewerStore } from '@/stores/viewerStore'

import { TabBar } from './TabBar'

class TestResizeObserver {
  observe() {}
  disconnect() {}
}

describe('TabBar 전체 닫기', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', TestResizeObserver)
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
    }
  })

  beforeEach(() => {
    useViewerStore.setState({ viewer: TOP_VIEWER })
    useDirtyStore.getState().reset()
    useTabsStore.getState().reset()
  })

  afterEach(cleanup)

  it('탭이 둘 이상일 때만 모두 닫기를 보여준다', () => {
    useTabsStore.setState({ tabs: [{ screen: 'dash', path: '/dashboard' }] })
    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <TabBar />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button', { name: '모두 닫기' })).toBeNull()

    useTabsStore.setState({
      tabs: [
        { screen: 'dash', path: '/dashboard' },
        { screen: 'items', path: '/items' },
      ],
    })
    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <TabBar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: '모두 닫기' })).toBeTruthy()
  })

  it('깨끗한 탭은 확인 없이 모두 닫는다', () => {
    useTabsStore.setState({
      tabs: [
        { screen: 'dash', path: '/dashboard' },
        { screen: 'items', path: '/items' },
      ],
    })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <TabBar />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '모두 닫기' }))
    expect(useTabsStore.getState().tabs).toEqual([])
  })

  it('미저장 탭이 있으면 개수를 알리고 확인 전에는 닫지 않는다', () => {
    useTabsStore.setState({
      tabs: [
        { screen: 'dash', path: '/dashboard' },
        { screen: 'items', path: '/items/new' },
      ],
    })
    useDirtyStore.setState({ dirty: { '/items/new': true } })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <TabBar />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '모두 닫기' }))
    expect(screen.getByText(/저장하지 않은 탭 1개/)).toBeTruthy()
    expect(useTabsStore.getState().tabs).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: '모두 닫기' }).at(-1)!)
    expect(useTabsStore.getState().tabs).toEqual([])
  })
})
