import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  SimulationCatalog,
  SimulationPage,
  SimulationProduct,
  SimulationRoute,
  SimulationScenario,
} from '@/services/simulation.service'

const { getRoutes, getCatalog, getScenarios, getScenarioDetail, simulate } = vi.hoisted(() => ({
  getRoutes: vi.fn(),
  getCatalog: vi.fn(),
  getScenarios: vi.fn(),
  getScenarioDetail: vi.fn(),
  simulate: vi.fn(),
}))

const { apiGet, apiPost } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }))

vi.mock('@/services/simulation.service', () => ({
  SIMULATION_PAGE_SIZE: { routes: 5, scenarios: 8 },
  simulationService: { getRoutes, getCatalog, getScenarios, getScenarioDetail, simulate },
}))

vi.mock('@/utils/client', () => ({ default: { get: apiGet, post: apiPost } }))

import SimulationScreen from './page'

const route = (id: string, zone: string, orderCount: number, driver: string): SimulationRoute => ({
  id,
  zone,
  orderCount,
  driver,
  vehicle: 'Móvil 1',
  fuelLiters: 18.5,
  distanceKm: 102.4,
  durationHours: 6.5,
  date: '26/05/2025',
})

const scenario = (id: string, routeId: string, margin: number): SimulationScenario => ({
  id,
  date: '26/05/2025',
  routeId,
  zone: 'Norte',
  driver: 'Juan Pérez',
  vehicle: 'Móvil 1',
  estimatedRevenue: id === 'ESC-013' ? 620_000 : 485_000,
  operatingCost: id === 'ESC-013' ? 168_000 : 125_000,
  grossMargin: margin,
})

const product = (id: string, name: string, stock: number, unitPrice: number): SimulationProduct => ({
  id,
  name,
  stock,
  unitPrice,
})

const catalog = (): SimulationCatalog => ({
  available: [
    product('p-1', 'Agua 500 ml', 120, 1_200),
    product('p-2', 'Gaseosa 1.5 L', 90, 2_500),
    product('p-3', 'Jugo 1 L', 75, 1_800),
    product('p-4', 'Snacks', 60, 1_000),
    product('p-5', 'Panificados', 40, 1_500),
  ],
  included: [
    { ...product('p-1', 'Agua 500 ml', 120, 1_200), quantity: 40 },
    { ...product('p-2', 'Gaseosa 1.5 L', 90, 2_500), quantity: 30 },
    { ...product('p-3', 'Jugo 1 L', 75, 1_800), quantity: 20 },
    { ...product('p-4', 'Snacks', 60, 1_000), quantity: 25 },
    { ...product('p-5', 'Panificados', 40, 1_500), quantity: 15 },
  ],
})

const routesPage = (page: number): SimulationPage<SimulationRoute> => {
  const all = [
    route('R-001', 'Norte', 12, 'Juan Pérez'),
    route('R-002', 'Centro', 10, 'María López'),
    route('R-003', 'Sur', 8, 'Carlos Ruiz'),
    route('R-004', 'Este', 15, 'Ana Torres'),
    route('R-005', 'Oeste', 9, 'Luis Gómez'),
    route('R-006', 'Norte', 11, 'Juan Pérez'),
    route('R-007', 'Centro', 7, 'María López'),
    route('R-008', 'Sur', 6, 'Carlos Ruiz'),
  ]
  return { items: page === 1 ? all.slice(0, 5) : all.slice(5), page, pageSize: 5, total: all.length }
}

const scenariosPage = (page: number): SimulationPage<SimulationScenario> => {
  const all = Array.from({ length: 14 }, (_, index) =>
    scenario(
      `ESC-${String(14 - index).padStart(3, '0')}`,
      `R-00${(index % 5) + 1}`,
      360_000 - index * 1_000,
    ),
  )
  return {
    items: page === 1 ? all.slice(0, 8) : all.slice(8, 14),
    page,
    pageSize: 8,
    total: all.length,
  }
}

