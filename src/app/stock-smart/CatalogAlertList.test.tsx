import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogAlertList } from './CatalogAlertList'

let notify: ResizeObserverCallback
const disconnect = vi.fn()
class Observer {
  constructor(callback: ResizeObserverCallback) { notify = callback }
  observe() {}
  disconnect() { disconnect() }
}
const rows = (count: number) => Array.from({ length: count }, (_, index) => <li key={index}>{`Alerta ${index + 1} ${index === 0 ? 'texto largo '.repeat(80) : 'corto'}`}</li>)

describe('CatalogAlertList', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); disconnect.mockClear() })

  it('keeps every uneven row in one focusable scroll region and measures four rows including gaps', () => {
    vi.stubGlobal('ResizeObserver', Observer)
    let bottom = 230
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const index = Array.from(this.parentElement?.children ?? []).indexOf(this)
      return { top: index === 0 ? 10 : 0, bottom: index === 3 ? bottom : 0 } as DOMRect
    })
    const { unmount } = render(<CatalogAlertList label="advertencias" scrollable>{rows(9)}</CatalogAlertList>)
    const region = screen.getByRole('region', { name: 'Lista desplazable de alertas advertencias' })
    expect(within(region).getAllByRole('listitem')).toHaveLength(9)
    expect(region).toHaveTextContent('texto largo')
    expect(region).toHaveStyle({ maxHeight: '220px', overflowY: 'auto' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveClass('focus-visible:outline')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    region.scrollTop = 120
    fireEvent.scroll(region)
    expect(region.scrollTop).toBe(120)
    bottom = 310
    act(() => notify([], {} as ResizeObserver))
    expect(region).toHaveStyle({ maxHeight: '300px' })
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it.each([3, 4])('does not add a scroll region for %i rows', (count) => {
    render(<CatalogAlertList label="críticas" scrollable={false}>{rows(count)}</CatalogAlertList>)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(count)
  })

  it('remeasures without ResizeObserver after container changes and cleans up on collapse', () => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', undefined)
    let bottom = 200
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const index = Array.from(this.parentElement?.children ?? []).indexOf(this)
      return { top: 0, bottom: index === 3 ? bottom : 0 } as DOMRect
    })
    const { rerender, unmount } = render(<CatalogAlertList label="informativas" scrollable>{rows(5)}</CatalogAlertList>)
    const region = screen.getByRole('region')
    expect(region).toHaveStyle({ maxHeight: '200px' })
    bottom = 280
    act(() => vi.advanceTimersByTime(500))
    expect(region).toHaveStyle({ maxHeight: '280px' })
    rerender(<CatalogAlertList label="informativas" scrollable={false}>{rows(2)}</CatalogAlertList>)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
