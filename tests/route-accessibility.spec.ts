import { expect, type Page, test } from '@playwright/test'

const session = {
  nickname: 'e2e-operator', token: 'e2e-token', id: 'user-1', email: 'e2e@example.com',
  role: { _id: 'role-1', name: 'operator', permissions: [] },
}

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const mockRouteApi = async (page: Page): Promise<void> => {
  await page.route(/\/(deliveryZone|routePlan)([/?]|$)/, async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    if (pathname.endsWith('/deliveryZone')) return route.fulfill(json([{ _id: 'a'.repeat(24), code: 'NORTE', name: 'Zona Norte', active: true }]))
    if (pathname.endsWith('/routePlan/assignment-options')) return route.fulfill(json({ drivers: [], vehicles: [] }))
    if (pathname.endsWith('/routePlan/dashboard')) return route.fulfill(json({
      filters: { serviceDate: '2026-10-04', zoneCode: 'NORTE' },
      kpis: { activeRoutes: 2, pendingOrders: 1, totalDistanceMeters: 5000, estimatedFuelLiters: 1.2 },
      routes: [
        { id: 'route-1', status: 'PENDING', zoneCode: 'NORTE', selectedSaleIds: ['sale-1'], clientCount: 1, metrics: { distanceMeters: 3500, durationSeconds: 900, fuelLiters: 0.3 }, assignments: { driverId: 'driver-1', vehicleId: 'vehicle-1' }, warnings: [], stale: false, depot: { name: 'Depósito Central', latitude: -34.6, longitude: -58.4 }, encodedPolyline: '', stops: [{ clientId: 'client-1', saleIds: ['sale-1'], sequence: 1, latitude: -34.61, longitude: -58.41 }], segments: [{ fromStopSequence: 0, toStopSequence: 1, distanceMeters: 3500, durationSeconds: 900 }], stopEstimates: [{ sequence: 1, arrival: '2026-10-04T03:15:00.000Z', cumulativeDurationSeconds: 900, availability: 'ESTIMATED' }], saleReferences: [{ saleId: 'sale-1', versionAtSave: 1, currentVersion: 1, currentStatus: 'PENDING' }] },
        { id: 'route-2', status: 'COMPLETED', zoneCode: 'NORTE', selectedSaleIds: ['legacy-sale'], clientCount: 1, metrics: { distanceMeters: 1500, durationSeconds: 600, fuelLiters: null }, assignments: { driverId: 'driver-2', vehicleId: 'vehicle-2' }, warnings: [], stale: true },
      ], candidates: { eligible: [{ saleId: 'sale-1', clientId: 'client-1', displayName: 'Almacén Sur', addressSummary: 'Av. Siempre Viva 742' }], blocked: [], ruleVersion: 'candidate-eligibility-v1' }, warnings: [],
    }))
    if (pathname.endsWith('/routePlan/candidates')) return route.fulfill(json({ eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' }))
    return route.continue()
  })
}

const seedSession = async (page: Page): Promise<void> => {
  await page.addInitScript((value) => window.localStorage.setItem('user', JSON.stringify(value)), session)
}

test.describe('Route plan accessibility and responsive verification', () => {
  test('G-A.4: keyboard focus, landmarks, controls and semantic fallback remain reachable', {
    tag: ['@e2e', '@route', '@G-A.4', '@AC-50', '@AC-51'],
  }, async ({ page }) => {
    await seedSession(page)
    await mockRouteApi(page)
    await page.goto('/route')

    await expect(page.getByRole('heading', { level: 1, name: 'Rutas' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('region', { name: 'Planificación de rutas' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Indicadores de rutas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Consultar dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mapa de ruta seleccionada' })).toBeVisible()
    await expect(page.getByText('La secuencia textual de la ruta seleccionada permanece disponible')).toBeVisible()

    const firstRoute = page.getByRole('button', { name: 'Seleccionar ruta route-1' })
    await firstRoute.focus()
    await expect(firstRoute).toBeFocused()
    await firstRoute.press('Enter')
    await expect(firstRoute).toHaveAttribute('aria-pressed', 'true')
    await firstRoute.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()

    await page.getByRole('button', { name: 'Seleccionar ruta route-2' }).press('Enter')
    await expect(page.getByText('Esta ruta está desactualizada y es de solo lectura')).toBeVisible()
    await expect(page.getByText('Litros de combustible no disponibles')).toBeVisible()
    await expect(page.getByText('Horarios estimados no disponibles')).toBeVisible()

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/\b(?:USD|ARS|costo|precio|moneda)\b/i)
  })

  test('G-A.4: mobile stacks route flow without horizontal overflow', {
    tag: ['@e2e', '@route', '@G-A.4', '@AC-52'],
  }, async ({ page }, testInfo) => {
    testInfo.skip(testInfo.project.name !== 'mobile-chromium', 'This check is scoped to the mobile Playwright project.')
    await seedSession(page)
    await mockRouteApi(page)
    await page.goto('/route')

    await expect(page.getByRole('heading', { level: 1, name: 'Rutas' })).toBeVisible({ timeout: 15_000 })

    const regions = [
      page.getByRole('region', { name: 'Rutas planificadas' }),
      page.getByRole('region', { name: 'Clientes con pedidos' }),
      page.getByRole('region', { name: 'Mapa de ruta seleccionada' }),
      page.getByRole('region', { name: 'Detalle de ruta' }),
    ]
    const boxes = await Promise.all(regions.map((region) => region.boundingBox()))
    expect(boxes.every((box) => box !== null)).toBe(true)
    expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y)
    expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y)
    expect(boxes[2]!.y).toBeLessThan(boxes[3]!.y)

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.viewport).toBeLessThan(768)
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewport)
  })

  test('G-A.4: route semantic tokens provide a bounded foreground/background check', {
    tag: ['@e2e', '@route', '@G-A.4', '@TC-031'],
  }, async ({ page }) => {
    await seedSession(page)
    await mockRouteApi(page)
    await page.goto('/route')

    await expect(page.getByRole('heading', { level: 1, name: 'Rutas' })).toBeVisible({ timeout: 15_000 })
    const tokenCheck = await page.getByRole('article').first().evaluate((article) => {
      const heading = article.querySelector('h3')
      if (heading === null) return null
      const headingStyle = getComputedStyle(heading)
      const cardStyle = getComputedStyle(article)
      return {
        foreground: headingStyle.color,
        background: cardStyle.backgroundColor,
        primaryToken: getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim(),
        surfaceToken: getComputedStyle(document.documentElement).getPropertyValue('--color-surface-base').trim(),
      }
    })

    expect(tokenCheck).not.toBeNull()
    expect(tokenCheck!.foreground).not.toBe(tokenCheck!.background)
    expect(tokenCheck!.primaryToken).not.toBe('')
    expect(tokenCheck!.surfaceToken).not.toBe('')
    // Limitation: no axe/contrast engine is installed; this verifies the
    // stable semantic token relationship, not a calculated WCAG ratio.
  })
})
