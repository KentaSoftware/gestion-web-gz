import apiClient from '@/utils/client'
import type {
  CandidateQueryParams,
  CandidateResult,
  DeliveryZone,
} from '@/interfaces/routePlan.interface'

const DELIVERY_ZONE_URL = '/deliveryZone'
const CANDIDATES_URL = '/routePlan/candidates'

/**
 * Read-only HTTP client for route candidate review (T-F.2).
 *
 * Both calls require the `read_route_plan` permission on the backend. The
 * service deliberately exposes no preview or save operation: candidate review
 * must not mutate sales or persist plans.
 */
export const routePlanService = {
  /**
   * Active delivery zones available for planning.
   * Requires: read_route_plan permission.
   */
  getActiveDeliveryZones: async (): Promise<DeliveryZone[]> => {
    const response = await apiClient.get<DeliveryZone[]>(DELIVERY_ZONE_URL, {
      params: { active: 'true' },
    })
    return response.data
  },

  /**
   * Eligible and blocked candidates for a civil service date and zone.
   * Requires: read_route_plan permission.
   */
  getCandidates: async ({
    serviceDate,
    deliveryZoneId,
  }: CandidateQueryParams): Promise<CandidateResult> => {
    const response = await apiClient.get<CandidateResult>(CANDIDATES_URL, {
      params: { serviceDate, deliveryZoneId },
    })
    return response.data
  },
}
