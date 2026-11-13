import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import LineaVenta from './LineaVenta'
import saleReducer from '@/redux/saleSlice'
import apiClient from '@/utils/client'
import { clientService } from '@/services/client.service'
import type { SaleClientOption } from '@/interfaces/client.interface'

vi.mock('@/utils/client', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))
vi.mock('@/services/client.service', () => ({ clientService: { saleOptions: vi.fn() } }))
vi.mock('@/hooks/useLocalStorage', () => ({ default: () => [{ token: 'token' }, vi.fn()] }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }))
vi.mock('./ListLineaVenta', () => ({ default: () => null }))
vi.mock('@/components/ui/calendar', () => ({ Calendar: () => null }))
vi.mock('../AnimatedNumber', () => ({ AnimatedNumber: ({ value }: { value: number }) => <span>{value}</span> }))
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })

const baseSale = { _id: 'sale', cliente: '', createdAt: '', estado: 'Creado', total: 10, itemsSale: [{ idProducto: 'product', cantidad: 1, total: 10, precio: 10 }], porcentaje: 0 }
function setup(edit = false, sale = baseSale) {
  const store = configureStore({ reducer: { sale: saleReducer }, preloadedState: { sale } })
  render(<Provider store={store}><LineaVenta edit={edit} /></Provider>)
  return store
}

function openClientSelector() {
  fireEvent.click(screen.getByRole('combobox', { name: 'Cliente' }))
}

function getClientSearch() {
  return screen.getByPlaceholderText('Seleccionar cliente')
}

describe('sale client selection', () => {
  beforeEach(() => {
    vi.mocked(clientService.saleOptions).mockReset()
    vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockReset().mockResolvedValue({ data: {} })
  })

  it('shows a dropdown trigger, searches inside it, and submits only an explicitly selected ID', async () => {
    vi.mocked(clientService.saleOptions).mockResolvedValue([{ id: 'client-1', name: 'Ana' }])
    setup()
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toBeTruthy()
    expect(screen.queryByPlaceholderText('Seleccionar cliente')).toBeNull()
    fireEvent.click(screen.getByText('Crear'))
    expect(apiClient.post).not.toHaveBeenCalled()

    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    expect(await screen.findByRole('option', { name: /Ana.*client-1/ })).toBeTruthy()
    fireEvent.click(screen.getByText('Crear'))
    expect(apiClient.post).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('option', { name: /Ana.*client-1/ }))
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledOnce())
    const payload = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
    expect(payload.idCliente).toBe('client-1')
    expect(payload.createdAt).toBeInstanceOf(Date)
    expect(payload).not.toHaveProperty('delivery')
    expect(screen.getByText('Fecha de venta')).toBeTruthy()
  })

  it('allows clearing a selected client and blocks submission afterward', async () => {
    vi.mocked(clientService.saleOptions).mockResolvedValue([{ id: 'client-1', name: 'Ana' }])
    const store = setup()
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    fireEvent.click(await screen.findByRole('option', { name: /Ana.*client-1/ }))
    expect(store.getState().sale.idCliente).toBe('client-1')
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }))
    expect(store.getState().sale.idCliente).toBeUndefined()
    fireEvent.click(screen.getByText('Crear'))
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('clears a previous choice immediately when a new search query is typed', async () => {
    vi.mocked(clientService.saleOptions).mockResolvedValue([{ id: 'client-1', name: 'Ana' }])
    const store = setup()
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    fireEvent.click(await screen.findByRole('option', { name: /Ana.*client-1/ }))

    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'Anita' } })
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
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    expect(await screen.findByRole('option', { name: /Ana.*Calle 1.*aaa123456/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Ana.*Calle 2.*bbb123456/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Ana.*Calle 1.*eee123456/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Ana.*Sin dirección.*ccc123456/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('option', { name: /Ana.*Sin dirección.*ddd123456/ }))
    fireEvent.click(screen.getByText('Crear'))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledOnce())
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({ idCliente: 'ddd123456' })
  })

  it('shows actionable permission errors', async () => {
    vi.mocked(clientService.saleOptions).mockRejectedValue(new axios.AxiosError('forbidden', 'ERR', undefined, undefined, { status: 403, statusText: '', headers: {}, config: { headers: new axios.AxiosHeaders() }, data: {} }))
    setup()
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    expect(await screen.findByText(/permiso read_client/)).toBeTruthy()
  })

  it('offers retry for network failures and shows empty results', async () => {
    vi.mocked(clientService.saleOptions).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    setup()
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    fireEvent.click(await screen.findByText('Reintentar'))
    expect(await screen.findByText('No se encontraron clientes activos.', { selector: 'p' })).toBeTruthy()
  })

  it('does not search until the query has two characters and rejects overlong queries', async () => {
    setup()
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'A' } })
    await new Promise(resolve => setTimeout(resolve, 350))
    expect(clientService.saleOptions).not.toHaveBeenCalled()

    fireEvent.change(getClientSearch(), { target: { value: 'A'.repeat(101) } })
    await new Promise(resolve => setTimeout(resolve, 350))
    expect(clientService.saleOptions).not.toHaveBeenCalled()
    expect(await screen.findByText(/hasta 100 caracteres/)).toBeTruthy()
  })

  it('ignores stale client options after a newer query has completed', async () => {
    let resolveFirst: (clients: SaleClientOption[]) => void = () => {}
    let resolveSecond: (clients: SaleClientOption[]) => void = () => {}
    vi.mocked(clientService.saleOptions)
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve }))
    setup()
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    await waitFor(() => expect(clientService.saleOptions).toHaveBeenCalledWith('An'))
    expect(await screen.findByText('Buscando clientes...')).toBeTruthy()

    fireEvent.change(getClientSearch(), { target: { value: 'Ana' } })
    resolveFirst([{ id: 'stale-client', name: 'Ana Stale' }])
    await Promise.resolve()
    expect(screen.queryByRole('option', { name: /Ana Stale.*stale-client/ })).toBeNull()
    await waitFor(() => expect(clientService.saleOptions).toHaveBeenCalledWith('Ana'))
    resolveSecond([{ id: 'new-client', name: 'Ana New' }])
    expect(await screen.findByRole('option', { name: /Ana New.*new-client/ })).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('option', { name: /Ana Stale.*stale-client/ })).toBeNull())
  })
})
