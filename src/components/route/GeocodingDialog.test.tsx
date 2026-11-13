import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeocodingDialog } from './GeocodingDialog'

const { geocode, confirmLocation, locationSnapshot } = vi.hoisted(() => ({ geocode: vi.fn(), confirmLocation: vi.fn(), locationSnapshot: vi.fn().mockResolvedValue({ address: null, lat: null, lng: null, locationRevision: 1 }) }))
vi.mock('@/services/client.service', () => ({ clientService: { geocode, confirmLocation, locationSnapshot } }))

describe('GeocodingDialog', () => {
  beforeEach(() => {
    geocode.mockReset()
    confirmLocation.mockReset()
    locationSnapshot.mockReset().mockResolvedValue({ address: null, lat: null, lng: null, locationRevision: 1 })
  })
  it('confirms verified coordinates without an address using the exact snapshot', async () => {
    const snapshot = { address: null, lat: 0, lng: 0, locationRevision: 7 }
    locationSnapshot.mockResolvedValueOnce(snapshot)
    confirmLocation.mockResolvedValueOnce({ geocoding: { status: 'CONFIRMED' } })
    const onConfirmed = vi.fn()
    render(<GeocodingDialog open clientId="client-1" onOpenChange={vi.fn()} onConfirmed={onConfirmed} />)
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue('0'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar coordenadas' }))
    await waitFor(() => expect(confirmLocation).toHaveBeenCalledWith('client-1', { manualConfirmation: { lat: 0, lng: 0 }, expectedLocation: snapshot }))
    expect(onConfirmed).toHaveBeenCalled()
  })
  it('requires an explicit reload and another confirmation after a conflict', async () => {
    confirmLocation.mockReset()
    locationSnapshot.mockResolvedValueOnce({ address: null, lat: 1, lng: 2, locationRevision: 1 })
      .mockResolvedValueOnce({ address: 'Nueva', lat: 3, lng: 4, locationRevision: 2 })
    confirmLocation.mockRejectedValueOnce({ response: { status: 409 } }).mockResolvedValueOnce({})
    render(<GeocodingDialog open clientId="client-1" onOpenChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue('1'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar coordenadas' }))
    expect(await screen.findByText(/La ubicación cambió/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar coordenadas' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Recargar ubicación' }))
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue('3'))
    expect(confirmLocation).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar coordenadas' }))
    await waitFor(() => expect(confirmLocation).toHaveBeenCalledWith('client-1', { manualConfirmation: { lat: 3, lng: 4 }, expectedLocation: { address: 'Nueva', lat: 3, lng: 4, locationRevision: 2 } }))
  })
  it('ignores a snapshot arriving after selecting another client', async () => {
    let resolveOld: (value: { address: null; lat: number; lng: number; locationRevision: number }) => void = () => {}
    locationSnapshot.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce({ address: null, lat: 3, lng: 4, locationRevision: 2 })
    const { rerender } = render(<GeocodingDialog open clientId="client-1" onOpenChange={vi.fn()} />)
    await waitFor(() => expect(locationSnapshot).toHaveBeenCalledWith('client-1'))
    rerender(<GeocodingDialog open clientId="client-2" onOpenChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue('3'))
    resolveOld({ address: null, lat: 8, lng: 9, locationRevision: 1 })
    await waitFor(() => expect(screen.getByLabelText('Latitud')).toHaveValue('3'))
  })
  it('retains the snapshot when a provider search starts before it resolves', async () => {
    let resolveSnapshot: (value: { address: string; lat: number; lng: number; locationRevision: number }) => void = () => {}
    const snapshot = { address: 'Original', lat: 0, lng: 0, locationRevision: 12 }
    locationSnapshot.mockReturnValueOnce(new Promise((resolve) => { resolveSnapshot = resolve }))
    geocode.mockResolvedValueOnce({ candidates: [{ placeId: 'p', formattedAddress: 'Nueva', precision: 'ROOFTOP', lat: 1, lng: 2 }] })
    confirmLocation.mockReset().mockResolvedValueOnce({})
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    const button = await screen.findByRole('button', { name: 'Confirmar esta ubicación' })
    expect(button).toBeDisabled()
    resolveSnapshot(snapshot)
    await waitFor(() => expect(button).toBeEnabled())
    await userEvent.click(button)
    expect(confirmLocation).toHaveBeenCalledWith('client-1', { candidate: { placeId: 'p', formattedAddress: 'Nueva', precision: 'ROOFTOP', lat: 1, lng: 2 }, expectedLocation: snapshot })
  })
  it.each(['candidate', 'reference'])('requires reload after a %s conflict', async (kind) => {
    const initial = { address: 'Original', lat: 1, lng: 2, locationRevision: 4 }
    locationSnapshot.mockResolvedValueOnce(initial).mockResolvedValueOnce({ ...initial, locationRevision: 5 })
    geocode.mockResolvedValueOnce({ candidates: [{ placeId: 'p', formattedAddress: 'Nueva', precision: 'ROOFTOP', lat: 1, lng: 2 }] })
    confirmLocation.mockRejectedValueOnce({ response: { status: 409 } })
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar coordenadas' })).toBeEnabled())
    if (kind === 'candidate') await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await userEvent.click(screen.getByRole('button', { name: kind === 'candidate' ? 'Confirmar esta ubicación' : 'Guardar coordenadas' }))
    expect(await screen.findByText(/La ubicación cambió/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar coordenadas' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirmar coordenadas' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Recargar ubicación' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar coordenadas' })).toBeEnabled())
    expect(confirmLocation).toHaveBeenCalledTimes(1)
  })
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
    await waitFor(() => expect(confirmLocation).toHaveBeenCalledWith('client-1', { manualReference: { address: 'Calle 1', lat: 0, lng: 0 }, expectedLocation: { address: null, lat: null, lng: null, locationRevision: 1 } }))
    expect(screen.getByText('Ubicación manual guardada. Pendiente de validación.')).toBeInTheDocument()
    expect(screen.queryByText(/Ubicación confirmada/)).not.toBeInTheDocument()
  })

  it('rejects empty and out-of-range coordinates', async () => {
    confirmLocation.mockClear()
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar coordenadas' })).toBeEnabled())
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar coordenadas' })).toBeEnabled())
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar coordenadas' })).toBeEnabled())
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '0' } })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar coordenadas' }))
    expect(await screen.findByText(/no se recibió su estado de validación/)).toBeInTheDocument()
    expect(screen.queryByText('Ubicación manual guardada. Pendiente de validación.')).not.toBeInTheDocument()
  })

  it('searches and confirms a location without route-specific permissions', async () => {
    geocode.mockResolvedValue({ candidates: [{ placeId: 'place-1', formattedAddress: 'Calle 1, Ciudad', precision: 'ROOFTOP', lat: -34, lng: -58 }] })
    confirmLocation.mockResolvedValue({})
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar esta ubicación' }))

    await waitFor(() => expect(confirmLocation).toHaveBeenCalledWith('client-1', { candidate: { placeId: 'place-1', formattedAddress: 'Calle 1, Ciudad', precision: 'ROOFTOP', lat: -34, lng: -58 }, expectedLocation: { address: null, lat: null, lng: null, locationRevision: 1 } }))
    expect(screen.getByRole('status')).toHaveTextContent('Ubicación confirmada')
  })
})
