import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from 'lucide-react'
import { SESSION_STATUS, type SessionAccess } from '@/interfaces/auth.interface'

const { useSessionAccess, usePermission, push, isModuleEnabled, moduleFlags, getActiveDeliveryZones, getDashboard, getCandidates, getAssignmentOptions, preview, save } = vi.hoisted(() => ({
  useSessionAccess: vi.fn(),
  usePermission: vi.fn(),
  push: vi.fn(),
  isModuleEnabled: vi.fn(),
  moduleFlags: { route: true, finance: false, simulation: false } as Record<string, boolean>,
  getActiveDeliveryZones: vi.fn(),
  getDashboard: vi.fn(),
  getCandidates: vi.fn(),
  getAssignmentOptions: vi.fn(),
  preview: vi.fn(),
  save: vi.fn(),
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
    getAssignmentOptions,
    getCandidates,
    preview,
    save,
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('@/hooks/useLocalStorage', () => ({ default: () => [{ nickname: '', token: '' }, vi.fn(), vi.fn()] }))
vi.mock('@/redux/hook', () => ({ useAppDispatch: () => vi.fn() }))
vi.mock('@/redux/userSlice', () => ({ clearUser: vi.fn(), getUser: vi.fn(), setUser: vi.fn() }))
vi.mock('react-redux', () => ({ useSelector: () => ({ nickname: '', token: '' }) }))
vi.mock('@/components/AppSidebar', () => ({ default: () => null }))
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  SidebarInset: ({ children, className, ...props }: { children: ReactNode; className?: string }) => <div className={className} {...props}>{children}</div>,
  SidebarTrigger: () => <button type="button">Toggle sidebar</button>,
}))

import RouteScreen from './page'
import Dashboard from '@/components/Dashboard'

