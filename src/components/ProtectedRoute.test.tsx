import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Permission, SESSION_STATUS } from '@/interfaces/auth.interface'
import { useLayoutEffect } from 'react'

const { useSessionAccess, usePermission, push, pathname } = vi.hoisted(() => ({
  useSessionAccess: vi.fn(),
  usePermission: vi.fn(),
  push: vi.fn(),
  pathname: { value: '/route' },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ push, refresh: vi.fn() }),
}))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess }))
vi.mock('@/hooks/usePermission', () => ({ usePermission }))

import { ProtectedRoute } from './ProtectedRoute'

describe('ProtectedRoute', () => {
  afterEach(() => { pathname.value = '/route' })
  it('enforces finance access on direct navigation', () => {
    pathname.value = '/finance'
    const access = { status: SESSION_STATUS.READY, permissions: [Permission.READ_CASHFLOW], gates: { finance: true } }
    useSessionAccess.mockReturnValue(access)
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })
    const route = () => <ProtectedRoute requiredPermission={Permission.READ_CASHFLOW}>Finance content</ProtectedRoute>
    const { rerender, unmount } = render(route())
    expect(screen.getByText('Finance content')).toBeInTheDocument()
    useSessionAccess.mockReturnValue({ ...access, permissions: [] })
    usePermission.mockReturnValue({ hasPermission: () => false, hasAnyPermission: () => false })
    rerender(route())
    expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
    useSessionAccess.mockReturnValue({ ...access, permissions: [], isAdmin: true })
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })
    rerender(route())
    expect(screen.getByText('Finance content')).toBeInTheDocument()
    useSessionAccess.mockReturnValue({ ...access, status: SESSION_STATUS.HYDRATING })
    rerender(route())
    expect(screen.getByRole('status')).toHaveTextContent('Verificando el acceso')
    useSessionAccess.mockReturnValue({ ...access, gates: { finance: false } })
    rerender(route())
    expect(screen.getByRole('alert')).toHaveTextContent('Módulo no disponible')
    unmount()
    pathname.value = '/route'
  })
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
