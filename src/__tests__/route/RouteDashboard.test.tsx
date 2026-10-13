import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteDashboard } from '@/components/route/RouteDashboard'

const { getActiveDeliveryZones, getDashboard } = vi.hoisted(() => ({
  getActiveDeliveryZones: vi.fn(),
  getDashboard: vi.fn(),
}))

vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getActiveDeliveryZones, getDashboard } }))

const dashboard = {
  filters: { serviceDate: '2026-10-12', zoneCode: 'NORTE' },
  kpis: { activeRoutes: 2, pendingOrders: 8, totalDistanceMeters: 12500, estimatedFuelLiters: 3.75 },
  routes: [{
    id: 'route-1', status: 'PENDING', zoneCode: 'NORTE', selectedSaleIds: ['sale-1'], clientCount: 1,
    metrics: { distanceMeters: 12500, durationSeconds: 3600, fuelLiters: 3.75 },
    assignments: { driverId: 'driver-1', vehicleId: 'vehicle-1' }, warnings: ['TIME_WINDOWS_NOT_CONSIDERED'], stale: false,
  }],
  candidates: {
    eligible: [{ saleId: 'sale-1', displayName: 'Almacén Sur', addressSummary: 'Av. Siempre Viva 742' }],
    blocked: [{ saleId: 'sale-2', displayName: 'Kiosco Norte', reasons: ['CLIENT_LOCATION_MISSING'] }], ruleVersion: 'candidate-eligibility-v1',
  },
  warnings: [],
}

describe('RouteDashboard', () => {
  beforeEach(() => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
  })

  it('loads filters and renders exactly four physical route KPIs', async () => {
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Total de rutas')).toBeInTheDocument())
    expect(screen.getByText('Total de clientes/paradas')).toBeInTheDocument()
    expect(screen.getByText('Distancia total')).toBeInTheDocument()
    expect(screen.getByText('Combustible proyectado')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Indicadores de rutas' })).getAllByRole('article')).toHaveLength(4)
    expect(within(screen.getByRole('region', { name: 'Indicadores de rutas' })).getByText('3,75 L')).toBeInTheDocument()
    expect(screen.queryByText(/\$|USD|costo|precio/i)).not.toBeInTheDocument()
  })

  it('shows a retryable API error', async () => {
    getDashboard.mockRejectedValueOnce(new Error('api down'))
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el dashboard'))
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('renders planned routes and the client order panel', async () => {
    render(<RouteDashboard />)

    expect(await screen.findByRole('heading', { name: 'Rutas planificadas' })).toBeInTheDocument()
    expect(screen.getByText('Ruta route-1')).toBeInTheDocument()
    expect(screen.getByText('Clientes con pedidos')).toBeInTheDocument()
    expect(screen.getByText('Almacén Sur')).toBeInTheDocument()
    expect(screen.getByText('Kiosco Norte')).toBeInTheDocument()
    expect(screen.getByText('La ubicación del cliente no está disponible')).toBeInTheDocument()
  })
})