beforeEach(() => {
  getRoutes.mockReset()
  getCatalog.mockReset()
  getScenarios.mockReset()
  getScenarioDetail.mockReset()
  simulate.mockReset()
  getRoutes.mockImplementation((page: number) => Promise.resolve(routesPage(page)))
  getCatalog.mockResolvedValue(catalog())
  getScenarios.mockImplementation((page: number) => Promise.resolve(scenariosPage(page)))
  getScenarioDetail.mockImplementation((id: string) => Promise.resolve({
    ...scenario(id, id === 'ESC-014' ? 'R-001' : 'R-002', 360_000),
    orderCount: 12,
    fuelLiters: 18.5,
    distanceKm: 102.4,
    durationHours: 6.5,
    parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 },
    products: catalog().included,
  }))
  simulate.mockResolvedValue(scenario('ESC-015', 'R-002', 341_000))
})

describe('Simulation page', () => {
  it('starts with the reference route and comparison scenarios selected', async () => {
    render(<SimulationScreen />)

    const routeTable = await screen.findByRole('table', { name: 'Rutas a simular' })
    expect(within(routeTable).getByRole('radio', { name: 'Seleccionar ruta R-001' })).toBeChecked()

    await screen.findByText('ESC-014')
    expect(screen.getByRole('checkbox', { name: 'Seleccionar ESC-014 para comparar' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Seleccionar ESC-012 para comparar' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Comparar Escenarios' })).toBeEnabled()
  })

  it('renders the route table and paginates the route catalog', async () => {
    render(<SimulationScreen />)

    const routeTable = await screen.findByRole('table', { name: 'Rutas a simular' })
    expect(await within(routeTable).findByText('R-001')).toBeInTheDocument()
    expect(getRoutes).toHaveBeenCalledWith(1)
    expect(screen.getByText('Mostrando 1 a 5 de 8 rutas')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de rutas' }))

    await waitFor(() => expect(getRoutes).toHaveBeenCalledWith(2))
    expect(await screen.findByText('R-006')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 6 a 8 de 8 rutas')).toBeInTheDocument()
  })

  it('selects a single route and runs a simulation with the current parameters', async () => {
    render(<SimulationScreen />)

    const routeTable = await screen.findByRole('table', { name: 'Rutas a simular' })
    await within(routeTable).findByText('R-001')
    const simulateButton = screen.getByRole('button', { name: 'Simular' })
    expect(simulateButton).toBeEnabled()

    fireEvent.click(screen.getByRole('radio', { name: 'Seleccionar ruta R-002' }))
    expect(screen.getByRole('radio', { name: 'Seleccionar ruta R-002' })).toBeChecked()
    expect(simulateButton).toBeEnabled()

    fireEvent.click(simulateButton)

    await waitFor(() => expect(simulate).toHaveBeenCalledTimes(1))
    expect(simulate).toHaveBeenCalledWith(
      expect.objectContaining({
        route: expect.objectContaining({ id: 'R-002' }),
        parameters: {
          fuelPricePerLiter: 1_250,
          includeSurplus: true,
          generalCosts: 25_000,
          hourlyRate: 8_000,
        },
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('ESC-015')
  })

  it('updates the parameter inputs and the surplus toggle', async () => {
    render(<SimulationScreen />)

    const routeTable = await screen.findByRole('table', { name: 'Rutas a simular' })
    await within(routeTable).findByText('R-001')
    fireEvent.change(screen.getByLabelText('Precio combustible ($/L)'), { target: { value: '1500' } })
    fireEvent.change(screen.getByLabelText('Gastos varios ($)'), { target: { value: '30000' } })
    fireEvent.change(screen.getByLabelText('Costo por hora ($)'), { target: { value: '9000' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Incluir excedentes' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Seleccionar ruta R-001' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simular' }))

    await waitFor(() =>
      expect(simulate).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: {
            fuelPricePerLiter: 1_500,
            includeSurplus: false,
            generalCosts: 30_000,
            hourlyRate: 9_000,
          },
        }),
      ),
    )
  })

  it('collapses and expands the parameters panel while keeping the registry visible', async () => {
    render(<SimulationScreen />)

    const routeTable = await screen.findByRole('table', { name: 'Rutas a simular' })
    await within(routeTable).findByText('R-001')
    fireEvent.click(screen.getByRole('button', { name: 'Contraer parámetros de simulación' }))

    expect(screen.queryByRole('table', { name: 'Rutas a simular' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Registros de Escenarios' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expandir parámetros de simulación' }))
    expect(await screen.findByRole('table', { name: 'Rutas a simular' })).toBeInTheDocument()
  })

  it('moves products between the available and included tables', async () => {
    render(<SimulationScreen />)

    const availableTable = await screen.findByRole('table', { name: 'Productos disponibles' })
    const includedTable = screen.getByRole('table', { name: 'Productos incluidos en el vehículo' })

    fireEvent.click(within(availableTable).getByRole('radio', { name: 'Seleccionar Agua 500 ml disponible' }))
    fireEvent.change(within(availableTable).getByLabelText('Cantidad de Agua 500 ml'), {
      target: { value: '10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto al vehículo' }))

    const aguaRow = within(includedTable).getByText('Agua 500 ml').closest('tr')
    expect(aguaRow).toHaveTextContent('50')

    fireEvent.click(within(includedTable).getByRole('button', { name: 'Seleccionar Snacks incluido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar producto del vehículo' }))

    expect(within(includedTable).queryByText('Snacks')).not.toBeInTheDocument()
  })

  it('paginates the scenario registry and opens a scenario detail', async () => {
    render(<SimulationScreen />)

    await screen.findByText('ESC-014')
    expect(screen.getByText('Mostrando 1 a 8 de 14 registros')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de ESC-014' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Detalle del escenario' })).toBeInTheDocument()
    expect(within(dialog).getByText('ESC-014')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Identificación del escenario/).firstElementChild).toHaveClass('flex', 'items-center')
    expect(within(dialog).getByText('Ingreso estimado')).toBeInTheDocument()
    expect(within(dialog).getByText('Pedidos')).toBeInTheDocument()
    expect(within(dialog).getByText('Precio combustible')).toBeInTheDocument()
    expect(within(dialog).getByText('Productos incluidos')).toBeInTheDocument()
    expect(within(dialog).getByText('Agua 500 ml')).toBeInTheDocument()
    const includedProducts = within(dialog).getByRole('table', { name: 'Productos incluidos' })
    expect(within(includedProducts).getAllByRole('columnheader')).toHaveLength(2)
    expect(within(includedProducts).getByRole('columnheader', { name: 'Cantidad' })).toBeInTheDocument()
    expect(within(dialog).getByText(/estimaciones y no generan acciones reales/i)).toBeInTheDocument()
    expect(getScenarioDetail).toHaveBeenCalledWith('ESC-014')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de escenarios' }))
    await waitFor(() => expect(getScenarios).toHaveBeenCalledWith(2))
    expect(await screen.findByText('ESC-006')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 9 a 14 de 14 registros')).toBeInTheDocument()
  })

  it('enables the comparison only when exactly two scenarios are selected', async () => {
    render(<SimulationScreen />)

    await screen.findByText('ESC-014')
    const compareButton = screen.getByRole('button', { name: 'Comparar Escenarios' })
    expect(compareButton).toBeEnabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ESC-014 para comparar' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ESC-012 para comparar' }))
    expect(compareButton).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ESC-014 para comparar' }))
    expect(compareButton).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar ESC-013 para comparar' }))
    expect(compareButton).toBeEnabled()

    fireEvent.click(compareButton)

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Comparación de escenarios' }),
    ).toBeInTheDocument()
    const summary = within(dialog).getByRole('region', { name: 'Resumen comparativo' })
    expect(within(summary).getByText('Mejor ingreso').parentElement).toHaveTextContent('ESC-013')
    expect(within(summary).getByText('Menor costo operativo').parentElement).toHaveTextContent('ESC-014')
    expect(within(summary).getByText('Mejor margen bruto').parentElement).toHaveTextContent('ESC-014')

    const comparedScenarios = within(dialog).getByLabelText('Escenarios comparados')
    const scenarioRows = within(comparedScenarios).getAllByText('Repartidor')
    expect(scenarioRows).toHaveLength(2)
    scenarioRows.forEach((label) => expect(label.parentElement).toHaveClass('flex', 'items-center', 'justify-between'))
  })

  it('renders route and history empty states with disabled primary actions', async () => {
    getRoutes.mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0 })
    getScenarios.mockResolvedValue({ items: [], page: 1, pageSize: 8, total: 0 })
    getCatalog.mockResolvedValue({ available: [], included: [] })

    render(<SimulationScreen />)

    expect(await screen.findByText('No hay rutas disponibles')).toBeInTheDocument()
    expect(screen.getByText('No hay escenarios registrados')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 0 de 0 rutas')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 0 de 0 registros')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Simular' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Comparar Escenarios' })).toBeDisabled()
  })

  it('shows a retry state when routes cannot be loaded', async () => {
    getRoutes.mockRejectedValue(new Error('offline'))

    render(<SimulationScreen />)

    expect(await screen.findByText('No se pudieron cargar las rutas.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar rutas' }))
    await waitFor(() => expect(getRoutes).toHaveBeenCalledTimes(2))
  })
})

