import { render, screen } from '@testing-library/react'
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
vi.mock('react-redux', () => ({ useSelector: () => ({ nickname: 'Repartidor' }) }))
vi.mock('@/hooks/useLocalStorage', () => ({ default: () => ['', vi.fn(), vi.fn()] }))
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
})
