import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import LineaVenta from './LineaVenta'
import saleReducer from '@/redux/saleSlice'
import apiClient from '@/utils/client'
import { clientService } from '@/services/client.service'

vi.mock('@/utils/client', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))
vi.mock('@/services/client.service', () => ({ clientService: { saleOptions: vi.fn() } }))
vi.mock('@/hooks/useLocalStorage', () => ({ default: () => [{ token: 'token' }, vi.fn()] }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }))
vi.mock('./ListLineaVenta', () => ({ default: () => null }))
vi.mock('@/components/ui/calendar', () => ({ Calendar: () => null }))
vi.mock('../AnimatedNumber', () => ({ AnimatedNumber: ({ value }: { value: number }) => <span>{value}</span> }))

const baseSale = { _id: 'sale', cliente: '', createdAt: '', estado: 'Creado', total: 10, itemsSale: [{ idProducto: 'product', cantidad: 1, total: 10, precio: 10 }], porcentaje: 0 }
function setup(edit = false, sale = baseSale) {
  const store = configureStore({ reducer: { sale: saleReducer }, preloadedState: { sale } })
  render(<Provider store={store}><LineaVenta edit={edit} /></Provider>)
  return store
}

describe('sale client selection', () => {
  beforeEach(() => {
    vi.mocked(clientService.saleOptions).mockReset()
    vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockReset().mockResolvedValue({ data: {} })
  })

  it('requires an explicit choice and submits its ID without delivery date', async () => {
    vi.mocked(clientService.saleOptions).mockResolvedValue([{ id: 'client-1', name: 'Ana' }])
    setup()
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'An' } })
    fireEvent.click(screen.getByText('Crear'))
    expect(apiClient.post).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: /Ana.*client-1/ }))
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledOnce())
    const payload = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
    expect(payload.idCliente).toBe('client-1')
    expect(payload.createdAt).toBeInstanceOf(Date)
    expect(payload).not.toHaveProperty('delivery')
    expect(screen.getByText('Fecha de venta')).toBeTruthy()
  })

  it('clears the selected ID when text changes', async () => {
    vi.mocked(clientService.saleOptions).mockResolvedValue([{ id: 'client-1', name: 'Ana' }])
    const store = setup()
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'An' } })
    fireEvent.click(await screen.findByRole('button', { name: /Ana.*client-1/ }))
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Anita' } })
    expect(store.getState().sale.idCliente).toBeUndefined()
    fireEvent.click(screen.getByText('Crear'))
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('edits legacy names without assigning an ID or touching delivery', async () => {
    setup(true, { ...baseSale, cliente: 'Legacy' })
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).readOnly).toBe(false)
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Legacy edited' } })
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledOnce())
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).toMatchObject({ cliente: 'Legacy edited' })
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).not.toHaveProperty('idCliente')
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).not.toHaveProperty('delivery')
  })

  it('keeps an existing linked identity and cancellation unchanged', async () => {
    const store = setup(true, { ...baseSale, cliente: 'Ana', estado: 'Cancelado', idCliente: 'client-1' } as typeof baseSale)
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).readOnly).toBe(true)
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledOnce())
    expect(store.getState().sale.idCliente).toBe('client-1')
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).toMatchObject({ estado: 'Cancelado' })
    expect(vi.mocked(apiClient.patch).mock.calls[0][1]).not.toHaveProperty('idCliente')
  })

  it('distinguishes duplicate names by address and stable ID and submits the chosen ID', async () => {
    vi.mocked(clientService.saleOptions).mockResolvedValue([
      { id: 'aaa123456', name: 'Ana', address: 'Calle 1' },
      { id: 'bbb123456', name: 'Ana', address: 'Calle 2' },
      { id: 'eee123456', name: 'Ana', address: 'Calle 1' },
      { id: 'ccc123456', name: 'Ana' },
      { id: 'ddd123456', name: 'Ana' },
    ])
    setup()
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'An' } })
    expect(await screen.findByRole('button', { name: /Ana.*Calle 1.*aaa123456/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ana.*Calle 2.*bbb123456/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ana.*Calle 1.*eee123456/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ana.*Sin dirección.*ccc123456/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Ana.*Sin dirección.*ddd123456/ }))
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledOnce())
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ idCliente: 'ddd123456' })
  })

  it('shows actionable permission errors', async () => {
    vi.mocked(clientService.saleOptions).mockRejectedValue(new axios.AxiosError('forbidden', 'ERR', undefined, undefined, { status: 403, statusText: '', headers: {}, config: { headers: new axios.AxiosHeaders() }, data: {} }))
    setup()
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'An' } })
    expect(await screen.findByText(/permiso read_client/)).toBeTruthy()
  })

  it('offers retry for network failures and shows empty results', async () => {
    vi.mocked(clientService.saleOptions).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    setup()
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'An' } })
    fireEvent.click(await screen.findByText('Reintentar'))
    expect(await screen.findByText('No se encontraron clientes activos.')).toBeTruthy()
  })
})
