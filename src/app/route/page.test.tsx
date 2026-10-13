import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from 'lucide-react'
import { Permission, SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'

const { useSessionAccess, usePermission, push, isModuleEnabled, moduleFlags } = vi.hoisted(() => ({
  useSessionAccess: vi.fn(),
  usePermission: vi.fn(),
  push: vi.fn(),
  isModuleEnabled: vi.fn(),
  moduleFlags: { route: true, stock: false, finance: false, simulation: false } as Record<string, boolean>,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/route',
  useRouter: () => ({ push, refresh: vi.fn(), back: vi.fn() }),
}))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess }))
vi.mock('@/hooks/usePermission', () => ({ usePermission }))
vi.mock('@/config/moduleRegistry', () => ({
  MODULE_FLAGS: moduleFlags,
  isModuleEnabled,
  MODULE_REGISTRY: [
    {
      id: 'route',
      href: '/route',
      label: 'Rutas',
      icon: Route,
      flag: 'route',
      requiredPermissions: [Permission.READ_ROUTE_PLAN],
      gate: 'route',
    },
  ],
}))
// Keep the shell tests deterministic: the planner panel is covered by its own
// suite and must not perform real zone/network work here.
vi.mock('@/services/routePlan.service', () => ({
  routePlanService: {
    getActiveDeliveryZones: () => new Promise(() => undefined),
    getAssignmentOptions: vi.fn().mockResolvedValue({ drivers: [], vehicles: [] }),
    getCandidates: vi.fn(),
  },
}))

import RouteScreen from './page'

const access = (overrides: Partial<SessionAccess> = {}): SessionAccess => ({
  status: SESSION_STATUS.READY,
  permissions: [Permission.READ_ROUTE_PLAN],
  gates: { route: true, stock: false, finance: false, simulation: false },
  ...overrides,
})

describe('RouteScreen', () => {
  beforeEach(() => {
    isModuleEnabled.mockReturnValue(true)
    useSessionAccess.mockReturnValue(access())
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })
  })

  it('renders the route planning shell for an authorized session', () => {
    render(<RouteScreen />)

    expect(screen.getByRole('heading', { level: 1, name: 'Rutas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Planificación de rutas' })).toBeInTheDocument()
  })

  it('announces loading while the session is hydrating', () => {
    useSessionAccess.mockReturnValue(access({ status: SESSION_STATUS.HYDRATING, permissions: [], gates: {} }))

    render(<RouteScreen />)

    expect(screen.getByRole('status')).toHaveTextContent('Verificando el acceso a Rutas')
    expect(screen.queryByRole('heading', { level: 1, name: 'Rutas' })).not.toBeInTheDocument()
  })

  it('renders the forbidden state when the session cannot read route plans', () => {
    isModuleEnabled.mockReturnValue(false)
    useSessionAccess.mockReturnValue(access({ permissions: [] }))
    usePermission.mockReturnValue({ hasPermission: () => false, hasAnyPermission: () => false })

    render(<RouteScreen />)

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
    expect(screen.queryByRole('heading', { level: 1, name: 'Rutas' })).not.toBeInTheDocument()
  })

  it('renders the unavailable state when the module gate is unmet', () => {
    isModuleEnabled.mockReturnValue(false)
    useSessionAccess.mockReturnValue(
      access({ gates: { route: false, stock: false, finance: false, simulation: false } })
    )

    render(<RouteScreen />)

    expect(screen.getByRole('alert')).toHaveTextContent('Módulo no disponible')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('redirects anonymous sessions home without rendering the shell', () => {
    useSessionAccess.mockReturnValue(access({ status: SESSION_STATUS.ANONYMOUS, permissions: [], gates: {} }))

    render(<RouteScreen />)

    expect(push).toHaveBeenCalledWith('/')
    expect(screen.queryByRole('heading', { level: 1, name: 'Rutas' })).not.toBeInTheDocument()
  })
})
