import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/utils/client', () => ({ default: { get } }))

import { routePlanService } from './routePlan.service'

const ZONE_ID = 'a'.repeat(24)

describe('routePlanService', () => {
  beforeEach(() => {
    get.mockReset()
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
})
