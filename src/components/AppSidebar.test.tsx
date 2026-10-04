import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SESSION_STATUS } from '@/interfaces/auth.interface'
import { SidebarProvider } from '@/components/ui/sidebar'

const { useSessionAccess } = vi.hoisted(() => ({ useSessionAccess: vi.fn() }))

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

import AppSidebar from './AppSidebar'

describe('AppSidebar', () => {
  it('hides blocked modules and disables prefetch for enabled navigation', () => {
    useSessionAccess.mockReturnValue({
      status: SESSION_STATUS.READY,
      permissions: [],
      gates: { route: false, stock: false, finance: false, simulation: false },
    })

    render(<SidebarProvider><AppSidebar /></SidebarProvider>)

    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('data-prefetch', 'false')
    expect(screen.queryByRole('link', { name: 'Rutas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Stock' })).not.toBeInTheDocument()
  })
})
