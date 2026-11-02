import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import SimulationPage from './page'
import type { RouteDashboard, RouteDashboardCard } from '@/interfaces/routePlan.interface'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/utils/client', () => ({
  default: { get, post },
}))

vi.mock('@/components/ProtectedRoute', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}))

const ROUTE_NORTH = 'a'.repeat(24)
const ROUTE_CENTER = 'b'.repeat(24)
const TOKEN = 'opaque-token_123.abc'
const BASE_HASH = 'c'.repeat(64)

const routeCard = (
  id: string,
  status: RouteDashboardCard['status'],
  zoneCode: string,
): RouteDashboardCard => ({
  id,
  status,
  zoneCode,
  selectedSaleIds: ['d'.repeat(24)],
  clientCount: 2,
  metrics: { distanceMeters: 1234, durationSeconds: 600, fuelLiters: null },
  assignments: {},
  warnings: [],
  stale: false,
})

const dashboardWith = (routes: RouteDashboardCard[]): RouteDashboard => ({
  filters: {},
  kpis: {
    activeRoutes: routes.length,
    pendingOrders: 0,
    totalDistanceMeters: null,
    estimatedFuelLiters: null,
  },
  routes,
  candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' },
  warnings: [],
})

const baseScenarioComplete = {
  dataQuality: 'COMPLETE' as const,
  token: TOKEN,
  baseScenarioHash: BASE_HASH,
  versions: {
    routeContractVersion: 'SIM-ROUTE-SNAPSHOT-001',
    stockContractVersion: 'SIM-STOCK-SNAPSHOT-001',
    rulesVersion: 'SIMULATION_RULES_PROVISIONAL_V1',
  },
}

const calculationComplete = {
  baseScenarioHash: BASE_HASH,
  variantId: 'variant-1',
  dataQuality: 'COMPLETE' as const,
  viability: 'VIABLE' as const,
  recommended: true,
  risks: [],
  components: [{ code: 'FUEL', amountArs: 12.34 }],
  // Deliberately not derived from components: the page must render server values.
  totals: {
    revenueArs: 500,
    merchandiseCostArs: 200,
    operatingCostArs: 50,
    marginArs: 250,
  },
  calculatedAt: '2026-11-02T00:00:00.000Z',
}

const selectRoute = async (id: string): Promise<void> => {
  fireEvent.click(await screen.findByRole('radio', { name: `Seleccionar ruta ${id}` }))
}

const createBase = async (id: string): Promise<void> => {
  await selectRoute(id)
  fireEvent.click(screen.getByRole('button', { name: 'Crear escenario base' }))
}

