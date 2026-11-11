import apiClient from '@/utils/client'

/** Authenticated HTTP adapter for the Simulation demo API. */

export const SIMULATION_PAGE_SIZE = {
  routes: 5,
  scenarios: 8,
} as const

export interface SimulationPage<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface SimulationRoute {
  id: string
  zone: string
  orderCount: number
  driver: string
  vehicle: string
  fuelLiters: number
  distanceKm: number
  durationHours: number
  date: string
}

export interface SimulationProduct {
  id: string
  name: string
  stock: number
  unitPrice: number
}

export interface SimulationLoadedProduct extends SimulationProduct {
  quantity: number
}

export interface SimulationCatalog {
  available: SimulationProduct[]
  included: SimulationLoadedProduct[]
}

export interface SimulationParameters {
  fuelPricePerLiter: number
  includeSurplus: boolean
  generalCosts: number
  hourlyRate: number
}

export interface SimulationScenario {
  id: string
  date: string
  routeId: string
  zone: string
  driver: string
  vehicle: string
  estimatedRevenue: number
  operatingCost: number
  grossMargin: number
}

export interface SimulationScenarioDetail extends SimulationScenario {
  orderCount: number
  fuelLiters: number
  distanceKm: number
  durationHours: number
  parameters: SimulationParameters
  products: SimulationLoadedProduct[]
}

export interface SimulationRunInput {
  route: SimulationRoute
  parameters: SimulationParameters
  products: SimulationLoadedProduct[]
}

export interface SimulationService {
  getRoutes: (page: number) => Promise<SimulationPage<SimulationRoute>>
  getCatalog: () => Promise<SimulationCatalog>
  getScenarios: (page: number) => Promise<SimulationPage<SimulationScenario>>
  getScenarioDetail: (scenarioId: string) => Promise<SimulationScenarioDetail>
  simulate: (input: SimulationRunInput) => Promise<SimulationScenario>
}

const SIMULATION_DEMO_URL = '/simulation/demo'

export const simulationService: SimulationService = {
  getRoutes: async (page) => {
    const response = await apiClient.get<SimulationPage<SimulationRoute>>(`${SIMULATION_DEMO_URL}/routes`, { params: { page } })
    return response.data
  },

  getCatalog: async () => {
    const response = await apiClient.get<SimulationCatalog>(`${SIMULATION_DEMO_URL}/catalog`)
    return response.data
  },

  getScenarios: async (page) => {
    const response = await apiClient.get<SimulationPage<SimulationScenario>>(`${SIMULATION_DEMO_URL}/scenarios`, { params: { page } })
    return response.data
  },

  getScenarioDetail: async (scenarioId) => {
    const response = await apiClient.get<SimulationScenarioDetail>(`${SIMULATION_DEMO_URL}/scenarios/${encodeURIComponent(scenarioId)}`)
    return response.data
  },

  simulate: async ({ route, parameters, products }) => {
    const response = await apiClient.post<SimulationScenario>(`${SIMULATION_DEMO_URL}/scenarios`, {
      routeId: route.id,
      parameters,
      products: products.map(({ id, quantity }) => ({ id, quantity })),
    })
    return response.data
  },
}

export interface CursorPage<T> {
  items: T[]
  hasMore: boolean
  nextCursor: string | null
}

export interface RealRoute {
  _id: string
  planningDate: string
  zoneSnapshot: { name: string }
  metrics?: { fuelLiters?: number; durationSeconds?: number; distanceMeters?: number }
}

export interface RealProduct {
  id: string
  name: string
  stock: number
  precioUnitario: number
}

export interface RealCatalogPage extends CursorPage<RealProduct> {
  excludedCount: number
}

export interface RealScenarioInput {
  routeId: string
  parameters: SimulationParameters
  products: Array<{ id: string; quantity: number }>
}

export interface RealScenario {
  id: string
  routeId: string
  routeMetrics: { fuelLiters: number; durationHours: number }
  parameters: SimulationParameters
  products: Array<{ id: string; name: string; unitPrice: number; quantity: number; stock: number }>
  estimatedRevenue: number
  operatingCost: number
  grossMargin: number
}

export const realSimulationService = {
  routes: async (cursor?: string) => (await apiClient.get<CursorPage<RealRoute>>('/simulation/routes', { params: cursor ? { cursor } : {} })).data,
  catalog: async (cursor?: string) => (await apiClient.get<RealCatalogPage>('/simulation/route-catalog', { params: cursor ? { cursor } : {} })).data,
  simulate: async (input: RealScenarioInput) => (await apiClient.post<RealScenario>('/simulation/route-scenarios', input)).data,
  getScenario: async (id: string) => (await apiClient.get<RealScenario>(`/simulation/route-scenarios/${encodeURIComponent(id)}`)).data,
}

export async function collectRealCatalog(): Promise<{ items: RealProduct[]; excludedCount: number }> {
  const items: RealProduct[] = []
  const seen = new Set<string>()
  let cursor: string | undefined
  let excludedCount = 0
  do {
    const page = await realSimulationService.catalog(cursor)
    items.push(...page.items)
    excludedCount += page.excludedCount
    if (!page.hasMore) return { items, excludedCount }
    if (!page.nextCursor || seen.has(page.nextCursor)) throw new Error('Paginación del catálogo inválida')
    seen.add(page.nextCursor)
    cursor = page.nextCursor
  } while (seen.size < 10000)
  throw new Error('Se excedió el límite de páginas del catálogo')
}
