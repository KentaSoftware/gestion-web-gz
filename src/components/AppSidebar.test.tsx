import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SESSION_STATUS } from '@/interfaces/auth.interface'
import { SidebarProvider } from '@/components/ui/sidebar'
import { REPARTIDOR_ACCESS } from '@/test/fixtures/sessionAccess'

const { useSessionAccess, isModuleEnabled } = vi.hoisted(() => ({
  useSessionAccess: vi.fn(),
  isModuleEnabled: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, prefetch, ...props }: { children: React.ReactNode; href: string; prefetch?: boolean }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>{children}</a>
  ),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }))
vi.mock('react-redux', () => ({ useSelector: () => ({ nickname: '' }) }))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess }))
vi.mock('@/config/moduleRegistry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/moduleRegistry')>()
  return { ...actual, isModuleEnabled }
})

import AppSidebar from './AppSidebar'

describe('AppSidebar', () => {
  const routeEnabledForRepartidor = (entry: { id: string }) => entry.id === 'home' || entry.id === 'route'

  it('hides blocked modules and disables prefetch for enabled navigation', () => {
    useSessionAccess.mockReturnValue({
      status: SESSION_STATUS.READY,
      permissions: [],
      gates: { stock: false, finance: false, simulation: false },
    })
    isModuleEnabled.mockImplementation(routeEnabledForRepartidor)

    render(<SidebarProvider><AppSidebar /></SidebarProvider>)

    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('data-prefetch', 'false')
    expect(screen.getByRole('link', { name: 'Rutas' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Stock' })).not.toBeInTheDocument()
  })

  it('shows the enabled Rutas navigation link to the Repartidor fixture', () => {
    useSessionAccess.mockReturnValue(REPARTIDOR_ACCESS)
    isModuleEnabled.mockImplementation(routeEnabledForRepartidor)

    render(<SidebarProvider><AppSidebar /></SidebarProvider>)

    expect(screen.getByRole('link', { name: 'Rutas' })).toHaveAttribute('href', '/route')
  })

  it('shows Rutas to an authenticated user without route-specific permissions', () => {
    useSessionAccess.mockReturnValue({ ...REPARTIDOR_ACCESS, permissions: [] })
    isModuleEnabled.mockImplementation(routeEnabledForRepartidor)

    render(<SidebarProvider><AppSidebar /></SidebarProvider>)

    expect(screen.getByRole('link', { name: 'Rutas' })).toBeInTheDocument()
  })

  it('hydrates without a mismatch when an admin is stored and shows the name after mount', async () => {
    useSessionAccess.mockReturnValue({
      status: SESSION_STATUS.READY,
      permissions: [],
      gates: { stock: false, finance: false, simulation: false },
    })
    isModuleEnabled.mockImplementation(() => true)
    window.localStorage.setItem('user', JSON.stringify({ nickname: 'Admin' }))

    const originalWindow = window
    vi.stubGlobal('window', undefined)
    const serverMarkup = renderToString(<SidebarProvider><AppSidebar /></SidebarProvider>)
    vi.stubGlobal('window', originalWindow)

    const container = document.createElement('div')
    container.innerHTML = serverMarkup
    document.body.appendChild(container)
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <SidebarProvider><AppSidebar /></SidebarProvider>)
    })

    expect(consoleError).not.toHaveBeenCalled()
    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('A', { exact: true })).toBeInTheDocument()

    await act(async () => root.unmount())
    consoleError.mockRestore()
    container.remove()
    window.localStorage.removeItem('user')
  })
})
