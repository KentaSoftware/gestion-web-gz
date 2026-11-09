import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GeocodingDialog } from './GeocodingDialog'

const { geocode, confirmLocation } = vi.hoisted(() => ({ geocode: vi.fn(), confirmLocation: vi.fn() }))
vi.mock('@/services/client.service', () => ({ clientService: { geocode, confirmLocation } }))

describe('GeocodingDialog', () => {
  it('explains that no candidates block routing without inventing coordinates', async () => {
    geocode.mockResolvedValue({ candidates: [] })
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(screen.getByText(/destino seguirá bloqueado/i)).toBeInTheDocument())
    expect(screen.getByLabelText('Latitud')).toBeInTheDocument()
  })

  it('saves zero coordinates as pending after provider failure', async () => {
    geocode.mockRejectedValueOnce(new Error('unavailable'))
    confirmLocation.mockResolvedValueOnce({ geocoding: { status: 'PENDING' } })
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText(/proveedor de geocodificación no está disponible/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '0' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar coordenadas' }))
    await waitFor(() => expect(confirmLocation).toHaveBeenCalledWith('client-1', { manualReference: { address: 'Calle 1', lat: 0, lng: 0 } }))
    expect(screen.getByText('Ubicación manual guardada. Pendiente de validación.')).toBeInTheDocument()
    expect(screen.queryByText(/Ubicación confirmada/)).not.toBeInTheDocument()
  })

  it('rejects empty and out-of-range coordinates', async () => {
    confirmLocation.mockClear()
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar coordenadas' }))
    expect(screen.getByText(/Ingresá una dirección y coordenadas válidas/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '91' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '0' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar coordenadas' }))
    expect(confirmLocation).not.toHaveBeenCalled()
  })

  it('ignores provider results for an earlier client', async () => {
    let resolveSearch: (value: { candidates: Array<{ placeId: string; formattedAddress: string; precision: 'ROOFTOP'; lat: number; lng: number }> }) => void = () => {}
    geocode.mockReturnValueOnce(new Promise((resolve) => { resolveSearch = resolve }))
    const { rerender } = render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    rerender(<GeocodingDialog open clientId="client-2" address="Calle 2" onOpenChange={vi.fn()} />)
    resolveSearch({ candidates: [{ placeId: 'old', formattedAddress: 'Calle vieja', precision: 'ROOFTOP', lat: 0, lng: 0 }] })
    await waitFor(() => expect(screen.getByLabelText('Dirección')).toHaveValue('Calle 2'))
    expect(screen.queryByText('Calle vieja')).not.toBeInTheDocument()
  })

  it('does not apply an in-flight save after the dialog closes', async () => {
    let resolveSave: (value: { geocoding: { status: string } }) => void = () => {}
    confirmLocation.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve }))
    const onConfirmed = vi.fn()
    const { rerender } = render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} onConfirmed={onConfirmed} />)
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '0' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar coordenadas' }))
    rerender(<GeocodingDialog open={false} clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} onConfirmed={onConfirmed} />)
    resolveSave({ geocoding: { status: 'PENDING' } })
    rerender(<GeocodingDialog open clientId="client-2" address="Calle 2" onOpenChange={vi.fn()} onConfirmed={onConfirmed} />)
    await waitFor(() => expect(screen.getByLabelText('Dirección')).toHaveValue('Calle 2'))
    expect(screen.queryByText(/Ubicación manual guardada/)).not.toBeInTheDocument()
    expect(onConfirmed).not.toHaveBeenCalled()
  })

  it('does not claim pending when the response does not report that status', async () => {
    confirmLocation.mockResolvedValueOnce({})
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '0' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar coordenadas' }))
    expect(await screen.findByText(/no se recibió su estado de validación/)).toBeInTheDocument()
    expect(screen.queryByText('Ubicación manual guardada. Pendiente de validación.')).not.toBeInTheDocument()
  })

  it('searches and confirms a location without route-specific permissions', async () => {
    geocode.mockResolvedValue({ candidates: [{ placeId: 'place-1', formattedAddress: 'Calle 1, Ciudad', precision: 'ROOFTOP', latitude: -34, longitude: -58 }] })
    confirmLocation.mockResolvedValue({})
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar esta ubicación' }))

    await waitFor(() => expect(confirmLocation).toHaveBeenCalledWith('client-1', { candidate: expect.objectContaining({ placeId: 'place-1' }) }))
    expect(screen.getByRole('status')).toHaveTextContent('Ubicación confirmada')
  })
})
