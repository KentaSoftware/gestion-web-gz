import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteDashboard } from './RouteDashboard'

const { getActiveDeliveryZones, getDashboard } = vi.hoisted(() => ({
  getActiveDeliveryZones: vi.fn(),
  getDashboard: vi.fn(),
}))

vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getActiveDeliveryZones, getDashboard } }))

const dashboard = {
  filters: { serviceDate: '2026-10-12', zoneCode: 'NORTE' },
  kpis: { activeRoutes: 2, pendingOrders: 2, totalDistanceMeters: 3000, estimatedFuelLiters: 1.2 },
  routes: [
    {
      id: 'route-1', status: 'PENDING', zoneCode: 'NORTE', selectedSaleIds: ['sale-1'], clientCount: 1,
      metrics: { distanceMeters: 1000, durationSeconds: 600, fuelLiters: 0.4 },
      assignments: { driverId: 'driver-1', vehicleId: 'vehicle-1' }, warnings: [], stale: false,
      depot: { name: 'Depósito Central', latitude: -34.6, longitude: -58.4 }, encodedPolyline: '',
      stops: [{ clientId: 'client-1', saleIds: ['sale-1'], sequence: 1, latitude: -34.61, longitude: -58.41 }],
      segments: [{ fromStopSequence: 0, toStopSequence: 1, distanceMeters: 1000, durationSeconds: 600 }],
      stopEstimates: [{ sequence: 1, arrival: '2026-10-12T03:10:00.000Z', cumulativeDurationSeconds: 600, availability: 'ESTIMATED' }],
      saleReferences: [{ saleId: 'sale-1', versionAtSave: 1, currentVersion: 1, currentStatus: 'PENDING' }],
      scheduleAssumptions: { calculatedAt: '2026-10-12T03:00:00.000Z', timezone: 'America/Argentina/Buenos_Aires', source: 'route-schedule' },
    },
    {
      id: 'route-2', status: 'COMPLETED', zoneCode: 'NORTE', selectedSaleIds: ['sale-2'], clientCount: 1,
      metrics: { distanceMeters: 2000, durationSeconds: 1200, fuelLiters: 0.8 },
      assignments: { driverId: 'driver-2', vehicleId: 'vehicle-2' }, warnings: [], stale: false,
    },
  ],
  candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' },
  warnings: [],
}