describe('SimulationPage bounded operational integration', () => {
  beforeEach(() => {
    get.mockResolvedValue({
      data: dashboardWith([
        routeCard(ROUTE_NORTH, 'PENDING', 'NORTE'),
        routeCard(ROUTE_CENTER, 'IN_PROGRESS', 'CENTRO'),
      ]),
    })
  })

  it('renders the protected dashboard shell and honest unavailable sections', async () => {
    render(<SimulationPage />)

    expect(screen.getByTestId('protected-route')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Simulación de escenarios' }),
    ).toBeInTheDocument()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Parámetros de simulación', 'Ejecutar simulación', 'Registros de escenarios'])

    const notice = screen.getByRole('note')
    expect(notice).toHaveTextContent('Integración operativa acotada')
    expect(notice).toHaveTextContent(/los resuelve el servidor/i)
    expect(notice).toHaveTextContent(/no calcula importes, márgenes, capacidad ni recomendaciones/i)
    expect(notice).toHaveTextContent(/solo aportan su identificador/i)
    expect(notice).toHaveTextContent(/si el módulo o los productores no están habilitados/i)

    expect(screen.queryByText('Datos de muestra')).not.toBeInTheDocument()
    expect(screen.queryByText('Vista ilustrativa')).not.toBeInTheDocument()
    expect(screen.queryByText('Espécimen de revisión')).not.toBeInTheDocument()
    expect(screen.queryByText('ESC-014')).not.toBeInTheDocument()
    expect(screen.queryByText('R-001')).not.toBeInTheDocument()

    expect(
      screen.getByText('El historial de corridas guardadas no está habilitado en esta integración.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('La comparación no está habilitada en esta integración.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /comparar escenarios/i })).not.toBeInTheDocument()

    await screen.findByRole('table', { name: 'Rutas de planificación' })
  })

  it('lists planning routes as identifiers only and never uses their metrics', async () => {
    render(<SimulationPage />)

    const table = await screen.findByRole('table', { name: 'Rutas de planificación' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText(ROUTE_NORTH)).toBeInTheDocument()
    expect(within(table).getByText('PENDING')).toBeInTheDocument()
    expect(within(table).getByText('NORTE')).toBeInTheDocument()
    expect(within(table).getByText(ROUTE_CENTER)).toBeInTheDocument()

    expect(get).toHaveBeenCalledWith('/routePlan/dashboard', { params: {} })
    expect(post).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Crear escenario base' })).toBeDisabled()
  })

  it('reports a planning-route load failure without inventing routes', async () => {
    get.mockRejectedValueOnce(new Error('network down'))

    render(<SimulationPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudieron cargar las rutas de planificación.',
    )
    expect(screen.queryByRole('table', { name: 'Rutas de planificación' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear escenario base' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await screen.findByRole('table', { name: 'Rutas de planificación' })
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('creates the base scenario with only the selected route identifier', async () => {
    post.mockResolvedValueOnce({ data: baseScenarioComplete })

    render(<SimulationPage />)

    await createBase(ROUTE_NORTH)

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/simulation/base-scenarios', {
        routeId: ROUTE_NORTH,
      }),
    )
    expect(await screen.findByText('Escenario base completo')).toBeInTheDocument()
    expect(screen.getByText(BASE_HASH)).toBeInTheDocument()
    expect(screen.getByText('SIM-ROUTE-SNAPSHOT-001')).toBeInTheDocument()
    expect(screen.getByText('SIM-STOCK-SNAPSHOT-001')).toBeInTheDocument()
    expect(screen.getByText('SIMULATION_RULES_PROVISIONAL_V1')).toBeInTheDocument()
    expect(screen.queryByText(TOKEN)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calcular variante' })).toBeInTheDocument()
  })

  it('renders the server incomplete base-scenario state without a token or calculation', async () => {
    post.mockRejectedValueOnce({
      response: {
        data: {
          dataQuality: 'INCOMPLETE',
          error: {
            code: 'SIMULATION_SNAPSHOT_INCOMPLETE',
            message: 'Stock snapshot is incomplete',
          },
          missingField: 'stock.products',
        },
      },
    })

    render(<SimulationPage />)
    await createBase(ROUTE_NORTH)

    expect(await screen.findByText('Escenario base incompleto')).toBeInTheDocument()
    expect(screen.getByText('SIMULATION_SNAPSHOT_INCOMPLETE')).toBeInTheDocument()
    expect(screen.getByText('stock.products')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Calcular variante' })).not.toBeInTheDocument()
    expect(screen.queryByText(BASE_HASH)).not.toBeInTheDocument()
  })

  it('surfaces a closed-gate error envelope with its correlation identifier', async () => {
    post.mockRejectedValueOnce({
      response: {
        data: {
          code: 'SIMULATION_DISABLED',
          message: 'Simulation is disabled',
          correlationId: 'corr-42',
        },
      },
    })

    render(<SimulationPage />)
    await createBase(ROUTE_NORTH)

    expect(await screen.findByText('No se pudo crear el escenario base')).toBeInTheDocument()
    expect(screen.getByText('SIMULATION_DISABLED')).toBeInTheDocument()
    expect(screen.getByText('Simulation is disabled')).toBeInTheDocument()
    expect(screen.getByText('corr-42')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Calcular variante' })).not.toBeInTheDocument()
  })

  it('calculates a variant against the server token and renders server amounts only', async () => {
    post
      .mockResolvedValueOnce({ data: baseScenarioComplete })
      .mockResolvedValueOnce({ data: calculationComplete })

    render(<SimulationPage />)
    await createBase(ROUTE_NORTH)

    fireEvent.change(await screen.findByLabelText('Nombre de la variante'), {
      target: { value: 'Base' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular variante' }))

    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(
        `/simulation/base-scenarios/${encodeURIComponent(TOKEN)}/variants/calculate`,
        { name: 'Base', overrides: [], directLoad: [] },
      ),
    )
    expect(await screen.findByText('Resultado del servidor')).toBeInTheDocument()
    expect(screen.getByText('variant-1')).toBeInTheDocument()
    expect(screen.getByText('VIABLE')).toBeInTheDocument()
    expect(screen.getByText('Recomendada por el servidor')).toBeInTheDocument()
    expect(screen.getByText('FUEL')).toBeInTheDocument()
    expect(screen.getByText('12.34')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('250')).toBeInTheDocument()
    expect(
      screen.getByText('Estimación de análisis sin garantía de resultado real.'),
    ).toBeInTheDocument()
  })

  it('renders an incomplete calculation with missing fields and no totals', async () => {
    post.mockResolvedValueOnce({ data: baseScenarioComplete }).mockResolvedValueOnce({
      data: {
        baseScenarioHash: BASE_HASH,
        variantId: 'variant-2',
        dataQuality: 'INCOMPLETE',
        viability: 'INCOMPLETE',
        recommended: false,
        risks: ['INCOMPLETE_DATA'],
        missingFields: ['configuration.fuelPriceArsPerLiter'],
        calculatedAt: '2026-11-02T00:00:00.000Z',
      },
    })

    render(<SimulationPage />)
    await createBase(ROUTE_NORTH)
    fireEvent.change(await screen.findByLabelText('Nombre de la variante'), {
      target: { value: 'Base' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular variante' }))

    expect(await screen.findByText('Cálculo incompleto')).toBeInTheDocument()
    expect(screen.getByText('configuration.fuelPriceArsPerLiter')).toBeInTheDocument()
    expect(screen.getByText('INCOMPLETE_DATA')).toBeInTheDocument()
    expect(screen.queryByText('Ingreso estimado (ARS)')).not.toBeInTheDocument()
    expect(screen.queryByText('Margen bruto (ARS)')).not.toBeInTheDocument()
    expect(screen.queryByText('Recomendada por el servidor')).not.toBeInTheDocument()
  })

  it('invalidates the base scenario when the server rejects or expires its token', async () => {
    post.mockResolvedValueOnce({ data: baseScenarioComplete }).mockRejectedValueOnce({
      response: {
        data: {
          code: 'SIMULATION_TOKEN_EXPIRED',
          message: 'Base scenario token expired',
        },
      },
    })

    render(<SimulationPage />)
    await createBase(ROUTE_NORTH)
    fireEvent.change(await screen.findByLabelText('Nombre de la variante'), {
      target: { value: 'Base' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular variante' }))

    expect(await screen.findByText('No se pudo calcular la variante')).toBeInTheDocument()
    expect(screen.getByText('SIMULATION_TOKEN_EXPIRED')).toBeInTheDocument()
    expect(screen.queryByText('Escenario base completo')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Calcular variante' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear escenario base' })).toBeInTheDocument()
  })

  it('performs no fetch, local persistence or unsupported simulation calls', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    render(<SimulationPage />)
    await screen.findByRole('table', { name: 'Rutas de planificación' })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(setItemSpy).not.toHaveBeenCalled()
    expect(post).not.toHaveBeenCalled()
    expect(screen.queryByText(/guardar corrida/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/configuraciones/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/presets/i)).not.toBeInTheDocument()

    setItemSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
