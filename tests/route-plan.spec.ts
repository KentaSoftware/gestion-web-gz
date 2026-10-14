import { expect, type Page, test } from '@playwright/test'

/**
 * Canonical `/route` acceptance flow (T-F.7/T-F.8 coverage).
 *
 * Everything runs against mocked APIs registered with `page.route()`: the
 * session is seeded in `localStorage` and no request ever reaches a live
 * backend, routing provider or Google Maps. The preview and the saved snapshot
 * both report `MAP_UNAVAILABLE`, so the flow always renders the ordered list
 * fallback and never loads the live map script.
 */

const ZONE_ID = 'a'.repeat(24)
const SALE_ID = 'c'.repeat(24)
const CLIENT_ID = 'd'.repeat(24)
const BLOCKED_SALE_ID = 'e'.repeat(24)
const PLAN_ID = 'f'.repeat(24)
const SERVICE_DATE = '2026-10-04'

/** Session seeded before app scripts run so `useSessionAccess` hydrates to READY. */
const SESSION = {
  nickname: 'e2e-operator',
  token: 'e2e-token',
  id: 'user-1',
  email: 'e2e@example.com',
  role: {
    _id: 'role-1',
    name: 'operator',
    permissions: [],
  },
}

const ZONE = { _id: ZONE_ID, code: 'NORTE', name: 'Zona Norte', active: true }

const ASSIGNMENT_OPTIONS = {
  drivers: [{ id: 'driver-1', nickname: 'Repartidor Uno', isActive: true }],
  vehicles: [
    {
      id: 'vehicle-1',
      code: 'CAM-01',
      fuelConsumptionLitersPer100Km: 12,
      attributes: {},
      availability: true,
    },
  ],
}

const CANDIDATES = {
  eligible: [
    {
      saleId: SALE_ID,
      clientId: CLIENT_ID,
      displayName: 'Almacén Sur',
      addressSummary: 'Av. Siempre Viva 742',
    },
  ],
  blocked: [
    {
      saleId: BLOCKED_SALE_ID,
      displayName: 'Kiosco Norte',
      addressSummary: 'Calle Falsa 123',
      reasons: ['CLIENT_LOCATION_UNCONFIRMED', 'FUTURE_BLOCK_REASON'],
    },
  ],
  ruleVersion: 'candidate-eligibility-v1',
}

const PREVIEW = {
  route: {
    depot: { id: 'deposito_1', name: 'Depósito Central', latitude: -34.6, longitude: -58.4 },
    stops: [{ clientId: CLIENT_ID, saleIds: [SALE_ID], latitude: -34.61, longitude: -58.41 }],
    segments: [
      { fromId: 'deposito_1', toId: CLIENT_ID, distanceMeters: 3500, durationSeconds: 900 },
    ],
    encodedPolyline: 'encoded-polyline',
  },
  metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 1, fuelLiters: 0.3 },
  warnings: ['MAP_UNAVAILABLE', 'FUTURE_WARNING'],
  factorsConsidered: ['DISTANCE', 'FUTURE_FACTOR'],
  algorithmVersion: 'nearest-neighbor-2opt-v1',
  algorithmProvider: 'google-routes',
  routingConfigRevision: 3,
  ruleVersion: 'candidate-eligibility-v1',
}