describe('Simulation HTTP adapter', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiPost.mockReset()
  })

  it('loads routes, products, and scenarios from the demo API endpoints', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const routeResult = routesPage(1)
    const catalogResult = catalog()
    const scenarioResult = scenariosPage(1)
    apiGet
      .mockResolvedValueOnce({ data: routeResult })
      .mockResolvedValueOnce({ data: catalogResult })
      .mockResolvedValueOnce({ data: scenarioResult })

    await expect(service.getRoutes(1)).resolves.toEqual(routeResult)
    await expect(service.getCatalog()).resolves.toEqual(catalogResult)
    await expect(service.getScenarios(2)).resolves.toEqual(scenarioResult)

    expect(apiGet).toHaveBeenNthCalledWith(1, '/simulation/demo/routes', { params: { page: 1 } })
    expect(apiGet).toHaveBeenNthCalledWith(2, '/simulation/demo/catalog')
    expect(apiGet).toHaveBeenNthCalledWith(3, '/simulation/demo/scenarios', { params: { page: 2 } })
  })

  it('loads scenario detail from its dedicated demo API endpoint', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const detail = { ...scenario('ESC-014', 'R-001', 360_000), orderCount: 12, fuelLiters: 18.5, distanceKm: 102.4, durationHours: 6.5, parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 }, products: catalog().included }
    apiGet.mockResolvedValueOnce({ data: detail })

    await expect(service.getScenarioDetail('ESC-014')).resolves.toEqual(detail)
    expect(apiGet).toHaveBeenCalledWith('/simulation/demo/scenarios/ESC-014')
  })

  it('posts only the selected route, supported parameters, and product quantities, then propagates failures', async () => {
    const { simulationService: service } = await vi.importActual<typeof import('@/services/simulation.service')>('@/services/simulation.service')
    const input = {
      route: route('R-002', 'Centro', 10, 'María López'),
      parameters: { fuelPricePerLiter: 1250, includeSurplus: true, generalCosts: 25000, hourlyRate: 8000 },
      products: [{ ...product('p-1', 'Agua 500 ml', 120, 1200), quantity: 10 }],
    }
    const result = scenario('ESC-015', 'R-002', 341_000)
    apiPost.mockResolvedValueOnce({ data: result })

    await expect(service.simulate(input)).resolves.toEqual(result)
    expect(apiPost).toHaveBeenCalledWith('/simulation/demo/scenarios', {
      routeId: 'R-002',
      parameters: input.parameters,
      products: [{ id: 'p-1', quantity: 10 }],
    })

    const failure = new Error('API unavailable')
    apiPost.mockRejectedValueOnce(failure)
    await expect(service.simulate(input)).rejects.toBe(failure)
  })
})
