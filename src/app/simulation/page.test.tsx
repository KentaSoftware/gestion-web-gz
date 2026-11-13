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
const routeOptionItems = routes.items.map((route) => ({
  _id: route.id,
  planningDate: '2025-05-26T00:00:00.000Z',
  zoneSnapshot: { name: route.zone },
  metrics: { fuelLiters: route.fuelLiters, distanceMeters: route.distanceKm * 1000, durationSeconds: route.durationHours * 3600 },
  assignments: { driverId: route.driver, vehicleId: route.vehicle },
  orderCount: route.orderCount,
}))
const catalogItems = catalog.available.map((product) => ({ ...product, precioUnitario: product.unitPrice }))
const scenarioSummaryItems = scenarios.items.map((item) => ({ ...item, date: '2025-05-26T00:00:00.000Z' }))
const scenarioHistoryResponse = (page = 1, pageSize = 8) => ({ items: scenarioSummaryItems, page, pageSize, total: scenarios.total })
const routeOptionsResponse = { items: routeOptionItems, hasMore: false, nextCursor: null }
const catalogResponse = { items: catalogItems, excludedCount: 0, hasMore: false, nextCursor: null }
const details = scenarios.items.map((item) => ({
  id: item.id,
  routeId: item.routeId,
  routeSnapshot: { date: '2025-05-26T00:00:00.000Z', zone: item.zone, orderCount: 12, fuelLiters: 18.5, distanceKm: 102.4, durationHours: 6.5, driver: item.driver, vehicle: item.vehicle },
  routeMetrics: { fuelLiters: 18.5, durationHours: 6.5 },
  parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 },
  products: [{ ...catalog.available[0], quantity: 40 }],
  estimatedRevenue: item.estimatedRevenue,
  operatingCost: item.operatingCost,
  grossMargin: item.grossMargin,
}))