const SNAPSHOT = {
  _id: PLAN_ID,
  snapshotVersion: 1,
  planningDate: '2026-10-04T03:00:00.000Z',
  zoneSnapshot: { code: 'NORTE', normalizedName: 'zona norte', name: 'Zona Norte' },
  selectedSaleIds: [SALE_ID],
  depot: { name: 'Depósito Central', latitude: -34.6, longitude: -58.4 },
  stops: [
    { clientId: CLIENT_ID, saleIds: [SALE_ID], sequence: 1, latitude: -34.61, longitude: -58.41 },
  ],
  segments: [
    { fromStopSequence: 0, toStopSequence: 1, distanceMeters: 3500, durationSeconds: 900 },
    { fromStopSequence: 1, toStopSequence: 0, distanceMeters: 3500, durationSeconds: 900 },
  ],
  metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 1, fuelLiters: 0.3 },
  algorithm: {
    name: 'nearest-neighbor-2opt-v1',
    version: 'nearest-neighbor-2opt-v1',
    provider: 'google-routes',
  },
  routingConfigRevision: 3,
  ruleVersion: 'candidate-eligibility-v1',
  encodedPolyline: 'encoded-polyline',
  warnings: ['MAP_UNAVAILABLE'],
  audit: { createdBy: 'user-1', createdAt: '2026-10-04T03:05:00.000Z' },
  createdAt: '2026-10-04T03:05:00.000Z',
}

export const DASHBOARD = {
  filters: { serviceDate: SERVICE_DATE, zoneCode: 'NORTE' },
  kpis: { activeRoutes: 2, pendingOrders: 1, totalDistanceMeters: 5000, estimatedFuelLiters: 1.2 },
  routes: [
    {
      id: 'route-1', status: 'PENDING', zoneCode: 'NORTE', selectedSaleIds: [SALE_ID], clientCount: 1,
      metrics: { distanceMeters: 3500, durationSeconds: 900, fuelLiters: 0.3 },
      assignments: { driverId: 'driver-1', vehicleId: 'vehicle-1' }, warnings: [], stale: false,
      depot: { name: 'Depósito Central', latitude: -34.6, longitude: -58.4 }, encodedPolyline: '',
      stops: [{ clientId: CLIENT_ID, saleIds: [SALE_ID], sequence: 1, latitude: -34.61, longitude: -58.41 }],
      segments: [{ fromStopSequence: 0, toStopSequence: 1, distanceMeters: 3500, durationSeconds: 900 }],
      stopEstimates: [{ sequence: 1, arrival: '2026-10-04T03:15:00.000Z', cumulativeDurationSeconds: 900, availability: 'ESTIMATED' }],
      saleReferences: [{ saleId: SALE_ID, versionAtSave: 1, currentVersion: 1, currentStatus: 'PENDING' }],
    },
    {
      id: 'route-2', status: 'COMPLETED', zoneCode: 'NORTE', selectedSaleIds: ['legacy-sale'], clientCount: 1,
      metrics: { distanceMeters: 1500, durationSeconds: 600, fuelLiters: null },
       assignments: { driverId: 'driver-2', vehicleId: 'vehicle-2' }, warnings: [], stale: true,
    },
  ],
  candidates: { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' },
  warnings: [],
}

const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

/**
 * Intercepts every route-planning API call regardless of the configured API
 * host, so the spec never depends on `NEXT_PUBLIC_DB_HOST`.
 */
export const mockRouteApi = async (page: Page): Promise<void> => {
  await page.route(/\/(deliveryZone|routePlan)([/?]|$)/, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())

    if (pathname.endsWith('/deliveryZone')) {
      return route.fulfill(json([ZONE]))
    }
    if (pathname.endsWith('/routePlan/assignment-options')) {
      return route.fulfill(json(ASSIGNMENT_OPTIONS))
    }
    if (pathname.endsWith('/routePlan/dashboard')) {
      return route.fulfill(json(DASHBOARD))
    }
    if (pathname.endsWith('/routePlan/candidates')) {
      return route.fulfill(json(CANDIDATES))
    }
    if (pathname.endsWith('/routePlan/preview')) {
      return route.fulfill(json(PREVIEW))
    }
    if (pathname.endsWith('/routePlan') && request.method() === 'POST') {
      return route.fulfill(json(SNAPSHOT))
    }
    if (/\/routePlan\/[a-fA-F0-9]{24}$/.test(pathname) && request.method() === 'GET') {
      return route.fulfill(json(SNAPSHOT))
    }
    return route.continue()
  })
}

