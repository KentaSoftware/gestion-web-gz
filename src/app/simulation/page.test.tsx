import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SimulationPage from './page'

const { get, post, permissions, session } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), permissions: ['simulation:read', 'simulation:write'] as string[], session: { isAdmin: false } }))
vi.mock('@/utils/client', () => ({ default: { get, post } }))
vi.mock('@/hooks/useSessionAccess', () => ({ useSessionAccess: () => ({ status: 'ready', permissions, isAdmin: session.isAdmin }) }))
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))

const routes = { items: [
  { id: 'R-001', zone: 'Norte', orderCount: 12, driver: 'Juan Pérez', vehicle: 'Móvil 1', fuelLiters: 18.5, distanceKm: 102.4, durationHours: 6.5, date: '26/05/2025' },
  { id: 'R-002', zone: 'Centro', orderCount: 10, driver: 'María López', vehicle: 'Móvil 2', fuelLiters: 15.2, distanceKm: 85.6, durationHours: 5.1, date: '26/05/2025' },
], page: 1, pageSize: 5, total: 2 }
const catalog = { available: [{ id: 'agua', name: 'Agua', stock: 120, unitPrice: 1200 }], included: [{ id: 'agua', name: 'Agua', stock: 120, unitPrice: 1200, quantity: 40 }] }
const scenarios = { items: [
  { id: 'ESC-014', date: '26/05/2025', routeId: 'R-001', zone: 'Norte', driver: 'Juan Pérez', vehicle: 'Móvil 1', estimatedRevenue: 485000, operatingCost: 125000, grossMargin: 360000 },
  { id: 'ESC-015', date: '27/05/2025', routeId: 'R-002', zone: 'Centro', driver: 'María López', vehicle: 'Móvil 2', estimatedRevenue: 600000, operatingCost: 125000, grossMargin: 475000 },
  { id: 'ESC-016', date: '28/05/2025', routeId: 'R-001', zone: 'Norte', driver: 'Juan Pérez', vehicle: 'Móvil 1', estimatedRevenue: 100, operatingCost: 30, grossMargin: 70 },
], page: 1, pageSize: 8, total: 3 }
const details = scenarios.items.map((item) => ({ ...item, orderCount: 12, fuelLiters: 18.5, distanceKm: 102.4, durationHours: 6.5, parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 }, products: catalog.included }))

function setupGet() {
  get.mockImplementation((url: string) => {
    if (url === '/simulation/demo/routes') return Promise.resolve({ data: routes })
    if (url === '/simulation/demo/catalog') return Promise.resolve({ data: catalog })
    if (url === '/simulation/demo/scenarios') return Promise.resolve({ data: scenarios })
    const detail = details.find((item) => url === `/simulation/demo/scenarios/${item.id}`)
    return detail ? Promise.resolve({ data: detail }) : Promise.reject(new Error('Unexpected endpoint'))
  })
}

