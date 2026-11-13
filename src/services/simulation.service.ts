import apiClient from '@/utils/client'

/** Authenticated adapter for saved operational route simulations. */

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
  orderCount: number | null
  driver: string
  vehicle: string
  fuelLiters: number | null
  distanceKm: number | null
  durationHours: number | null
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
  excludedCount: number
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
  orderCount: number | null
  fuelLiters: number | null
  distanceKm: number | null
  durationHours: number | null
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

interface RouteZoneSnapshot {
  name?: string
}

interface RouteMetrics {
  distanceMeters?: number | null
  durationSeconds?: number | null
  fuelLiters?: number | null
}

interface RouteAssignments {
  driverId?: string | null
  vehicleId?: string | null
}

interface RouteOptionRecord {
  _id: string
  planningDate?: string | Date
  zoneSnapshot?: RouteZoneSnapshot
  metrics?: RouteMetrics
  assignments?: RouteAssignments | null
  orderCount?: number
  driver?: string
  vehicle?: string
}

interface RouteCatalogRecord {
  id: string
  name: string
  stock: number
  precioUnitario: number
}

interface CursorPage<T> {
  items: T[]
  hasMore: boolean
  nextCursor: string | null
  excludedCount?: number
}

interface ScenarioSummaryRecord {
  id: string
  date?: string
  routeId: string
  zone?: string
  driverId?: string
  driver?: string
  vehicleId?: string
  vehicle?: string
  estimatedRevenue: number
  operatingCost: number
  grossMargin: number
}

interface ScenarioHistoryPage {
  items: ScenarioSummaryRecord[]
  page: number
  pageSize: number
  total: number
}

interface ScenarioRouteSnapshot {
  date?: string | Date
  zone?: string
  orderCount?: number
  distanceKm?: number
  fuelLiters?: number
  durationHours?: number
  driverId?: string
  driver?: string
  vehicleId?: string
  vehicle?: string
}

interface ScenarioRouteMetrics {
  fuelLiters?: number
  durationHours?: number
}

interface RealRouteScenarioRecord {
  id: string
  routeId: string
  routeSnapshot?: ScenarioRouteSnapshot
  routeMetrics: ScenarioRouteMetrics
  parameters: SimulationParameters
  products: SimulationLoadedProduct[]
  estimatedRevenue: number
  operatingCost: number
  grossMargin: number
}

