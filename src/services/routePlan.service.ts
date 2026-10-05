import apiClient from '@/utils/client'
import type {
  CandidateQueryParams,
  CandidateResult,
  DeliveryZone,
  RoutePreview,
  RoutePreviewRequest,
} from '@/interfaces/routePlan.interface'

const DELIVERY_ZONE_URL = '/deliveryZone'
const CANDIDATES_URL = '/routePlan/candidates'
const PREVIEW_URL = '/routePlan/preview'

/**
 * HTTP client for route planning (T-F.2 candidate review, T-F.4 preview).
 *
 * Read calls require `read_route_plan`; preview requires `create_route_plan`.
 * The service exposes no save snapshot operation: preview must not mutate sales
 * or persist plans. Request failures propagate unchanged so callers keep the
 * existing apiClient error behavior.
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

  /**
   * Deterministic route preview for the selected sales of one service date and
   * zone. The backend groups selected sales by client and returns ordered stops.
   * Requires: create_route_plan permission.
   */
  preview: async ({
    serviceDate,
    deliveryZoneId,
    saleIds,
  }: RoutePreviewRequest): Promise<RoutePreview> => {
    const response = await apiClient.post<RoutePreview>(PREVIEW_URL, {
      serviceDate,
      deliveryZoneId,
      saleIds,
    })
    return response.data
  },
}
