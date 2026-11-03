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

export interface SimulationRunInput {
  route: SimulationRoute
  parameters: SimulationParameters
  products: SimulationLoadedProduct[]
}

export interface SimulationService {
  getRoutes: (page: number) => Promise<SimulationPage<SimulationRoute>>
  getCatalog: () => Promise<SimulationCatalog>
  getScenarios: (page: number) => Promise<SimulationPage<SimulationScenario>>
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

  simulate: async ({ route, parameters, products }) => {
    const response = await apiClient.post<SimulationScenario>(`${SIMULATION_DEMO_URL}/scenarios`, {
      routeId: route.id,
      parameters,
      products: products.map(({ id, quantity }) => ({ id, quantity })),
    })
    return response.data
  },
}