export const seedSession = async (page: Page): Promise<void> => {
  await page.addInitScript((session) => {
    window.localStorage.setItem('user', JSON.stringify(session))
  }, SESSION)
}

test.describe('Route plan acceptance', () => {
  test(
    'T-F.7/T-F.8: operator reviews candidates, previews with map fallback and opens the saved plan',
    { tag: ['@e2e', '@route', '@T-F.7', '@T-F.8'] },
    async ({ page }, testInfo) => {
      testInfo.skip(testInfo.project.name === 'mobile-chromium', 'Desktop acceptance flow is intentionally not duplicated on mobile.')
      await seedSession(page)
      await mockRouteApi(page)

      await page.goto('/route')

       // Authenticated shell (session hydrated from localStorage; no route permission is required).
      // Generous timeout: the first `/route` request compiles the dev chunk.
      await expect(page.getByRole('heading', { level: 1, name: 'Rutas' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('heading', { level: 2, name: 'Planificación de rutas' })).toBeVisible({
        timeout: 15_000,
      })

      // Dashboard detail uses the first selected route and preserves a textual
      // sequence plus linked sale references when the map provider is absent.
      await expect(page.getByRole('button', { name: 'Seleccionar ruta route-1' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Mapa de ruta seleccionada' })).toBeVisible()
      await expect(page.getByText('Parada 1')).toBeVisible()
      await expect(page.getByRole('paragraph').filter({ hasText: 'Pedidos vinculados:' })).toBeVisible()
      await expect(page.getByText(/El mapa no está configurado/)).toBeVisible()
      await page.getByRole('button', { name: 'Seleccionar ruta route-2' }).click()
      await expect(page.getByText('No hay detalle geográfico disponible para esta ruta.')).toBeVisible()

      const planner = page.getByRole('region', { name: 'Planificación de rutas' })
      await page.getByLabel('Fecha de reparto').fill(SERVICE_DATE)
      await expect(planner.getByRole('option', { name: 'Zona Norte' })).toBeAttached()
      await planner.getByLabel('Zona de entrega').selectOption(ZONE_ID)
      await page.getByRole('button', { name: 'Cargar candidatos' }).click()

      // Candidate review: eligible destination plus blocked destinations.
      await expect(page.getByRole('heading', { name: 'Destinos elegibles (1)' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Destinos bloqueados (1)' })).toBeVisible()

      // Blocked reasons: a stable reason label and an unknown code fallback.
      await expect(page.getByText('La ubicación del cliente no está confirmada')).toBeVisible()
      await expect(page.getByText('FUTURE_BLOCK_REASON')).toBeVisible()

      await page.getByRole('checkbox', { name: 'Almacén Sur' }).check()
      await page.getByLabel('Repartidor').selectOption('driver-1')
      await page.getByLabel('Vehículo').selectOption('vehicle-1')
      await page.getByRole('button', { name: 'Calcular recorrido' }).click()

      // Preview: metrics stay visible, MAP_UNAVAILABLE falls back to the list.
      await expect(page.getByRole('heading', { name: 'Recorrido propuesto' })).toBeVisible()
      await expect(planner.getByText('3,5 km')).toBeVisible()
      await expect(
        page.getByText('Se muestra el recorrido como lista porque el mapa no está disponible.')
      ).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Mapa del recorrido' })).toBeVisible()

      // Unknown warning and factor codes fall back to their raw value.
      await expect(page.getByText('FUTURE_WARNING')).toBeVisible()
      await expect(page.getByText('FUTURE_FACTOR')).toBeVisible()

      // Save persists the preview and navigates to the immutable snapshot.
      await page.getByRole('button', { name: 'Guardar plan' }).click()

      await page.waitForURL(`**/route/${PLAN_ID}`)
      await expect(page.getByRole('heading', { level: 1, name: 'Plan de ruta guardado' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Detalle del recorrido' })).toBeVisible()
      await expect(page.getByRole('list', { name: 'Paradas del recorrido' })).toBeVisible()
    }
  )
})
