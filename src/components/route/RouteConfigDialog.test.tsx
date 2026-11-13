import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteConfigDialog } from './RouteConfigDialog'
import { fireEvent } from '@testing-library/react'

const { getConfig, updateConfig, confirmLocation } = vi.hoisted(() => ({ getConfig: vi.fn(), updateConfig: vi.fn(), confirmLocation: vi.fn() }))
vi.mock('@/services/routePlan.service', () => ({ routePlanService: { getConfig, updateConfig } }))
vi.mock('@/services/client.service', () => ({ clientService: { confirmLocation, geocode: vi.fn(), locationSnapshot: vi.fn().mockResolvedValue({ address: 'Calle 1', lat: null, lng: null, locationRevision: 0 }) } }))

vi.mock('./LocationMapPicker', async (importOriginal) => {
  const original = await importOriginal<typeof import('./LocationMapPicker')>()
  return { ...original, LocationMapPicker: ({ onChange }: { onChange: (point: { lat: number; lng: number }) => void }) => <button type="button" onClick={() => onChange({ lat: 1, lng: 2 })}>Choose origin</button> }
})

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

  it('shows both location panels and saves a selected client as pending', async () => {
    getConfig.mockResolvedValue({ depot: { name: 'Depósito', address: 'Origen', latitude: -34, longitude: -58 }, maxStops: 20 })
    render(<RouteConfigDialog open onOpenChange={vi.fn()} canManageConfig canConfirmLocation clients={[{ id: 'c1', name: 'Cliente', address: 'Calle 1' }]} />)
    expect(await screen.findByText('Configurar depósito de origen')).toBeInTheDocument()
    expect(screen.getByText('Geocodificación manual de direcciones')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'c1' } })
    expect(screen.getByLabelText('Dirección')).toHaveValue('Calle 1')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar coordenadas' })).toBeEnabled())
    confirmLocation.mockResolvedValueOnce({ geocoding: { status: 'PENDING' } })
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar coordenadas' }))
    expect(await screen.findByText('Ubicación manual guardada. Pendiente de validación.')).toBeInTheDocument()
    expect(confirmLocation).toHaveBeenCalledWith('c1', { manualReference: { address: 'Calle 1', lat: 0, lng: 0 }, expectedLocation: { address: 'Calle 1', lat: null, lng: null, locationRevision: 0 } })
  })
})
