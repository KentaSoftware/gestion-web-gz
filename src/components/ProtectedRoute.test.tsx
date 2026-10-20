import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Permission, SESSION_STATUS } from '@/interfaces/auth.interface'

const { useSessionAccess, usePermission, push } = vi.hoisted(() => ({
  useSessionAccess: vi.fn(),
  usePermission: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/route',
  useRouter: () => ({ push }),
}))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess }))
vi.mock('@/hooks/usePermission', () => ({ usePermission }))
vi.mock('@/components/module-gate', () => ({ ModuleGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }))

import { ProtectedRoute } from './ProtectedRoute'

describe('ProtectedRoute', () => {
  it('shows a loading indicator during hydration without redirecting', () => {
    useSessionAccess.mockReturnValue({ status: SESSION_STATUS.HYDRATING })
    usePermission.mockReturnValue({ hasPermission: vi.fn(), hasAnyPermission: vi.fn() })

    render(<ProtectedRoute requiredPermission={Permission.READ_ROUTE_PLAN}>Rutas</ProtectedRoute>)

    expect(screen.queryByText('Rutas')).not.toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('renders protected content after permission access is granted', () => {
    useSessionAccess.mockReturnValue({ status: SESSION_STATUS.READY })
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })

    render(<ProtectedRoute requiredPermission={Permission.READ_ROUTE_PLAN}>Rutas</ProtectedRoute>)

    expect(screen.getByText('Rutas')).toBeInTheDocument()
  })
})
