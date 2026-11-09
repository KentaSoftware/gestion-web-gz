import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteConfigDialog } from './RouteConfigDialog'
import { fireEvent } from '@testing-library/react'

vi.mock('./LocationMapPicker', async (importOriginal) => {
  const original = await importOriginal<typeof import('./LocationMapPicker')>()
  return { ...original, LocationMapPicker: ({ onChange }: { onChange: (point: { lat: number; lng: number }) => void }) => <button type="button" onClick={() => onChange({ lat: 1, lng: 2 })}>Choose origin</button> }
})

const { getConfig, updateConfig } = vi.hoisted(() => ({ getConfig: vi.fn(), updateConfig: vi.fn() }))
vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getConfig, updateConfig } }))

describe('RouteConfigDialog', () => {
  it('saves coordinates selected on the origin map', async () => {
    getConfig.mockResolvedValue({ depot: { name: 'Depósito', latitude: -34, longitude: -58 } })
    updateConfig.mockResolvedValue({})
    render(<RouteConfigDialog open onOpenChange={vi.fn()} />)
    await screen.findByDisplayValue('Depósito')
    fireEvent.click(screen.getByRole('button', { name: 'Choose origin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }))
    await waitFor(() => expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ depot: expect.objectContaining({ latitude: 1, longitude: 2 }) })))
  })
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
