import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Permission, SESSION_STATUS } from '@/interfaces/auth.interface'
import { useLayoutEffect } from 'react'

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

  it('does not commit protected children after permissions are revoked', () => {
    const commits = vi.fn()
    const Child = () => { useLayoutEffect(commits); return <span>Secret</span> }
    useSessionAccess.mockReturnValue({ status: SESSION_STATUS.READY })
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })
    const { rerender } = render(<ProtectedRoute requiredPermission={Permission.READ_ROUTE_PLAN}><Child /></ProtectedRoute>)
    commits.mockClear()
    usePermission.mockReturnValue({ hasPermission: () => false, hasAnyPermission: () => false })
    rerender(<ProtectedRoute requiredPermission={Permission.READ_ROUTE_PLAN}><Child /></ProtectedRoute>)
    expect(commits).not.toHaveBeenCalled()
  })

  it('denies protected content for an unknown session status', () => {
    useSessionAccess.mockReturnValue({ status: 'unexpected' })
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })
    render(<ProtectedRoute requiredPermission={Permission.READ_ROUTE_PLAN}>Secret</ProtectedRoute>)
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })
})