describe('RouteDashboard selected-route detail', () => {
  it('renders the approved header and filter controls', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    expect(screen.getByRole('heading', { name: 'Optimización de Rutas' })).toBeInTheDocument()
    expect(screen.getByText('Planificá y asigná rutas de entrega de forma eficiente')).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Ocultar filtros' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const toolbar = document.getElementById('route-dashboard-filters')
    expect(toolbar).not.toBeNull()
    expect(toolbar).toBeVisible()
    expect(screen.getByRole('button', { name: 'Generar rutas' })).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Mostrar filtros' })).toHaveAttribute('aria-expanded', 'false')
    expect(toolbar).not.toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar filtros' }))
    expect(screen.getByRole('button', { name: 'Ocultar filtros' })).toHaveAttribute('aria-expanded', 'true')
    expect(toolbar).toBeVisible()
  })

  it('keeps map and detail hidden until a route action is used', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Mapa interactivo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de ruta' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /seleccionar ruta route-2/i }))

    expect(screen.queryByRole('heading', { name: 'Mapa interactivo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de ruta' })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver mapa' })[1])
    expect(screen.getByRole('heading', { name: 'Mapa interactivo' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de ruta' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(document.getElementById('route-map-region'))

    fireEvent.click(screen.getAllByRole('button', { name: 'Previsualizar' })[1])
    expect(screen.getByRole('heading', { name: 'Mapa interactivo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Detalle de ruta' })).toBeInTheDocument()
    expect(document.activeElement).toBe(document.getElementById('route-detail-region'))
  })

  it('reveals only the requested panel from each route action', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: 'Previsualizar' })[0])
    expect(screen.getByRole('heading', { name: 'Detalle de ruta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mapa interactivo' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(document.getElementById('route-detail-region'))
  })

  it('renders the planned-routes empty state without the generic dashboard message', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({ ...dashboard, routes: [], candidates: { ...dashboard.candidates } })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (0)' })).toBeInTheDocument())
    expect(screen.getByText('No existen rutas planificadas para el usuario')).toBeInTheDocument()
    expect(screen.queryByText('No hay rutas ni clientes pendientes para la fecha y zona seleccionadas.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mapa interactivo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Detalle de ruta' })).not.toBeInTheDocument()
  })

  it('renders planned-route parity controls and selects from route actions', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rutas planificadas (2)' })).toBeInTheDocument())
    expect(screen.getByRole('group', { name: 'Estados de ruta' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver mapa' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Previsualizar' })).toHaveLength(2)

    const selection = screen.getByRole('button', { name: 'Seleccionar ruta route-2' })
    expect(selection).toHaveAttribute('aria-pressed', 'false')
    selection.focus()
    expect(document.activeElement).toBe(selection)
    fireEvent.click(selection)
    expect(selection).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver mapa' })[1])
    expect(screen.getByText('Ruta route-2')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Previsualizar' })[1])
    expect(screen.getByText('Ruta route-2')).toBeInTheDocument()
  })

  it('paginates combined eligible and blocked clients', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({
      ...dashboard,
      candidates: {
        eligible: [
          { saleId: 'eligible-1', displayName: 'Cliente elegible 1', addressSummary: 'Dirección 1' },
          { saleId: 'eligible-2', displayName: 'Cliente elegible 2', addressSummary: 'Dirección 2' },
          { saleId: 'eligible-3', displayName: 'Cliente elegible 3', addressSummary: 'Dirección 3' },
        ],
        blocked: [
          { saleId: 'blocked-1', displayName: 'Cliente bloqueado 1', reasons: ['CLIENT_LOCATION_MISSING'] },
          { saleId: 'blocked-2', displayName: 'Cliente bloqueado 2', reasons: ['CLIENT_LOCATION_UNCONFIRMED'] },
          { saleId: 'blocked-3', displayName: 'Cliente bloqueado 3', reasons: ['CLIENT_LOCATION_MISSING'] },
          { saleId: 'blocked-4', displayName: 'Cliente bloqueado 4', reasons: ['CLIENT_LOCATION_MISSING'] },
        ],
        ruleVersion: 'candidate-eligibility-v1',
      },
    })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Cliente elegible 1')).toBeInTheDocument())
    const list = screen.getByRole('list', { name: 'Clientes y pedidos' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))

    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))

    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  })

  it('filters clients by name, address, or sale id and resets pagination', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({
      ...dashboard,
      candidates: {
        eligible: Array.from({ length: 6 }, (_, index) => ({
          saleId: `sale-${index + 1}`,
          displayName: `Cliente ${index + 1}`,
          addressSummary: index === 5 ? 'Calle buscada 123' : `Dirección ${index + 1}`,
        })),
        blocked: [],
        ruleVersion: 'candidate-eligibility-v1',
      },
    })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Página 1 de 2')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: 'Buscar cliente o dirección…' })
    fireEvent.change(search, { target: { value: 'calle buscada' } })

    expect(screen.getByText('Cliente 6')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument()
    expect(screen.queryByText('Cliente 1')).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'sale-2' } })
    expect(screen.getByText('Cliente 2')).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'sin coincidencias' } })
    expect(screen.getByRole('status', { name: 'Clientes sin coincidencias' })).toHaveTextContent('No se encontraron clientes')
  })

  it('renders location status and distance for eligible and blocked clients', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue({
      ...dashboard,
      candidates: {
        eligible: [{ saleId: 'eligible-geo', displayName: 'Cliente geográfico', addressSummary: 'Dirección confirmada', latitude: -34.6, longitude: -58.4, distanceMeters: 1250 }],
        blocked: [
          { saleId: 'blocked-missing', displayName: 'Cliente sin ubicación', reasons: ['CLIENT_LOCATION_MISSING'] },
          { saleId: 'blocked-unconfirmed', displayName: 'Cliente sin confirmar', reasons: ['CLIENT_LOCATION_UNCONFIRMED'] },
        ],
        ruleVersion: 'candidate-eligibility-v1',
      },
    })
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Cliente geográfico')).toBeInTheDocument())
    expect(screen.getByText(/1,3 km/)).toBeInTheDocument()
    expect(screen.getByText(/Ubicación confirmada/)).toBeInTheDocument()
    expect(screen.getByText(/No posee coordenadas/)).toBeInTheDocument()
    expect(screen.getByText(/Ubicación no confirmada/)).toBeInTheDocument()
    expect(screen.getAllByText(/Distancia no disponible/)).toHaveLength(2)
  })
})
