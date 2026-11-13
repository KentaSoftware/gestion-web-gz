import { configureStore } from '@reduxjs/toolkit'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import LineaVenta from './LineaVenta'
import saleReducer from '@/redux/saleSlice'
import apiClient from '@/utils/client'
import { clientService } from '@/services/client.service'
import type { SaleClientOption, SaleClientOptionsPage } from '@/interfaces/client.interface'
import type { ComboboxProps } from '@/components/ui/combobox'

vi.mock('@/utils/client', () => ({ default: { post: vi.fn(), patch: vi.fn() } }))
vi.mock('@/services/client.service', () => ({ clientService: { saleOptionsPage: vi.fn() } }))
vi.mock('@/hooks/useLocalStorage', () => ({ default: () => [{ token: 'token' }, vi.fn()] }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }))
vi.mock('./ListLineaVenta', () => ({ default: () => null }))
vi.mock('@/components/ui/calendar', () => ({ Calendar: () => null }))
const comboboxCapture = vi.hoisted(() => ({ current: null as ComboboxProps<SaleClientOption> | null }))
vi.mock('@/components/ui/combobox', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/components/ui/combobox')>()
  return { default: (props: ComboboxProps<SaleClientOption>) => {
    comboboxCapture.current = props
    return <original.default {...props} />
  } }
})
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
    vi.mocked(clientService.saleOptionsPage).mockReset()
    vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockReset().mockResolvedValue({ data: {} })
  })

  it('shows a dropdown trigger, searches inside it, and submits only an explicitly selected ID', async () => {
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [{ id: 'client-1', name: 'Ana' }], nextCursor: null })
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
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [{ id: 'client-1', name: 'Ana' }], nextCursor: null })
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
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [{ id: 'client-1', name: 'Ana' }], nextCursor: null })
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
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [
      { id: 'aaa123456', name: 'Ana', address: 'Calle 1' },
      { id: 'bbb123456', name: 'Ana', address: 'Calle 2' },
      { id: 'eee123456', name: 'Ana', address: 'Calle 1' },
      { id: 'ccc123456', name: 'Ana' },
      { id: 'ddd123456', name: 'Ana' },
    ], nextCursor: null })
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
    vi.mocked(clientService.saleOptionsPage).mockRejectedValue(new axios.AxiosError('forbidden', 'ERR', undefined, undefined, { status: 403, statusText: '', headers: {}, config: { headers: new axios.AxiosHeaders() }, data: {} }))
    setup()
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    expect(await screen.findByText(/permiso read_client/)).toBeTruthy()
  })

  it('offers retry for network failures and shows empty results', async () => {
    vi.mocked(clientService.saleOptionsPage).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ clients: [], nextCursor: null })
    setup()
    openClientSelector()
    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reintentar' })).toBe(retry)
    await userEvent.setup().click(retry)
    expect(await screen.findByText('No se encontraron clientes activos.', { selector: 'p' })).toBeTruthy()
  })

  it('allows keyboard users to retry the first page', async () => {
    const user = userEvent.setup()
    vi.mocked(clientService.saleOptionsPage).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ clients: [], nextCursor: null })
    setup()
    openClientSelector()
    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    getClientSearch().focus()
    await user.tab()
    expect(document.activeElement).toBe(retry)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(clientService.saleOptionsPage).toHaveBeenCalledTimes(2))
  })

  it('browses the first page without typing and loads more', async () => {
    vi.mocked(clientService.saleOptionsPage)
      .mockResolvedValueOnce({ clients: [{ id: 'first', name: 'Ana' }], nextCursor: 'cursor' })
      .mockResolvedValueOnce({ clients: [{ id: 'second', name: 'Ana' }], nextCursor: null })
    setup()
    openClientSelector()
    expect(await screen.findByRole('option', { name: /Ana.*first/ })).toBeTruthy()
    expect(clientService.saleOptionsPage).toHaveBeenCalledWith('')
    fireEvent.click(screen.getByRole('button', { name: /Cargar m.s clientes/ }))
    expect(await screen.findByRole('option', { name: /Ana.*second/ })).toBeTruthy()
    expect(clientService.saleOptionsPage).toHaveBeenCalledWith('', 'cursor')
    expect(screen.queryByRole('button', { name: /Cargar m.s clientes/ })).toBeNull()
  })

  it('cancels a pending search when a client is selected', async () => {
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [{ id: 'first', name: 'First' }], nextCursor: null })
    const store = setup()
    openClientSelector()
    await screen.findByRole('option', { name: /First.*first/ })
    fireEvent.change(getClientSearch(), { target: { value: 'New' } })
    act(() => {
      comboboxCapture.current?.onChange({ id: 'first', name: 'First' })
      comboboxCapture.current?.onOpenChange?.(false)
    })
    expect(store.getState().sale.idCliente).toBe('first')
    await new Promise(resolve => setTimeout(resolve, 350))
    expect(clientService.saleOptionsPage).toHaveBeenCalledTimes(1)
  })

  it('retains loaded clients and retries the failed continuation cursor', async () => {
    const user = userEvent.setup()
    vi.mocked(clientService.saleOptionsPage)
      .mockResolvedValueOnce({ clients: [{ id: 'first', name: 'First' }], nextCursor: 'cursor' })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ clients: [{ id: 'second', name: 'Second' }], nextCursor: null })
    setup()
    openClientSelector()
    fireEvent.click(await screen.findByRole('button', { name: /Cargar m.s clientes/ }))
    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('option', { name: /Second.*second/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /First.*first/ })).toBeTruthy()
    expect(vi.mocked(clientService.saleOptionsPage).mock.calls).toEqual([[''], ['', 'cursor'], ['', 'cursor']])
  })

  it('debounces typing while immediately invalidating old results', async () => {
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [{ id: 'old', name: 'Old' }], nextCursor: null })
    setup()
    openClientSelector()
    expect(await screen.findByRole('option', { name: /Old.*old/ })).toBeTruthy()
    fireEvent.change(getClientSearch(), { target: { value: 'A' } })
    expect(screen.queryByRole('option', { name: /Old.*old/ })).toBeNull()
    fireEvent.change(getClientSearch(), { target: { value: 'An' } })
    fireEvent.change(getClientSearch(), { target: { value: 'Ana' } })
    expect(clientService.saleOptionsPage).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(clientService.saleOptionsPage).toHaveBeenCalledWith('Ana'))
    expect(vi.mocked(clientService.saleOptionsPage).mock.calls).toEqual([[''], ['Ana']])
  })

  it('cancels a pending search when the selector closes', async () => {
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [], nextCursor: null })
    setup()
    openClientSelector()
    await waitFor(() => expect(clientService.saleOptionsPage).toHaveBeenCalledWith(''))
    fireEvent.change(getClientSearch(), { target: { value: 'Ana' } })
    fireEvent.keyDown(getClientSearch(), { key: 'Escape' })
    await new Promise(resolve => setTimeout(resolve, 350))
    expect(clientService.saleOptionsPage).toHaveBeenCalledTimes(1)
  })

  it('lets keyboard users tab to load more and activate it', async () => {
    const user = userEvent.setup()
    vi.mocked(clientService.saleOptionsPage)
      .mockResolvedValueOnce({ clients: [{ id: 'first', name: 'First' }], nextCursor: 'cursor' })
      .mockResolvedValueOnce({ clients: [{ id: 'second', name: 'Second' }], nextCursor: null })
    setup()
    openClientSelector()
    const loadMore = await screen.findByRole('button', { name: /Cargar m.s clientes/ })
    getClientSearch().focus()
    await user.tab()
    expect(document.activeElement).toBe(loadMore)
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('option', { name: /Second.*second/ })).toBeTruthy()
  })

  it('shows and clears a preloaded selection, and searches a single character', async () => {
    vi.mocked(clientService.saleOptionsPage).mockResolvedValue({ clients: [], nextCursor: null })
    const store = setup(false, { ...baseSale, cliente: 'Existing', idCliente: 'existing' } as typeof baseSale)
    expect(screen.getByRole('combobox', { name: 'Cliente' }).textContent).toContain('Existing')
    openClientSelector()
    fireEvent.change(getClientSearch(), { target: { value: 'A' } })
    expect(store.getState().sale.idCliente).toBeUndefined()
    await waitFor(() => expect(clientService.saleOptionsPage).toHaveBeenCalledWith('A'))
  })

  it('ignores a pending page when the query changes', async () => {
    let resolvePage: (page: SaleClientOptionsPage) => void = () => {}
    vi.mocked(clientService.saleOptionsPage).mockImplementation((query, cursor) => {
      if (cursor) return new Promise(resolve => { resolvePage = resolve })
      return Promise.resolve(query ? { clients: [{ id: 'new', name: 'New' }], nextCursor: null } : { clients: [{ id: 'first', name: 'First' }], nextCursor: 'cursor' })
    })
    setup()
    openClientSelector()
    fireEvent.click(await screen.findByRole('button', { name: /Cargar m.s clientes/ }))
    fireEvent.change(getClientSearch(), { target: { value: 'N' } })
    expect(await screen.findByRole('option', { name: /New.*new/ })).toBeTruthy()
    resolvePage({ clients: [{ id: 'stale', name: 'Stale' }], nextCursor: null })
    await Promise.resolve()
    expect(screen.queryByRole('option', { name: /Stale.*stale/ })).toBeNull()
  })

  it('ignores stale client options after a newer query has completed', async () => {
    let resolveFirst: (page: SaleClientOptionsPage) => void = () => {}
    let resolveSecond: (page: SaleClientOptionsPage) => void = () => {}
    vi.mocked(clientService.saleOptionsPage)
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve }))
    setup()
    openClientSelector()
    await waitFor(() => expect(clientService.saleOptionsPage).toHaveBeenCalledWith(''))
    expect(await screen.findByText('Buscando clientes...')).toBeTruthy()

    fireEvent.change(getClientSearch(), { target: { value: 'Ana' } })
    resolveFirst({ clients: [{ id: 'stale-client', name: 'Ana Stale' }], nextCursor: null })
    await Promise.resolve()
    expect(screen.queryByRole('option', { name: /Ana Stale.*stale-client/ })).toBeNull()
    await waitFor(() => expect(clientService.saleOptionsPage).toHaveBeenCalledWith('Ana'))
    resolveSecond({ clients: [{ id: 'new-client', name: 'Ana New' }], nextCursor: null })
    expect(await screen.findByRole('option', { name: /Ana New.*new-client/ })).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('option', { name: /Ana Stale.*stale-client/ })).toBeNull())
  })
})