interface CursorCollection<T> {
  items: T[]
  excludedCount: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isCursorPage = <T>(value: unknown): value is CursorPage<T> =>
  isRecord(value) &&
  Array.isArray(value.items) &&
  typeof value.hasMore === 'boolean' &&
  (value.nextCursor === null || typeof value.nextCursor === 'string') &&
  (value.excludedCount === undefined || isNonNegativeNumber(value.excludedCount))

const formatDate = (value?: string | Date): string => {
  if (value === undefined) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(date)
}

const labelOrId = (label?: string, id?: string): string => {
  if (typeof label === 'string' && label.trim() !== '') return label
  if (typeof id === 'string' && id.trim() !== '') return id
  return '—'
}

const readCursorCollection = async <T>(url: string): Promise<CursorCollection<T>> => {
  const items: T[] = []
  const seenCursors = new Set<string>()
  let excludedCount = 0
  let cursor: string | undefined

  while (true) {
    const response = cursor === undefined
      ? await apiClient.get<unknown>(url)
      : await apiClient.get<unknown>(url, { params: { cursor } })
    if (!isCursorPage<T>(response.data)) throw new Error('La respuesta paginada de simulación no es válida.')

    const page = response.data
    items.push(...page.items)
    excludedCount += page.excludedCount ?? 0

    if (!page.hasMore) {
      if (page.nextCursor !== null) throw new Error('La respuesta paginada de simulación no es válida.')
      return { items, excludedCount }
    }

    const nextCursor = page.nextCursor
    if (typeof nextCursor !== 'string' || nextCursor.trim() === '' || seenCursors.has(nextCursor)) {
      throw new Error('La paginación de simulación no avanzó; no se muestran resultados parciales.')
    }
    seenCursors.add(nextCursor)
    cursor = nextCursor
  }
}

const mapRoute = (route: RouteOptionRecord): SimulationRoute => {
  const metrics = route.metrics ?? {}
  const assignments = route.assignments ?? {}
  const distanceKm = isNonNegativeNumber(metrics.distanceMeters) ? metrics.distanceMeters / 1000 : null
  const durationHours = isNonNegativeNumber(metrics.durationSeconds) ? metrics.durationSeconds / 3600 : null

  return {
    id: route._id,
    zone: labelOrId(route.zoneSnapshot?.name),
    orderCount: isNonNegativeNumber(route.orderCount) ? route.orderCount : null,
    driver: labelOrId(route.driver, assignments.driverId ?? undefined),
    vehicle: labelOrId(route.vehicle, assignments.vehicleId ?? undefined),
    fuelLiters: isNonNegativeNumber(metrics.fuelLiters) ? metrics.fuelLiters : null,
    distanceKm,
    durationHours,
    date: formatDate(route.planningDate),
  }
}

const mapScenarioSummary = (scenario: ScenarioSummaryRecord): SimulationScenario => ({
  id: scenario.id,
  date: formatDate(scenario.date),
  routeId: scenario.routeId,
  zone: labelOrId(scenario.zone),
  driver: labelOrId(scenario.driver, scenario.driverId),
  vehicle: labelOrId(scenario.vehicle, scenario.vehicleId),
  estimatedRevenue: scenario.estimatedRevenue,
  operatingCost: scenario.operatingCost,
  grossMargin: scenario.grossMargin,
})

const mapScenarioDetail = (scenario: RealRouteScenarioRecord): SimulationScenarioDetail => {
  const snapshot = scenario.routeSnapshot
  const routeMetrics = scenario.routeMetrics ?? {}

  return {
    id: scenario.id,
    date: formatDate(snapshot?.date),
    routeId: scenario.routeId,
    zone: labelOrId(snapshot?.zone),
    driver: labelOrId(snapshot?.driver, snapshot?.driverId),
    vehicle: labelOrId(snapshot?.vehicle, snapshot?.vehicleId),
    orderCount: isNonNegativeNumber(snapshot?.orderCount) ? snapshot.orderCount : null,
    fuelLiters: isNonNegativeNumber(snapshot?.fuelLiters)
      ? snapshot.fuelLiters
      : isNonNegativeNumber(routeMetrics.fuelLiters) ? routeMetrics.fuelLiters : null,
    distanceKm: isNonNegativeNumber(snapshot?.distanceKm) ? snapshot.distanceKm : null,
    durationHours: isNonNegativeNumber(snapshot?.durationHours)
      ? snapshot.durationHours
      : isNonNegativeNumber(routeMetrics.durationHours) ? routeMetrics.durationHours : null,
    parameters: scenario.parameters,
    products: scenario.products,
    estimatedRevenue: scenario.estimatedRevenue,
    operatingCost: scenario.operatingCost,
    grossMargin: scenario.grossMargin,
  }
}

const isScenarioHistoryPage = (value: unknown): value is ScenarioHistoryPage =>
  isRecord(value) &&
  Array.isArray(value.items) &&
  Number.isSafeInteger(value.page) &&
  Number.isSafeInteger(value.pageSize) &&
  Number.isSafeInteger(value.total)

export const simulationService: SimulationService = {
  getRoutes: async (page) => {
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('La página de rutas no es válida.')
    const collection = await readCursorCollection<RouteOptionRecord>('/simulation/routes')
    const start = (page - 1) * SIMULATION_PAGE_SIZE.routes
    return {
      items: collection.items.slice(start, start + SIMULATION_PAGE_SIZE.routes).map(mapRoute),
      page,
      pageSize: SIMULATION_PAGE_SIZE.routes,
      total: collection.items.length,
    }
  },

  getCatalog: async () => {
    const collection = await readCursorCollection<RouteCatalogRecord>('/simulation/route-catalog')
    return {
      available: collection.items.map((product) => ({
        id: product.id,
        name: product.name,
        stock: product.stock,
        unitPrice: product.precioUnitario,
      })),
      included: [],
      excludedCount: collection.excludedCount,
    }
  },

  getScenarios: async (page) => {
    const response = await apiClient.get<unknown>('/simulation/route-scenarios', { params: { page } })
    if (!isScenarioHistoryPage(response.data)) throw new Error('El historial de simulaciones no es válido.')
    return {
      items: response.data.items.map(mapScenarioSummary),
      page: response.data.page,
      pageSize: response.data.pageSize,
      total: response.data.total,
    }
  },

  getScenarioDetail: async (scenarioId) => {
    const response = await apiClient.get<RealRouteScenarioRecord>(`/simulation/route-scenarios/${encodeURIComponent(scenarioId)}`)
    return mapScenarioDetail(response.data)
  },

  simulate: async ({ route, parameters, products }) => {
    const response = await apiClient.post<RealRouteScenarioRecord>('/simulation/route-scenarios', {
      routeId: route.id,
      parameters,
      products: products
        .filter((product) => product.quantity > 0)
        .map(({ id, quantity }) => ({ id, quantity })),
    })
    return mapScenarioDetail(response.data)
  },
}
