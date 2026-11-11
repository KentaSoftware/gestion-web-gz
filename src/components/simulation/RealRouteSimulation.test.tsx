import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { RealRouteSimulation } from './RealRouteSimulation'

const { get, post, seed } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), seed: { quantities: null as Record<string, number> | null } }))
vi.mock('@/utils/client', () => ({ default: { get, post } }))
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>()
  return { ...react, useState: (initial: unknown) => react.useState(seed.quantities && initial && typeof initial === 'object' && !Array.isArray(initial) && Object.keys(initial).length === 0 ? seed.quantities : initial) }
})

const routeId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const productId = 'bbbbbbbbbbbbbbbbbbbbbbbb'

function fillCosts() {
  for (const label of ['Precio combustible ($/L)', 'Gastos varios ($)', 'Costo por hora ($)']) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: '0' } })
  }
}

describe('real route simulation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    seed.quantities = null
    get.mockImplementation((url: string, options?: { params?: { cursor?: string } }) => {
      if (url === '/simulation/routes') return Promise.resolve({ data: { items: [{ _id: routeId, planningDate: '2026-01-01', zoneSnapshot: { name: 'Norte' }, metrics: { fuelLiters: 5, durationSeconds: 3600, distanceMeters: 1000 } }], hasMore: false, nextCursor: null } })
      if (url === '/simulation/route-catalog') return Promise.resolve({ data: options?.params?.cursor ? { items: [{ id: productId, name: 'Agua', stock: 10, precioUnitario: 12 }], excludedCount: 0, hasMore: false, nextCursor: null } : { items: [], excludedCount: 1, hasMore: true, nextCursor: routeId } })
      return Promise.reject(new Error('unexpected endpoint'))
    })
    post.mockResolvedValue({ data: { id: 'scenario-id', routeId, estimatedRevenue: 24, operatingCost: 1, grossMargin: 23 } })
  })

  it('loads all catalog pages and posts the exact saved route and selected product', async () => {
    render(<RealRouteSimulation canWrite />)
    fireEvent.change(await screen.findByLabelText('Cantidad de Agua'), { target: { value: '2' } })
    fillCosts()
    fireEvent.click(screen.getByRole('button', { name: 'Simular ruta real' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/route-scenarios', expect.objectContaining({ routeId, products: [{ id: productId, quantity: 2 }] })))
    expect(await screen.findByText(/scenario-id/)).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/simulation/route-catalog', { params: { cursor: routeId } })
    expect(get).not.toHaveBeenCalledWith(expect.stringContaining('/demo'), expect.anything())
  })

  it('shows operational errors and never falls back to demo', async () => {
    get.mockRejectedValue({ response: { data: { code: 'SIMULATION_DISABLED', message: 'Simulation is disabled' } } })
    render(<RealRouteSimulation canWrite />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Simulation is disabled')
    expect(get.mock.calls.every(([url]) => !url.includes('/demo'))).toBe(true)
  })

  it('does not allow writing without permission', async () => {
    render(<RealRouteSimulation canWrite={false} />)
    expect(await screen.findByRole('button', { name: 'Simular ruta real' })).toBeDisabled()
  })

  it('disables routes without required metrics', async () => {
    get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith('/routes')
      ? { items: [{ _id: routeId, planningDate: '2026-01-01', zoneSnapshot: { name: 'Norte' }, metrics: { durationSeconds: 1 } }], hasMore: false, nextCursor: null }
      : { items: [], excludedCount: 0, hasMore: false, nextCursor: null } }))
    render(<RealRouteSimulation canWrite />)
    expect(await screen.findByText(/Métricas de combustible o duración no disponibles/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simular ruta real' })).toBeDisabled()
  })

  it('reports a repeated catalog cursor instead of looping', async () => {
    get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith('/routes')
      ? { items: [], hasMore: false, nextCursor: null }
      : { items: [], excludedCount: 0, hasMore: true, nextCursor: routeId } }))
    render(<RealRouteSimulation canWrite />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Paginación del catálogo inválida')
  })

  it('shows loading while requests are pending', () => {
    get.mockReturnValue(new Promise(() => {}))
    render(<RealRouteSimulation canWrite />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })

  it('navigates saved-route cursors and selects the displayed snapshot', async () => {
    const nextId = 'cccccccccccccccccccccccc'
    get.mockImplementation((url: string, options?: { params?: { cursor?: string } }) => {
      if (url.endsWith('/route-catalog')) return Promise.resolve({ data: { items: [], excludedCount: 0, hasMore: false, nextCursor: null } })
      const id = options?.params?.cursor ? nextId : routeId
      return Promise.resolve({ data: { items: [{ _id: id, planningDate: '2026-01-01', zoneSnapshot: { name: 'Norte' }, metrics: { fuelLiters: 1, durationSeconds: 3600 } }], hasMore: id === routeId, nextCursor: id === routeId ? routeId : null } })
    })
    render(<RealRouteSimulation canWrite />)
    await screen.findByText(new RegExp(routeId))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText(new RegExp(nextId))
    fillCosts()
    fireEvent.click(screen.getByRole('button', { name: 'Simular ruta real' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/route-scenarios', expect.objectContaining({ routeId: nextId })))
  })

  it('requires explicit costs, accepts zero, and enforces whole quantities within stock', async () => {
    render(<RealRouteSimulation canWrite />)
    const quantity = await screen.findByLabelText('Cantidad de Agua')
    const button = screen.getByRole('button', { name: 'Simular ruta real' })
    expect(screen.getByLabelText('Precio combustible ($/L)')).toHaveValue(null)
    expect(button).toBeDisabled()
    fillCosts()
    expect(button).toBeEnabled()
    fireEvent.change(quantity, { target: { value: '1.5' } })
    expect(button).toBeDisabled()
    fireEvent.change(quantity, { target: { value: '11' } })
    expect(button).toBeDisabled()
    fireEvent.change(quantity, { target: { value: '10' } })
    expect(button).toBeEnabled()
  })

  it('rejects unsafe integer quantities without changing the entered value', async () => {
    get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith('/routes')
      ? { items: [{ _id: routeId, metrics: { fuelLiters: 1, durationSeconds: 1 } }], hasMore: false, nextCursor: null }
      : { items: [{ id: productId, name: 'Agua', stock: Number.MAX_SAFE_INTEGER + 2, precioUnitario: 12 }], excludedCount: 0, hasMore: false, nextCursor: null } }))
    render(<RealRouteSimulation canWrite />)
    const quantity = await screen.findByLabelText('Cantidad de Agua')
    fillCosts()
    fireEvent.change(quantity, { target: { value: '9007199254740992' } })
    expect(quantity).toHaveValue(9007199254740992)
    expect(screen.getByRole('alert')).toHaveTextContent(/entero seguro/i)
    expect(screen.getByRole('button', { name: 'Simular ruta real' })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects more than 10000 submitted products without changing quantities', async () => {
    const items = Array.from({ length: 10001 }, (_, index) => ({ id: `p${index}`, name: `Producto ${index}`, stock: 1, precioUnitario: 1 }))
    seed.quantities = Object.fromEntries(items.map(({ id }) => [id, 1]))
    get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith('/routes')
      ? { items: [{ _id: routeId, metrics: { fuelLiters: 1, durationSeconds: 1 } }], hasMore: false, nextCursor: null }
      : { items, excludedCount: 0, hasMore: false, nextCursor: null } }))
    const { container } = render(<RealRouteSimulation canWrite />)
    await waitFor(() => expect(container.querySelector('[aria-label="Cantidad de Producto 10000"]')).not.toBeNull(), { timeout: 30000 })
    const costs = container.querySelectorAll('fieldset:nth-of-type(2) input[type="number"]')
    costs.forEach((input) => fireEvent.change(input, { target: { value: '0' } }))
    expect(container.querySelector('[role="alert"]')).toHaveTextContent(/10[.\s]?000 productos/i)
    const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === 'Simular ruta real')
    expect(button).toBeDisabled()
    const quantity = container.querySelector('[aria-label="Cantidad de Producto 10000"]') as HTMLInputElement
    expect(quantity).toHaveValue(1)
    expect(post).not.toHaveBeenCalled()
    fireEvent.change(quantity, { target: { value: '0' } })
    expect(button).toBeEnabled()
  }, 60000)

  it('shows the server message from an AxiosError instance', async () => {
    const failure = new AxiosError('Request failed with status code 503')
    failure.response = { data: { message: 'Simulación deshabilitada' }, status: 503, statusText: 'Unavailable', headers: {}, config: { headers: {} } as never }
    get.mockRejectedValue(failure)
    render(<RealRouteSimulation canWrite />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Simulación deshabilitada')
  })

  it('clears a result when product, cost, surplus, or route changes', async () => {
    const otherId = 'cccccccccccccccccccccccc'
    get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith('/routes')
      ? { items: [routeId, otherId].map((_id) => ({ _id, planningDate: '2026-01-01', zoneSnapshot: { name: 'Norte' }, metrics: { fuelLiters: 5, durationSeconds: 3600 } })), hasMore: false, nextCursor: null }
      : { items: [{ id: productId, name: 'Agua', stock: 10, precioUnitario: 12 }], excludedCount: 0, hasMore: false, nextCursor: null } }))
    render(<RealRouteSimulation canWrite />)
    await screen.findByLabelText('Cantidad de Agua')
    fillCosts()
    const simulate = async () => { fireEvent.click(screen.getByRole('button', { name: 'Simular ruta real' })); await screen.findByText(/scenario-id/) }
    await simulate()
    fireEvent.change(screen.getByLabelText('Cantidad de Agua'), { target: { value: '1' } })
    expect(screen.queryByText(/scenario-id/)).not.toBeInTheDocument()
    await simulate()
    fireEvent.change(screen.getByLabelText('Gastos varios ($)'), { target: { value: '2' } })
    expect(screen.queryByText(/scenario-id/)).not.toBeInTheDocument()
    await simulate()
    fireEvent.click(screen.getByLabelText('Incluir excedentes'))
    expect(screen.queryByText(/scenario-id/)).not.toBeInTheDocument()
    await simulate()
    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(screen.queryByText(/scenario-id/)).not.toBeInTheDocument()
  })

  it('does not restore a stale result when inputs change during submission', async () => {
    let resolvePost: (value: unknown) => void = () => {}
    post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))
    render(<RealRouteSimulation canWrite />)
    await screen.findByLabelText('Cantidad de Agua')
    fillCosts()
    fireEvent.click(screen.getByRole('button', { name: 'Simular ruta real' }))
    fireEvent.change(screen.getByLabelText('Gastos varios ($)'), { target: { value: '5' } })
    resolvePost({ data: { id: 'scenario-id', routeId, estimatedRevenue: 24, operatingCost: 1, grossMargin: 23 } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Simular ruta real' })).toBeEnabled())
    expect(screen.queryByText(/scenario-id/)).not.toBeInTheDocument()
  })

  it('invalidates an in-flight calculation before retrying options after a failed lookup', async () => {
    let resolvePost: (value: unknown) => void = () => {}
    post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))
    render(<RealRouteSimulation canWrite />)
    await screen.findByLabelText('Cantidad de Agua')
    fillCosts()
    fireEvent.click(screen.getByRole('button', { name: 'Simular ruta real' }))
    get.mockRejectedValueOnce({ response: { data: { message: 'No disponible' } } })
    fireEvent.change(screen.getByLabelText('ID de escenario real'), { target: { value: 'missing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir escenario real' }))
    expect(await screen.findByText(/No disponible/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    resolvePost({ data: { id: 'stale-scenario', routeId, estimatedRevenue: 24, operatingCost: 1, grossMargin: 23 } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Simular ruta real' })).toBeEnabled())
    expect(screen.queryByText(/stale-scenario/)).not.toBeInTheDocument()
  })

  it('opens the requested stored real scenario and handles denied access without retaining it', async () => {
    const stored = { id: 'stored-id', routeId, routeMetrics: { fuelLiters: 5, durationHours: 1 }, parameters: { fuelPricePerLiter: 10, includeSurplus: true, generalCosts: 2, hourlyRate: 3 }, products: [{ id: productId, name: 'Agua', unitPrice: 12, quantity: 2, stock: 10 }], estimatedRevenue: 24, operatingCost: 55, grossMargin: -31 }
    get.mockImplementation((url: string) => {
      if (url === '/simulation/route-scenarios/stored-id') return Promise.resolve({ data: stored })
      if (url === '/simulation/route-scenarios/denied') return Promise.reject({ response: { data: { message: 'Scenario not found or not visible' } } })
      return Promise.resolve({ data: url.endsWith('/routes') ? { items: [], hasMore: false, nextCursor: null } : { items: [], excludedCount: 0, hasMore: false, nextCursor: null } })
    })
    render(<RealRouteSimulation canWrite={false} />)
    fireEvent.change(screen.getByLabelText('ID de escenario real'), { target: { value: 'stored-id' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir escenario real' }))
    expect(await screen.findByText(/stored-id.*Ruta:/)).toHaveTextContent(routeId)
    expect(screen.getByText(/Ingreso estimado:/)).toHaveTextContent('24')
    expect(screen.getByText(/Agua/)).toHaveTextContent('12')
    fireEvent.change(screen.getByLabelText('ID de escenario real'), { target: { value: 'denied' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir escenario real' }))
    expect(await screen.findByText(/Scenario not found or not visible/)).toBeInTheDocument()
    expect(screen.queryByText(/stored-id.*Ruta:/)).not.toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/simulation/route-scenarios/stored-id')
    expect(get.mock.calls.every(([url]) => !url.includes('/demo'))).toBe(true)
  })
})
