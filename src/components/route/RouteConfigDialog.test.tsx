import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteConfigDialog } from './RouteConfigDialog'

const { getConfig, updateConfig } = vi.hoisted(() => ({ getConfig: vi.fn(), updateConfig: vi.fn() }))
vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getConfig, updateConfig } }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ hasPermission: () => true, hydrating: false }) }))

describe('RouteConfigDialog', () => {
  it('loads and saves validated route configuration', async () => {
    getConfig.mockResolvedValue({ depot: { name: 'Depósito', latitude: -34, longitude: -58 }, fuelConsumptionLitersPer100Km: 8, maxStops: 20 })
    updateConfig.mockResolvedValue({})
    render(<RouteConfigDialog open onOpenChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByDisplayValue('Depósito')).toBeInTheDocument())
    expect(screen.getByText(/no modifica snapshots/i)).toBeInTheDocument()
  })
})