const access = (overrides: Partial<SessionAccess> = {}): SessionAccess => ({
  status: SESSION_STATUS.READY,
  permissions: [],
  gates: { route: true, finance: false, simulation: false },
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
    getCandidates.mockResolvedValue({ eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' })
    getAssignmentOptions.mockResolvedValue({ drivers: [], vehicles: [] })
    preview.mockReset()
    save.mockReset()
  })

  it('renders the route dashboard without a standalone page header or planner section', async () => {
    render(<RouteScreen />)

    const dashboard = screen.getByRole('region', { name: 'Optimización de Rutas' })
    expect(dashboard).toBeInTheDocument()
    expect(dashboard.parentElement).toHaveClass('flex-1', 'min-h-0', 'w-full', 'min-w-0')
    expect(dashboard.parentElement).not.toHaveClass('h-full')
    expect(screen.queryByRole('heading', { level: 1, name: 'Rutas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Planificación de rutas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument()
  })

  it('opens the planner dialog only after the dashboard scope is complete', async () => {
    render(<RouteScreen />)

    const generateButton = await screen.findByRole('button', { name: 'Generar rutas' })
    expect(generateButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Fecha de servicio'), { target: { value: '2026-10-15' } })
    fireEvent.change(screen.getByLabelText('Zona de entrega'), { target: { value: 'a'.repeat(24) } })
    await waitFor(() => expect(generateButton).toBeEnabled())
    generateButton.click()

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Seleccioná clientes aptos, asigná los recursos y revisá el recorrido antes de guardar el plan.')).toBeInTheDocument()
    expect(dialog.className).toContain('max-w-[84rem]')
    expect(dialog.className).not.toContain('overflow-y-auto')
    expect(within(dialog).queryByRole('heading', { name: 'Planificación de rutas' })).not.toBeInTheDocument()
    expect(await within(dialog).findByRole('status')).toHaveTextContent('No hay candidatos')

    screen.getByRole('button', { name: 'Close' }).click()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
    expect(await within(dialog).findByRole('status')).toHaveTextContent('No hay candidatos')
    expect(getCandidates).toHaveBeenCalledWith({ serviceDate: '2026-10-15', deliveryZoneId: 'a'.repeat(24) })
  })

  it('closes the planner and refreshes the dashboard after saving', async () => {
    const zoneId = 'a'.repeat(24)
    const saleA = 'b'.repeat(24)
    const saleB = 'c'.repeat(24)
    getCandidates.mockResolvedValue({
      eligible: [
        { saleId: saleA, clientId: 'd'.repeat(24), displayName: 'Cliente Uno', addressSummary: 'Calle 1' },
        { saleId: saleB, clientId: 'e'.repeat(24), displayName: 'Cliente Dos', addressSummary: 'Calle 2' },
      ],
      blocked: [],
      ruleVersion: 'candidate-eligibility-v1',
    })
    getAssignmentOptions.mockResolvedValue({ drivers: [{ id: 'driver-1', nickname: 'Ana', isActive: true }], vehicles: [{ id: 'vehicle-1', code: 'AA123BB', fuelConsumptionLitersPer100Km: 10, attributes: {}, availability: true }] })
    preview.mockResolvedValue({
      route: { depot: { id: 'depot', name: 'Depósito', latitude: -34.6, longitude: -58.4 }, stops: [], segments: [], encodedPolyline: '' },
      metrics: { distanceMeters: 1000, durationSeconds: 600, stopCount: 2, fuelLiters: 0.1 },
      warnings: [], factorsConsidered: [], algorithmVersion: 'test', algorithmProvider: 'test', routingConfigRevision: 1, ruleVersion: 'test',
    })
    save.mockResolvedValue({ _id: 'f'.repeat(24) })
    getDashboard.mockResolvedValueOnce({
      filters: {}, kpis: { activeRoutes: 0, pendingOrders: 0, totalDistanceMeters: 0, estimatedFuelLiters: 0 }, routes: [],
      candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' }, warnings: [],
    }).mockResolvedValueOnce({
      filters: {}, kpis: { activeRoutes: 1, pendingOrders: 0, totalDistanceMeters: 1000, estimatedFuelLiters: 0.1 }, routes: [{ id: 'route-new', status: 'PENDING', zoneCode: 'NORTE', selectedSaleIds: [saleA, saleB], clientCount: 2, metrics: { distanceMeters: 1000, durationSeconds: 600, fuelLiters: 0.1 }, assignments: { driverId: 'driver-1', vehicleId: 'vehicle-1' }, warnings: [], stale: false }],
      candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' }, warnings: [],
    })

    render(<RouteScreen />)
    const date = await screen.findByLabelText('Fecha de servicio')
    fireEvent.change(date, { target: { value: '2026-10-15' } })
    fireEvent.change(screen.getByLabelText('Zona de entrega'), { target: { value: zoneId } })
    fireEvent.click(screen.getByRole('button', { name: 'Generar rutas' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('heading', { name: 'Pedidos pendientes' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Repartidor'), 'driver-1')
    await userEvent.selectOptions(within(dialog).getByLabelText('Vehículo'), 'vehicle-1')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Cliente Uno' }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Cliente Dos' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Generar ruta' }))
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Confirmar y guardar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (1)' })).toBeInTheDocument())
    expect(getDashboard).toHaveBeenCalledTimes(2)
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining('/route/'))
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

describe('Dashboard layout', () => {
  it('keeps the dashboard main as the page landmark and delegates scrolling to its child', () => {
    render(<Dashboard><div>Dashboard content</div></Dashboard>)

    const main = document.getElementById('dashboard-main')
    const mains = document.querySelectorAll('main')
    const scrollRegion = screen.getByTestId('dashboard-scroll-region')
    expect(mains).toHaveLength(1)
    expect(mains[0]).toBe(main)
    expect(main).toHaveAttribute('id', 'dashboard-main')
    expect(main).toHaveClass('flex', 'h-0', 'min-h-0', 'flex-1', 'flex-col', 'bg-background-canvas')
    expect(main).not.toHaveClass('overflow-y-auto')
    expect(scrollRegion.parentElement).toBe(main)
    expect(scrollRegion).toHaveClass('h-0', 'min-h-0', 'flex-1', 'overflow-y-auto')
    expect(main).not.toHaveClass('h-full')
  })
})
