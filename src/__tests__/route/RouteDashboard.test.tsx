import { render, screen, waitFor } from '@testing-library/react'
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
  routes: [],
  candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' },
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
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByText('3,75 L')).toBeInTheDocument()
    expect(screen.queryByText(/\$|USD|costo|precio/i)).not.toBeInTheDocument()
  })

  it('shows a retryable API error', async () => {
    getDashboard.mockRejectedValueOnce(new Error('api down'))
    render(<RouteDashboard />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el dashboard'))
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
