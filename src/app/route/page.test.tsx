import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from 'lucide-react'
import { SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'

const { useSessionAccess, usePermission, push, isModuleEnabled, moduleFlags, getActiveDeliveryZones, getDashboard } = vi.hoisted(() => ({
  useSessionAccess: vi.fn(),
  usePermission: vi.fn(),
  push: vi.fn(),
  isModuleEnabled: vi.fn(),
  moduleFlags: { route: true, stock: false, finance: false, simulation: false } as Record<string, boolean>,
  getActiveDeliveryZones: vi.fn(),
  getDashboard: vi.fn(),
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
       requiredPermissions: [],
      gate: 'route',
    },
  ],
}))
// Keep the shell tests deterministic: the planner panel is covered by its own
// suite and must not perform real zone/network work here.
vi.mock('@/services/routePlan.service', () => ({
  routePlanService: {
    getActiveDeliveryZones,
    getDashboard,
    getAssignmentOptions: vi.fn().mockResolvedValue({ drivers: [], vehicles: [] }),
    getCandidates: vi.fn(),
  },
}))

import RouteScreen from './page'

const access = (overrides: Partial<SessionAccess> = {}): SessionAccess => ({
  status: SESSION_STATUS.READY,
  permissions: [],
  gates: { route: true, stock: false, finance: false, simulation: false },
  ...overrides,
})

describe('RouteScreen', () => {
  beforeEach(() => {
    isModuleEnabled.mockReturnValue(true)
    useSessionAccess.mockReturnValue(access())
    usePermission.mockReturnValue({ hasPermission: () => true, hasAnyPermission: () => true })
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'a'.repeat(24), code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({
       filters: {},
      kpis: { activeRoutes: 0, pendingOrders: 0, totalDistanceMeters: 0, estimatedFuelLiters: 0 },
      routes: [],
      candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' },
      warnings: [],
    })
  })

  it('renders the route dashboard without a standalone page header or planner section', async () => {
    render(<RouteScreen />)

    expect(screen.getByRole('heading', { level: 2, name: 'Optimización de Rutas' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Rutas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Planificación de rutas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument()
  })

  it('opens the planner dialog with empty planner scope and closes it', async () => {
    render(<RouteScreen />)

    const generateButton = await screen.findByRole('button', { name: 'Generar rutas' })
    await waitFor(() => expect(generateButton).toBeEnabled())
    generateButton.click()

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Seleccioná los pedidos y revisá el recorrido antes de guardar el plan.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Fecha de reparto')).toHaveValue('')
    expect(within(dialog).getByLabelText('Zona de entrega')).toHaveValue('')

    screen.getByRole('button', { name: 'Close' }).click()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Fecha de reparto')).not.toBeInTheDocument()
    })
  })

  it('passes dashboard planning values to the planner as initial props', async () => {
    render(<RouteScreen />)

    const date = await screen.findByLabelText('Fecha de servicio')
    const zone = screen.getByLabelText('Zona de entrega')
    await waitFor(() => expect(zone).toBeEnabled())
    fireEvent.change(date, { target: { value: '2026-10-15' } })
    fireEvent.change(zone, { target: { value: 'a'.repeat(24) } })
    screen.getByRole('button', { name: 'Generar rutas' }).click()

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Fecha de reparto')).toHaveValue('2026-10-15')
    expect(within(dialog).getByLabelText('Zona de entrega')).toHaveValue('a'.repeat(24))
  })

  it('announces loading while the session is hydrating', () => {
    useSessionAccess.mockReturnValue(access({ status: SESSION_STATUS.HYDRATING, permissions: [], gates: {} }))

    render(<RouteScreen />)

    expect(screen.getByRole('status')).toHaveTextContent('Verificando el acceso a Rutas')
    expect(screen.queryByRole('heading', { level: 1, name: 'Rutas' })).not.toBeInTheDocument()
  })

  it('renders the route planning shell without route-specific permissions', () => {
    useSessionAccess.mockReturnValue(access({ permissions: [] }))
    usePermission.mockReturnValue({ hasPermission: () => false, hasAnyPermission: () => false })

    render(<RouteScreen />)

    expect(screen.getByRole('heading', { level: 2, name: 'Optimización de Rutas' })).toBeInTheDocument()
  })

  it('redirects anonymous sessions home without rendering the shell', () => {
    useSessionAccess.mockReturnValue(access({ status: SESSION_STATUS.ANONYMOUS, permissions: [], gates: {} }))

    render(<RouteScreen />)

    expect(push).toHaveBeenCalledWith('/')
    expect(screen.queryByRole('heading', { level: 1, name: 'Rutas' })).not.toBeInTheDocument()
  })
})
