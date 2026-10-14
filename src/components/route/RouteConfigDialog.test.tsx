import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteConfigDialog } from './RouteConfigDialog'

const { getConfig, updateConfig } = vi.hoisted(() => ({ getConfig: vi.fn(), updateConfig: vi.fn() }))
vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getConfig, updateConfig } }))

describe('RouteConfigDialog', () => {
  it('loads and saves configuration for an authenticated user without route permissions', async () => {
    getConfig.mockResolvedValue({ depot: { name: 'Depósito', address: 'Av. Central 123', latitude: -34, longitude: -58 }, fuelConsumptionLitersPer100Km: 8, maxStops: 20 })
    updateConfig.mockResolvedValue({})
    render(<RouteConfigDialog open onOpenChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByDisplayValue('Depósito')).toBeInTheDocument())
    expect(screen.getByDisplayValue('Av. Central 123')).toBeInTheDocument()
    expect(screen.getByText(/no modifica snapshots/i)).toBeInTheDocument()
    await screen.getByRole('button', { name: 'Guardar configuración' }).click()
    await waitFor(() => expect(updateConfig).toHaveBeenCalled())
    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ depot: expect.objectContaining({ address: 'Av. Central 123' }) }))
  })
})