function renderDemo() {
  const view = render(<SimulationPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Datos de muestra' }))
  return view
}

describe('Simulation workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.splice(0, permissions.length, 'simulation:read', 'simulation:write')
    session.isAdmin = false
    setupGet()
    post.mockResolvedValue({ data: scenarios.items[0] })
  })

  it('renders reference headings, switch, route columns and zero transfer draft', async () => {
    renderDemo()
    expect(await screen.findByRole('heading', { name: 'Registros de Escenarios' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Simulación de Escenarios' })).toBeInTheDocument()
    expect(screen.queryByText(/modo de demostración/i)).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Incluir excedentes' })).toBeChecked()
    expect(screen.getByLabelText('El cálculo de muestra no aplica excedentes.')).toHaveAttribute('title')
    fireEvent.click(screen.getByRole('switch', { name: 'Incluir excedentes' }))
    expect(screen.getByRole('switch', { name: 'Incluir excedentes' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Seleccionar ruta R-001' })).toBeChecked()
    expect(within(screen.getByRole('table', { name: 'Rutas' })).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Selección', 'ID', 'Zona', 'Pedidos', 'Repartidor', 'Vehículo', 'Combustible (L)', 'Distancia', 'Tiempo', 'Fecha'])
    expect(screen.getByLabelText('Cantidad de Agua')).toHaveValue(0)
    expect(screen.getByRole('table', { name: 'Productos incluidos en el vehículo' })).toHaveTextContent('40')
  })

  it('transfers valid quantities independently and returns selected included product', async () => {
    renderDemo()
    const input = await screen.findByLabelText('Cantidad de Agua')
    const add = screen.getByRole('button', { name: 'Agregar producto al vehículo' })
    expect(add).toBeDisabled()
    fireEvent.change(input, { target: { value: '81' } })
    expect(add).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(/stock disponible/i)
    fireEvent.change(input, { target: { value: '-1' } })
    expect(add).toBeDisabled()
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.click(add)
    expect(input).toHaveValue(0)
    expect(screen.getByRole('table', { name: 'Productos incluidos en el vehículo' })).toHaveTextContent('45')
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/demo/scenarios', expect.objectContaining({ products: [{ id: 'agua', quantity: 45 }] })))
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar incluido Agua' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar producto del vehículo' }))
    expect(screen.getByRole('table', { name: 'Productos incluidos en el vehículo' })).not.toHaveTextContent('Agua')
  })

  it('collapses the whole workspace and preserves draft state', async () => {
    renderDemo()
    fireEvent.change(await screen.findByLabelText('Cantidad de Agua'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Contraer parámetros' }))
    expect(screen.getByRole('button', { name: 'Expandir parámetros' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Simular' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Registros de Escenarios' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Expandir parámetros' }))
    expect(screen.getByLabelText('Cantidad de Agua')).toHaveValue(5)
  })

  it('submits updated cost parameters and surplus setting', async () => {
    renderDemo()
    fireEvent.change(await screen.findByLabelText('Precio combustible ($/L)'), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText('Gastos varios ($)'), { target: { value: '30000' } })
    fireEvent.change(screen.getByLabelText('Costo por hora ($)'), { target: { value: '9000' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Incluir excedentes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/demo/scenarios', expect.objectContaining({
      parameters: { fuelPricePerLiter: 1500, includeSurplus: false, generalCosts: 30000, hourlyRate: 9000 },
    })))
  })

  it('retries a failed workspace request', async () => {
    get.mockImplementation((url: string) => url === '/simulation/demo/routes' ? Promise.reject(new Error('offline')) : Promise.resolve({ data: url.endsWith('/catalog') ? catalog : scenarios }))
    renderDemo()
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los datos')
    setupGet()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Rutas' })).toBeInTheDocument()
  })

  it('keeps empty route and scenario table headers and disables actions', async () => {
    get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith('/routes') ? { ...routes, items: [], total: 0 } : url.endsWith('/catalog') ? catalog : { ...scenarios, items: [], total: 0 } }))
    renderDemo()
    expect(await screen.findByText('No hay rutas disponibles')).toBeInTheDocument()
    expect(screen.getByText('No hay escenarios registrados')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Rutas' })).toHaveTextContent('Repartidor')
    expect(screen.getByRole('table', { name: 'Registros de Escenarios' })).toHaveTextContent('Margen Bruto')
    expect(screen.getByRole('button', { name: 'Simular' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Comparar Escenarios' })).toBeDisabled()
    expect(screen.getByText('Mostrando 0 de 0 registros')).toBeInTheDocument()
  })

  it('opens detail with loading state, sourced data, and closes on Escape', async () => {
    let resolveDetail: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => { resolveDetail = resolve })
    get.mockImplementation((url: string) => url.endsWith('/ESC-014') ? pending : url.endsWith('/routes') ? Promise.resolve({ data: routes }) : url.endsWith('/catalog') ? Promise.resolve({ data: catalog }) : Promise.resolve({ data: scenarios }))
    renderDemo()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle ESC-014' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del Escenario' })
    expect(within(dialog).getByRole('status')).toHaveTextContent('Cargando')
    resolveDetail({ data: details[0] })
    expect(await within(dialog).findByText('Juan Pérez')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Productos incluidos en venta ambulatoria' })).toBeInTheDocument()
    expect(within(dialog).getByText(/no ejecutan acciones reales automáticamente/i)).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('limits selection to two and compares retrieved values including ties', async () => {
    renderDemo()
    const compare = await screen.findByRole('button', { name: 'Comparar Escenarios' })
    expect(compare).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-014' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-015' }))
    expect(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-016' })).toBeDisabled()
    fireEvent.click(compare)
    const dialog = screen.getByRole('dialog', { name: 'Comparar Escenarios' })
    expect(await within(dialog).findByText('Empate')).toBeInTheDocument()
    const scenarioPanel = within(dialog).getByText('María López').closest('section')
    expect(scenarioPanel?.querySelectorAll('dt')).toHaveLength(8)
    expect(within(scenarioPanel as HTMLElement).getByText('Vehículo')).toBeInTheDocument()
    expect(within(dialog).getByText(/ESC-015:.*600\.000/)).toBeInTheDocument()
    const incomeSummary = within(dialog).getByText('Mayor ingreso').parentElement
    expect(incomeSummary).toHaveTextContent('ESC-015')
    const marginSummary = within(dialog).getByText('Mayor margen bruto').parentElement
    expect(marginSummary).toHaveTextContent('ESC-015')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-015' }))
    expect(compare).toBeDisabled()
  })

  it('shows comparison errors and retries detail requests', async () => {
    get.mockImplementation((url: string) => url.endsWith('/routes') ? Promise.resolve({ data: routes }) : url.endsWith('/catalog') ? Promise.resolve({ data: catalog }) : url.endsWith('/scenarios') ? Promise.resolve({ data: scenarios }) : Promise.reject(new Error('unavailable')))
    renderDemo()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar escenario ESC-014' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-015' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comparar Escenarios' }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    setupGet()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
    expect(await within(dialog).findByText('Empate')).toBeInTheDocument()
  })

  it('preserves route, draft and scenario selection across pagination', async () => {
    get.mockImplementation((url: string, config?: { params: { page: number } }) => {
      const page = config?.params.page ?? 1
      if (url.endsWith('/routes')) return Promise.resolve({ data: { ...routes, items: [routes.items[page - 1]], page, pageSize: 1, total: 2 } })
      if (url.endsWith('/catalog')) return Promise.resolve({ data: catalog })
      if (url.endsWith('/scenarios')) return Promise.resolve({ data: { ...scenarios, items: [scenarios.items[page - 1]], page, pageSize: 1, total: 3 } })
      return Promise.reject(new Error('Unexpected endpoint'))
    })
    renderDemo()
    fireEvent.change(await screen.findByLabelText('Cantidad de Agua'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-014' }))
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de rutas' }))
    expect(await screen.findByRole('radio', { name: 'Seleccionar ruta R-002' })).not.toBeChecked()
    expect(screen.getByLabelText('Cantidad de Agua')).toHaveValue(5)
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/demo/scenarios', expect.objectContaining({ routeId: 'R-001' })))
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de registros' }))
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar escenario ESC-015' }))
    expect(screen.getByRole('button', { name: 'Comparar Escenarios' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior de rutas' }))
    expect(await screen.findByRole('radio', { name: 'Seleccionar ruta R-001' })).toBeChecked()
    expect(screen.getByLabelText('Cantidad de Agua')).toHaveValue(5)
  })

  it('discards a detail response after the dialog closes', async () => {
    let resolveDetail: (value: unknown) => void = () => {}
    const pending = new Promise((resolve) => { resolveDetail = resolve })
    get.mockImplementation((url: string) => url.endsWith('/ESC-014') ? pending : url.endsWith('/routes') ? Promise.resolve({ data: routes }) : url.endsWith('/catalog') ? Promise.resolve({ data: catalog }) : Promise.resolve({ data: scenarios }))
    renderDemo()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle ESC-014' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }))
    resolveDetail({ data: details[0] })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    setupGet()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle ESC-015' }))
    expect(await within(screen.getByRole('dialog')).findByText('María López')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).queryByText('Juan Pérez')).not.toBeInTheDocument()
  })

  it('shows detail errors within the dialog and retries', async () => {
    get.mockImplementation((url: string) => url.endsWith('/routes') ? Promise.resolve({ data: routes }) : url.endsWith('/catalog') ? Promise.resolve({ data: catalog }) : url.endsWith('/scenarios') ? Promise.resolve({ data: scenarios }) : Promise.reject(new Error('unavailable')))
    renderDemo()
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle ESC-014' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del Escenario' })
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    setupGet()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
    expect(await within(dialog).findByText('Juan Pérez')).toBeInTheDocument()
  })

  it('loads simulation for a verified administrator without permissions', async () => {
    permissions.splice(0, permissions.length)
    session.isAdmin = true
    renderDemo()
    await waitFor(() => expect(get).toHaveBeenCalledWith('/simulation/demo/routes', expect.anything()))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('allows a verified administrator to access real routes without explicit grants', async () => {
    permissions.splice(0, permissions.length)
    session.isAdmin = true
    get.mockImplementation((url: string) => Promise.resolve({ data: url === '/simulation/routes'
      ? { items: [], hasMore: false, nextCursor: null }
      : { items: [], excludedCount: 0, hasMore: false, nextCursor: null } }))
    render(<SimulationPage />)
    expect(await screen.findByText('No hay rutas disponibles.')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/simulation/routes', expect.anything())
    expect(get.mock.calls.every(([url]) => !String(url).includes('/demo/'))).toBe(true)
  })

  it('uses exclusively demo endpoints for demo loading, details, comparison, and simulation', async () => {
    render(<SimulationPage />)
    await waitFor(() => expect(get).toHaveBeenCalledWith('/simulation/routes', expect.anything()))
    expect(get).toHaveBeenCalledWith('/simulation/route-catalog', expect.anything())
    expect([...get.mock.calls, ...post.mock.calls].every(([url]) => !String(url).startsWith('/simulation/demo/'))).toBe(true)
    get.mockClear()
    post.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Datos de muestra' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle ESC-014' }))
    const detail = screen.getByRole('dialog')
    await within(detail).findByText('Juan Pérez')
    fireEvent.click(within(detail).getByRole('button', { name: 'Cerrar' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-014' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-015' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comparar Escenarios' }))
    await within(screen.getByRole('dialog')).findByText('Empate')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/demo/scenarios', expect.anything()))
    expect(get).toHaveBeenCalledWith('/simulation/demo/routes', expect.anything())
    expect(get).toHaveBeenCalledWith('/simulation/demo/catalog')
    expect(get).toHaveBeenCalledWith('/simulation/demo/scenarios', expect.anything())
    expect(get).toHaveBeenCalledWith('/simulation/demo/scenarios/ESC-014')
    expect(get).toHaveBeenCalledWith('/simulation/demo/scenarios/ESC-015')
    expect([...get.mock.calls, ...post.mock.calls].every(([url]) => String(url).startsWith('/simulation/demo/'))).toBe(true)
  })

  it('enforces read and write permissions', async () => {
    permissions.splice(0, permissions.length, 'simulation:read')
    const view = renderDemo()
    expect(await screen.findByRole('button', { name: 'Simular' })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
    view.unmount()
    get.mockClear()
    permissions.splice(0, permissions.length)
    render(<SimulationPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('simulation:read')
    expect(get).not.toHaveBeenCalled()
  })
})

describe('Simulation HTTP adapter', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('loads routes, products, and scenarios from the demo API endpoints', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const routeResult = routes
    const catalogResult = catalog
    const scenarioResult = scenarios
    get
      .mockResolvedValueOnce({ data: routeResult })
      .mockResolvedValueOnce({ data: catalogResult })
      .mockResolvedValueOnce({ data: scenarioResult })

    await expect(service.getRoutes(1)).resolves.toEqual(routeResult)
    await expect(service.getCatalog()).resolves.toEqual(catalogResult)
    await expect(service.getScenarios(2)).resolves.toEqual(scenarioResult)

    expect(get).toHaveBeenNthCalledWith(1, '/simulation/demo/routes', { params: { page: 1 } })
    expect(get).toHaveBeenNthCalledWith(2, '/simulation/demo/catalog')
    expect(get).toHaveBeenNthCalledWith(3, '/simulation/demo/scenarios', { params: { page: 2 } })
  })

  it('loads scenario detail from its dedicated demo API endpoint', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const detail = { ...scenarios.items[0], orderCount: 12, fuelLiters: 18.5, distanceKm: 102.4, durationHours: 6.5, parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 }, products: catalog.included }
    get.mockResolvedValueOnce({ data: detail })

    await expect(service.getScenarioDetail('ESC/014')).resolves.toEqual(detail)
    expect(get).toHaveBeenCalledWith('/simulation/demo/scenarios/ESC%2F014')
  })

  it('posts only the selected route, supported parameters, and product quantities, then propagates failures', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const input = {
      route: routes.items[1],
      parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 },
      products: [{ ...catalog.available[0], quantity: 10 }],
    }
    const result = scenarios.items[1]
    post.mockResolvedValueOnce({ data: result })

    await expect(service.simulate(input)).resolves.toEqual(result)
    expect(post).toHaveBeenCalledWith('/simulation/demo/scenarios', {
      routeId: 'R-002',
      parameters: input.parameters,
      products: [{ id: 'agua', quantity: 10 }],
    })

    const failure = new Error('API unavailable')
    post.mockRejectedValueOnce(failure)
    await expect(service.simulate(input)).rejects.toBe(failure)
  })
})
