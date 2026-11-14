import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ClientsPage from './page'

const mocks = vi.hoisted(() => ({ list: vi.fn(), zones: vi.fn(), create: vi.fn(), update: vi.fn(), hasPermission: vi.fn() }))
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ hasPermission: mocks.hasPermission }) }))
vi.mock('@/services/client.service', () => ({ clientService: mocks }))
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  APILoadingStatus: { LOADED: 'loaded', FAILED: 'failed', AUTH_FAILURE: 'auth' },
  useApiLoadingStatus: () => 'loaded',
  useMap: () => null,
  Map: ({ children, onClick }: { children: ReactNode; onClick: (event: unknown) => void }) => <div><button type="button" onClick={() => onClick({ detail: { latLng: { lat: -34, lng: -58 } } })}>Seleccionar punto de prueba</button>{children}</div>,
  Marker: () => null,
}))

describe('Client management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasPermission.mockReturnValue(true)
    mocks.list.mockResolvedValue([{ _id: '1', nombreCompleto: 'Ana', isActive: true, address: 'Calle 1', lat: 0, lng: 0, locationRevision: 2 }])
    mocks.zones.mockResolvedValue([])
    mocks.update.mockResolvedValue(undefined)
    mocks.create.mockResolvedValue(undefined)
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('confirms deactivation without sending location fields', async () => {
    render(<ClientsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))
    expect(screen.getByText(/historial se conservará/)).toBeInTheDocument()
    expect(screen.getByText(/entregas pendientes/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('1', { isActive: false, expectedFields: { isActive: true } }))
  })

  it('includes the reviewed snapshot when changing the address', async () => {
    render(<ClientsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Calle 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('1', {
      address: 'Calle 2', expectedFields: {},
      expectedLocation: { address: 'Calle 1', lat: 0, lng: 0, locationRevision: 2 },
    }))
  })

  it('clears the address without sending unrelated fields', async () => {
    render(<ClientsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('1', {
      address: null, expectedFields: {},
      expectedLocation: { address: 'Calle 1', lat: 0, lng: 0, locationRevision: 2 },
    }))
  })

  it('sends only changed contact fields with their original values', async () => {
    render(<ClientsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Ana María' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('1', {
      nombreCompleto: 'Ana María', expectedFields: { nombreCompleto: 'Ana' },
    }))
  })

  it('hides mutations without permission', async () => {
    mocks.hasPermission.mockReturnValue(false)
    render(<ClientsPage />)
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuevo cliente' })).not.toBeInTheDocument()
  })

  it('disables pagination after a failed search and restores it after a successful retry', async () => {
    const clients = Array.from({ length: 26 }, (_, index) => ({ _id: String(index), nombreCompleto: `Client ${index}`, isActive: true }))
    mocks.list.mockReset().mockResolvedValueOnce(clients).mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce(clients)
    render(<ClientsPage />)
    await screen.findByText('Client 0')
    const next = screen.getByRole('button', { name: 'Siguiente' })
    expect(next).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Buscar clientes'), { target: { value: 'Ana' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la operación')
    expect(next).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    fireEvent.click(next)
    expect(mocks.list).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar lista' }))
    await waitFor(() => expect(next).toBeEnabled())
    expect(mocks.list).toHaveBeenLastCalledWith('Ana', 0, 26)
  })

  it('creates an unconfirmed map reference independently of the delivery zone', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    vi.stubGlobal('google', { maps: { SymbolPath: { CIRCLE: 0 } } })
    mocks.zones.mockResolvedValue([{ _id: 'zone-1', name: 'Norte', active: true }])
    render(<ClientsPage />)
    await screen.findByText('Ana')
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    expect(screen.getByText(/referencia sin confirmar/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Nuevo' } })
    fireEvent.change(screen.getByLabelText('Zona de reparto'), { target: { value: 'zone-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar punto de prueba' }))
    expect(screen.getByLabelText('Latitud')).toHaveValue('-34')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ nombreCompleto: 'Nuevo', telefonos: [], isActive: true, lat: -34, lng: -58, deliveryZoneId: 'zone-1' }))
  })

  it('updates coordinates with the reviewed location snapshot and can clear them', async () => {
    render(<ClientsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    expect(screen.getByText(/mapa no está configurado/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '-34' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '-58' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('1', { lat: -34, lng: -58, expectedFields: {}, expectedLocation: { address: 'Calle 1', lat: 0, lng: 0, locationRevision: 2 } }))
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar ubicación' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith('1', { lat: null, lng: null, expectedFields: {}, expectedLocation: { address: 'Calle 1', lat: 0, lng: 0, locationRevision: 2 } }))
  })

  it('rejects incomplete or out-of-range manual coordinates before saving', async () => {
    render(<ClientsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '91' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByText(/Ingresá ambas coordenadas válidas/)).toBeInTheDocument()
    expect(mocks.update).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('keeps a stale coordinate edit open and asks the user to review after a conflict', async () => {
    mocks.update.mockRejectedValue({ isAxiosError: true, response: { status: 409 } })
    render(<ClientsPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '-34' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '-58' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/Los datos cambiaron desde que abriste/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Latitud')).toHaveValue('-34')
  })

  it.each(['create', 'edit'])('locks mutable controls and dismissal during a pending %s save', async (mode) => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    vi.stubGlobal('google', { maps: { SymbolPath: { CIRCLE: 0 } } })
    let rejectSave: (error: Error) => void = () => {}
    const pending = new Promise((_, reject) => { rejectSave = reject })
    if (mode === 'create') mocks.create.mockReturnValueOnce(pending)
    else mocks.update.mockReturnValueOnce(pending)
    render(<ClientsPage />)
    await screen.findByText('Ana')
    fireEvent.click(screen.getByRole('button', { name: mode === 'create' ? 'Nuevo cliente' : 'Editar' }))
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Nuevo nombre' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Guardando cliente')
    for (const label of ['Nombre *', 'Dirección', 'Latitud', 'Longitud', 'Teléfonos', 'Zona de reparto']) {
      expect(screen.getByLabelText(label)).toBeDisabled()
    }
    expect(screen.getByRole('button', { name: 'Seleccionar punto de prueba' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Quitar ubicación' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
    const form = screen.getByLabelText('Nombre *').closest('form')
    expect(form).not.toBeNull()
    if (form) fireEvent.submit(form)
    expect(mode === 'create' ? mocks.create : mocks.update).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar punto de prueba' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.pointerDown(document.body)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Latitud')).toHaveValue(mode === 'create' ? '' : '0')
    rejectSave(new Error('Failed'))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar la operación')
    expect(screen.getByLabelText('Nombre *')).toBeEnabled()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Nuevo nombre')
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled()
  })
})
