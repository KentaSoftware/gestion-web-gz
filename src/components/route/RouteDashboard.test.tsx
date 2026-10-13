import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  it('renders the selected route detail and keeps legacy cards usable', async () => {
    getActiveDeliveryZones.mockResolvedValue([{ _id: 'zone-1', code: 'NORTE', name: 'Zona Norte', active: true }])
    getDashboard.mockResolvedValue(dashboard)
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByText('Ruta route-1')).toBeInTheDocument())
    expect(screen.getByText('Parada 1')).toBeInTheDocument()
    expect(screen.getByText('sale-1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /seleccionar ruta route-2/i }))

    expect(screen.getByText('Ruta route-2')).toBeInTheDocument()
    expect(screen.getAllByText('driver-2').length).toBeGreaterThan(0)
    expect(screen.getByText('No hay detalle geográfico disponible para esta ruta.')).toBeInTheDocument()
  })
})