function setupGet() {
  get.mockImplementation((url: string) => {
    if (url === '/simulation/routes') return Promise.resolve({ data: routeOptionsResponse })
    if (url === '/simulation/route-catalog') return Promise.resolve({ data: catalogResponse })
    if (url === '/simulation/route-scenarios') return Promise.resolve({ data: scenarioHistoryResponse() })
    const detail = details.find((item) => url === `/simulation/route-scenarios/${item.id}`)
    return detail ? Promise.resolve({ data: detail }) : Promise.reject(new Error('Unexpected endpoint'))
  })
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
    render(<SimulationPage />)
    expect(await screen.findByRole('heading', { name: 'Registros de Escenarios' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Simulación de Escenarios' })).toBeInTheDocument()
    expect(screen.queryByText(/modo de demostración/i)).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Incluir excedentes' })).toBeChecked()
    expect(screen.getByLabelText('El cálculo no aplica excedentes.')).toHaveAttribute('title')
    fireEvent.click(screen.getByRole('switch', { name: 'Incluir excedentes' }))
    expect(screen.getByRole('switch', { name: 'Incluir excedentes' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Seleccionar ruta R-001' })).toBeChecked()
    expect(within(screen.getByRole('table', { name: 'Rutas' })).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Selección', 'ID', 'Zona', 'Pedidos', 'Repartidor', 'Vehículo', 'Combustible (L)', 'Distancia', 'Tiempo', 'Fecha'])
    expect(screen.getByLabelText('Cantidad de Agua')).toHaveValue(0)
    expect(screen.getByRole('table', { name: 'Productos incluidos en el vehículo' })).not.toHaveTextContent('Agua')
  })

  it('transfers valid quantities independently and returns selected included product', async () => {
    render(<SimulationPage />)
    const input = await screen.findByLabelText('Cantidad de Agua')
    const add = screen.getByRole('button', { name: 'Agregar producto al vehículo' })
    expect(add).toBeDisabled()
    fireEvent.change(input, { target: { value: '121' } })
    expect(add).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(/stock disponible/i)
    fireEvent.change(input, { target: { value: '-1' } })
    expect(add).toBeDisabled()
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.click(add)
    expect(input).toHaveValue(0)
    expect(screen.getByRole('table', { name: 'Productos incluidos en el vehículo' })).toHaveTextContent('5')
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/route-scenarios', expect.objectContaining({ products: [{ id: 'agua', quantity: 5 }] })))
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar incluido Agua' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar producto del vehículo' }))
    expect(screen.getByRole('table', { name: 'Productos incluidos en el vehículo' })).not.toHaveTextContent('Agua')
  })

  it('collapses the whole workspace and preserves draft state', async () => {
    render(<SimulationPage />)
    fireEvent.change(await screen.findByLabelText('Cantidad de Agua'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Contraer parámetros' }))
    expect(screen.getByRole('button', { name: 'Expandir parámetros' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Simular' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Registros de Escenarios' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Expandir parámetros' }))
    expect(screen.getByLabelText('Cantidad de Agua')).toHaveValue(5)
  })

  it('submits updated cost parameters and surplus setting', async () => {
    render(<SimulationPage />)
    fireEvent.change(await screen.findByLabelText('Precio combustible ($/L)'), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText('Gastos varios ($)'), { target: { value: '30000' } })
    fireEvent.change(screen.getByLabelText('Costo por hora ($)'), { target: { value: '9000' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Incluir excedentes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/route-scenarios', expect.objectContaining({
      parameters: { fuelPricePerLiter: 1500, includeSurplus: false, generalCosts: 30000, hourlyRate: 9000 },
    })))
  })

  it('retries a failed workspace request', async () => {
    get.mockRejectedValueOnce(new Error('offline'))
    render(<SimulationPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los datos')
    setupGet()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Rutas' })).toBeInTheDocument()
  })

  it('keeps empty route and scenario table headers and disables actions', async () => {
    get.mockImplementation((url: string) => Promise.resolve({ data: url === '/simulation/routes'
      ? { items: [], hasMore: false, nextCursor: null }
      : url === '/simulation/route-catalog'
        ? catalogResponse
        : { items: [], page: 1, pageSize: 8, total: 0 } }))
    render(<SimulationPage />)
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
    get.mockImplementation((url: string) => url.endsWith('/ESC-014')
      ? pending
      : url === '/simulation/routes'
        ? Promise.resolve({ data: routeOptionsResponse })
        : url === '/simulation/route-catalog'
          ? Promise.resolve({ data: catalogResponse })
          : Promise.resolve({ data: scenarioHistoryResponse() }))
    render(<SimulationPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalle ESC-014' }))
    const dialog = screen.getByRole('dialog', { name: 'Detalle del Escenario' })
    expect(within(dialog).getByRole('status')).toHaveTextContent('Cargando')
    resolveDetail({ data: details[0] })
    expect(await within(dialog).findByText('Juan Pérez')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Productos incluidos en venta ambulatoria' })).toBeInTheDocument()
    expect(within(dialog).getByText(/no se modifican ventas, stock ni rutas/i)).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('limits selection to two and compares retrieved values including ties', async () => {
    render(<SimulationPage />)
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
    get.mockImplementation((url: string) => url.startsWith('/simulation/route-scenarios/')
      ? Promise.reject(new Error('unavailable'))
      : url === '/simulation/routes'
        ? Promise.resolve({ data: routeOptionsResponse })
        : url === '/simulation/route-catalog'
          ? Promise.resolve({ data: catalogResponse })
          : Promise.resolve({ data: scenarioHistoryResponse() }))
    render(<SimulationPage />)
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
    const sixRoutes = Array.from({ length: 6 }, (_, index) => ({
      ...routeOptionItems[0],
      _id: `R-00${index + 1}`,
    }))
    get.mockImplementation((url: string, config?: { params: { cursor?: string, page?: number } }) => {
      const page = config?.params.page ?? 1
      if (url === '/simulation/routes') {
        const cursor = config?.params.cursor
        return Promise.resolve({ data: cursor === undefined
          ? { items: sixRoutes.slice(0, 5), hasMore: true, nextCursor: sixRoutes[4]._id }
          : { items: sixRoutes.slice(5), hasMore: false, nextCursor: null } })
      }
      if (url === '/simulation/route-catalog') return Promise.resolve({ data: catalogResponse })
      if (url === '/simulation/route-scenarios') return Promise.resolve({ data: { ...scenarioHistoryResponse(page, 1), items: [scenarioSummaryItems[page - 1]] } })
      const detail = details.find((item) => url === `/simulation/route-scenarios/${item.id}`)
      if (detail) return Promise.resolve({ data: detail })
      return Promise.reject(new Error('Unexpected endpoint'))
    })
    render(<SimulationPage />)
    fireEvent.change(await screen.findByLabelText('Cantidad de Agua'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar escenario ESC-014' }))
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de rutas' }))
    expect(await screen.findByRole('radio', { name: 'Seleccionar ruta R-006' })).not.toBeChecked()
    expect(screen.getByLabelText('Cantidad de Agua')).toHaveValue(5)
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/route-scenarios', expect.objectContaining({ routeId: 'R-001' })))
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
    get.mockImplementation((url: string) => url.endsWith('/ESC-014')
      ? pending
      : url === '/simulation/routes'
        ? Promise.resolve({ data: routeOptionsResponse })
        : url === '/simulation/route-catalog'
          ? Promise.resolve({ data: catalogResponse })
          : Promise.resolve({ data: scenarioHistoryResponse() }))
    render(<SimulationPage />)
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
    get.mockImplementation((url: string) => url.startsWith('/simulation/route-scenarios/')
      ? Promise.reject(new Error('unavailable'))
      : url === '/simulation/routes'
        ? Promise.resolve({ data: routeOptionsResponse })
        : url === '/simulation/route-catalog'
          ? Promise.resolve({ data: catalogResponse })
          : Promise.resolve({ data: scenarioHistoryResponse() }))
    render(<SimulationPage />)
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
    render(<SimulationPage />)
    await waitFor(() => expect(get).toHaveBeenCalledWith('/simulation/routes'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('enforces read and write permissions and uses only operational endpoints', async () => {
    permissions.splice(0, permissions.length, 'simulation:read')
    const view = render(<SimulationPage />)
    expect(await screen.findByRole('button', { name: 'Simular' })).toBeDisabled()
    expect(post).not.toHaveBeenCalled()
    expect(get.mock.calls.every(([url]) => String(url).startsWith('/simulation/'))).toBe(true)
    view.unmount()
    get.mockClear()
    permissions.splice(0, permissions.length)
    render(<SimulationPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('simulation:read')
    expect(get).not.toHaveBeenCalled()
  })

  it('uses saved route, catalog, and scenario APIs in the existing workspace', async () => {
    const routeId = '000000000000000000000001'
    const productId = '000000000000000000000101'
    const scenarioIds = ['000000000000000000000201', '000000000000000000000202']
    const routeItems = Array.from({ length: 6 }, (_, index) => ({
      _id: `00000000000000000000000${index + 1}`,
      planningDate: '2026-06-01T00:00:00.000Z',
      zoneSnapshot: { code: 'Z1', name: 'Zona operativa' },
      metrics: { distanceMeters: 12000, durationSeconds: 3600, fuelLiters: 4.25, stopCount: 1 },
      assignments: { driverId: 'driver-1', vehicleId: 'vehicle-1' },
      orderCount: 2,
      driver: 'Repartidor operativo',
      vehicle: 'Unidad 1',
    }))
    const productItems = [
      { id: productId, name: 'Producto operativo', stock: 25, precioUnitario: 1000 },
      { id: '000000000000000000000102', name: 'Producto sin seleccionar', stock: 10, precioUnitario: 500 },
    ]
    const summaryItems = scenarioIds.map((id, index) => ({
      id,
      routeId,
      date: '2026-06-01T00:00:00.000Z',
      zone: 'Zona operativa',
      driver: 'Repartidor operativo',
      vehicle: 'Unidad 1',
      orderCount: 2,
      distanceKm: 12,
      fuelLiters: 4.25,
      durationHours: 1,
      estimatedRevenue: 10000 + index,
      operatingCost: 7000,
      grossMargin: 3000 + index,
    }))
    const scenarioDetails = summaryItems.map((summary) => ({
      id: summary.id,
      routeId: summary.routeId,
      routeSnapshot: {
        date: summary.date,
        zone: summary.zone,
        orderCount: summary.orderCount,
        distanceKm: summary.distanceKm,
        fuelLiters: summary.fuelLiters,
        durationHours: summary.durationHours,
        driverId: 'driver-1',
        driver: summary.driver,
        vehicleId: 'vehicle-1',
        vehicle: summary.vehicle,
      },
      routeMetrics: { fuelLiters: 4.25, durationHours: 1 },
      parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 },
      products: [{ id: productId, name: 'Producto operativo', unitPrice: 1000, quantity: 3, stock: 25 }],
      estimatedRevenue: summary.estimatedRevenue,
      operatingCost: summary.operatingCost,
      grossMargin: summary.grossMargin,
    }))

    get.mockImplementation((url: string, config?: { params?: { cursor?: string, page?: number } }) => {
      if (url === '/simulation/routes') {
        const cursor = config?.params?.cursor
        return Promise.resolve({ data: cursor == null
          ? { items: routeItems.slice(0, 5), hasMore: true, nextCursor: routeItems[4]._id }
          : { items: routeItems.slice(5), hasMore: false, nextCursor: null } })
      }
      if (url === '/simulation/route-catalog') {
        const cursor = config?.params?.cursor
        return Promise.resolve({ data: cursor == null
          ? { items: productItems.slice(0, 1), excludedCount: 0, hasMore: true, nextCursor: productId }
          : { items: productItems.slice(1), excludedCount: 0, hasMore: false, nextCursor: null } })
      }
      if (url === '/simulation/route-scenarios') return Promise.resolve({ data: { items: summaryItems, page: config?.params?.page ?? 1, pageSize: 8, total: 2 } })
      const detail = scenarioDetails.find((item) => url === `/simulation/route-scenarios/${item.id}`)
      return detail ? Promise.resolve({ data: detail }) : Promise.reject(new Error(`Unexpected endpoint: ${url}`))
    })
    post.mockResolvedValue({ data: { ...scenarioDetails[0], id: scenarioIds[0] } })

    render(<SimulationPage />)

    const routeTable = await screen.findByRole('table', { name: 'Rutas' })
    expect(within(routeTable).getByText(routeId)).toBeInTheDocument()
    expect(within(routeTable).getAllByText('Repartidor operativo')).toHaveLength(5)
    expect(within(routeTable).getAllByText('Unidad 1')).toHaveLength(5)
    expect(screen.getByText('Mostrando 1 a 5 de 6 rutas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 2 de rutas' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Productos disponibles' })).toHaveTextContent('Producto operativo')
    expect(screen.getByRole('table', { name: 'Productos disponibles' })).toHaveTextContent('Producto sin seleccionar')
    expect(screen.getByRole('table', { name: 'Registros de Escenarios' })).toHaveTextContent(scenarioIds[0])
    expect(get.mock.calls.every(([url]) => !String(url).startsWith('/simulation/demo/'))).toBe(true)
    expect(screen.queryByRole('button', { name: /rutas reales|datos de muestra/i })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Cantidad de Producto operativo'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto al vehículo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/simulation/route-scenarios', {
      routeId,
      parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 },
      products: [{ id: productId, quantity: 3 }],
    }))

    fireEvent.click(screen.getByRole('button', { name: `Ver detalle ${scenarioIds[0]}` }))
    const detailDialog = screen.getByRole('dialog', { name: 'Detalle del Escenario' })
    expect(await within(detailDialog).findByText('Repartidor operativo')).toBeInTheDocument()
    expect(within(detailDialog).getByText('Unidad 1')).toBeInTheDocument()
    expect(within(detailDialog).getByText('Producto operativo')).toBeInTheDocument()
    expect(within(detailDialog).queryByText('Datos de muestra.')).not.toBeInTheDocument()
    fireEvent.click(within(detailDialog).getByRole('button', { name: 'Cerrar' }))

    fireEvent.click(screen.getByRole('checkbox', { name: `Seleccionar escenario ${scenarioIds[0]}` }))
    fireEvent.click(screen.getByRole('checkbox', { name: `Seleccionar escenario ${scenarioIds[1]}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Comparar Escenarios' }))
    expect(await screen.findByRole('dialog', { name: 'Comparar Escenarios' })).toHaveTextContent('Repartidor operativo')
  })

  it('keeps incomplete saved-route metrics visible and prevents an unsupported simulation', async () => {
    get.mockImplementation((url: string) => Promise.resolve({ data: url === '/simulation/routes'
      ? { items: [{ ...routeOptionItems[0], metrics: { ...routeOptionItems[0].metrics, fuelLiters: null } }], hasMore: false, nextCursor: null }
      : url === '/simulation/route-catalog'
        ? catalogResponse
        : { items: [], page: 1, pageSize: 8, total: 0 } }))
    render(<SimulationPage />)

    const table = await screen.findByRole('table', { name: 'Rutas' })
    expect(table).toHaveTextContent('— L')
    expect(screen.getByRole('radio', { name: 'Seleccionar ruta R-001' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Simular' })).toBeDisabled()
  })
})

describe('Simulation HTTP adapter', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('loads all operational route cursor pages and the real catalog and scenario history contracts', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const routeResult = { ...routeOptionsResponse, items: routeOptionItems.slice(0, 1), hasMore: true, nextCursor: routeOptionItems[0]._id }
    const finalRoutePage = { items: routeOptionItems.slice(1), hasMore: false, nextCursor: null }
    get
      .mockResolvedValueOnce({ data: routeResult })
      .mockResolvedValueOnce({ data: finalRoutePage })
      .mockResolvedValueOnce({ data: catalogResponse })
      .mockResolvedValueOnce({ data: scenarioHistoryResponse(2) })

    const routePage = await service.getRoutes(1)
    expect(routePage).toMatchObject({ page: 1, pageSize: 5, total: 2 })
    expect(routePage.items[0]).toMatchObject({ id: 'R-001', zone: 'Norte', orderCount: 12, fuelLiters: 18.5, distanceKm: 102.4, durationHours: 6.5 })
    await expect(service.getCatalog()).resolves.toEqual({ available: catalog.available, included: [], excludedCount: 0 })
    const scenarioPage = await service.getScenarios(2)
    expect(scenarioPage).toMatchObject({ page: 2, pageSize: 8, total: 3 })
    expect(scenarioPage.items[0]).toMatchObject({ id: 'ESC-014', routeId: 'R-001', driver: 'Juan Pérez' })

    expect(get).toHaveBeenNthCalledWith(1, '/simulation/routes')
    expect(get).toHaveBeenNthCalledWith(2, '/simulation/routes', { params: { cursor: routeOptionItems[0]._id } })
    expect(get).toHaveBeenNthCalledWith(3, '/simulation/route-catalog')
    expect(get).toHaveBeenNthCalledWith(4, '/simulation/route-scenarios', { params: { page: 2 } })
  })

  it('fails visibly instead of returning a silently truncated cursor collection', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const repeatedPage = { items: [routeOptionItems[0]], hasMore: true, nextCursor: routeOptionItems[0]._id }
    get.mockResolvedValueOnce({ data: repeatedPage }).mockResolvedValueOnce({ data: repeatedPage })

    await expect(service.getRoutes(1)).rejects.toThrow(/no se muestran resultados parciales/i)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('loads scenario detail with frozen route snapshot metadata by saved scenario ID', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    get.mockResolvedValueOnce({ data: details[0] })

    await expect(service.getScenarioDetail('ESC/014')).resolves.toMatchObject({ id: 'ESC-014', routeId: 'R-001', date: '26/5/2025', zone: 'Norte', driver: 'Juan Pérez', vehicle: 'Móvil 1', orderCount: 12, products: [{ id: 'agua', quantity: 40 }] })
    expect(get).toHaveBeenCalledWith('/simulation/route-scenarios/ESC%2F014')
  })

  it('posts only the selected route, supported parameters, and product quantities, then propagates failures', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const input = {
      route: routes.items[1],
      parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 },
      products: [{ ...catalog.available[0], quantity: 10 }, { ...catalog.available[0], id: 'not-selected', quantity: 0 }],
    }
    post.mockResolvedValueOnce({ data: details[1] })

    await expect(service.simulate(input)).resolves.toMatchObject({ id: 'ESC-015', routeId: 'R-002', estimatedRevenue: 600000 })
    expect(post).toHaveBeenCalledWith('/simulation/route-scenarios', {
      routeId: 'R-002',
      parameters: input.parameters,
      products: [{ id: 'agua', quantity: 10 }],
    })

    const failure = new Error('API unavailable')
    post.mockRejectedValueOnce(failure)
    await expect(service.simulate(input)).rejects.toBe(failure)
  })
})
