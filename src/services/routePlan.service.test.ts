import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/utils/client', () => ({ default: { get, post } }))

import { routePlanService } from './routePlan.service'

const ZONE_ID = 'a'.repeat(24)
const SALE_ID = 'c'.repeat(24)

describe('routePlanService', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('requests active delivery zones with an explicit active filter', async () => {
    const zones = [{ _id: ZONE_ID, code: 'NORTE', name: 'Zona Norte', active: true }]
    get.mockResolvedValue({ data: zones })

    await expect(routePlanService.getActiveDeliveryZones()).resolves.toEqual(zones)
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('/deliveryZone', { params: { active: 'true' } })
  })

  it('maps the candidate query to the candidates endpoint', async () => {
    const result = { eligible: [], blocked: [], ruleVersion: 'candidate-eligibility-v1' }
    get.mockResolvedValue({ data: result })

    const params = { serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID }

    await expect(routePlanService.getCandidates(params)).resolves.toEqual(result)
    expect(get).toHaveBeenCalledWith('/routePlan/candidates', {
      params: { serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID },
    })
  })

  it('propagates request failures to the caller instead of swallowing them', async () => {
    get.mockRejectedValue(new Error('network down'))

    await expect(
      routePlanService.getCandidates({ serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID })
    ).rejects.toThrow('network down')
  })

  it('maps the preview request to POST /routePlan/preview with the selected sales', async () => {
    const preview = {
      route: {
        depot: { id: 'deposito_1', name: 'Depósito', latitude: -34.6, longitude: -58.4 },
        stops: [],
        segments: [],
        encodedPolyline: 'abc',
      },
      metrics: { distanceMeters: 0, durationSeconds: 0, stopCount: 0, fuelLiters: 0 },
      warnings: [],
      factorsConsidered: [],
      algorithmVersion: 'nearest-neighbor-2opt-v1',
      algorithmProvider: 'google-routes',
      routingConfigRevision: 1,
      ruleVersion: 'candidate-eligibility-v1',
    }
    post.mockResolvedValue({ data: preview })

    const params = { serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID, saleIds: [SALE_ID] }

    await expect(routePlanService.preview(params)).resolves.toEqual(preview)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith('/routePlan/preview', {
      serviceDate: '2026-10-04',
      deliveryZoneId: ZONE_ID,
      saleIds: [SALE_ID],
    })
  })

  it('propagates preview failures to the caller instead of swallowing them', async () => {
    post.mockRejectedValue(new Error('provider down'))

    await expect(
      routePlanService.preview({ serviceDate: '2026-10-04', deliveryZoneId: ZONE_ID, saleIds: [SALE_ID] })
    ).rejects.toThrow('provider down')
  })
})
