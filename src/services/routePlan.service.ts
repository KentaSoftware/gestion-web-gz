import apiClient from '@/utils/client'
import type {
  CandidateQueryParams,
  CandidateResult,
  DeliveryZone,
  RouteAssignmentOptions,
  RouteDashboard,
  RouteDashboardQuery,
  RoutePlan,
  RoutePlanSaveRequest,
  RoutePreview,
  RoutePreviewRequest,
  RoutingConfig,
  RoutingConfigUpdateInput,
} from '@/interfaces/routePlan.interface'

const DELIVERY_ZONE_URL = '/deliveryZone'
const CANDIDATES_URL = '/routePlan/candidates'
const DASHBOARD_URL = '/routePlan/dashboard'
const ASSIGNMENT_OPTIONS_URL = '/routePlan/assignment-options'
const PREVIEW_URL = '/routePlan/preview'
const ROUTE_PLAN_URL = '/routePlan'
const ROUTE_CONFIG_URL = '/routePlan/config'

/**
 * HTTP client for route planning (T-F.2 candidate review, T-F.4 preview,
 * T-F.6 saved plans).
 *
 * Route-flow calls remain authenticated API requests; frontend route access is
 * intentionally not gated by route-specific permissions for now. Saving
 * persists the current preview immediately and returns the immutable snapshot;
 * reading returns the stored snapshot only and never recomputes the route or
 * calls the provider. Request failures propagate unchanged so callers keep the
 * existing apiClient error behavior.
 */
export const routePlanService = {
  /**
   * Active delivery zones available for planning.
   * Requires an authenticated API session.
   */
  getActiveDeliveryZones: async (): Promise<DeliveryZone[]> => {
    const response = await apiClient.get<DeliveryZone[]>(DELIVERY_ZONE_URL, {
      params: { active: 'true' },
    })
    return response.data
  },

  /**
   * Reads the dashboard aggregate. The backend owns KPI aggregation and keeps
   * unavailable fuel metrics explicitly null; the client does not infer or
   * replace those values.
   */
  getDashboard: async (query: RouteDashboardQuery): Promise<RouteDashboard> => {
    const response = await apiClient.get<RouteDashboard>(DASHBOARD_URL, { params: query })
    return {
      ...response.data,
      routes: response.data.routes.map((route) => ({
        ...route,
        metrics: {
          ...route.metrics,
          fuelLiters: route.metrics.fuelLiters ?? null,
        },
      })),
    }
  },

  getConfig: async (): Promise<RoutingConfig> => {
    const response = await apiClient.get<RoutingConfig>(ROUTE_CONFIG_URL)
    return response.data
  },

  updateConfig: async (input: RoutingConfigUpdateInput): Promise<RoutingConfig> => {
    const response = await apiClient.patch<RoutingConfig>(ROUTE_CONFIG_URL, input)
    return response.data
  },

  /** Assignment options for the Phase 2 preview/save contract. */
  getAssignmentOptions: async (): Promise<RouteAssignmentOptions> => {
    const response = await apiClient.get<RouteAssignmentOptions>(ASSIGNMENT_OPTIONS_URL)
    return response.data
  },

  /**
   * Eligible and blocked candidates for a civil service date and zone.
    * Requires an authenticated API session.
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
    * Requires an authenticated API session.
   */
  preview: async ({
    serviceDate,
    deliveryZoneId,
    saleIds,
    driverId,
    vehicleId,
  }: RoutePreviewRequest): Promise<RoutePreview> => {
    const response = await apiClient.post<RoutePreview>(PREVIEW_URL, {
      serviceDate,
      deliveryZoneId,
      saleIds,
      ...(driverId !== undefined ? { driverId } : {}),
      ...(vehicleId !== undefined ? { vehicleId } : {}),
    })
    return response.data
  },

  /**
   * Persists the current preview as an immutable snapshot and returns it.
   * The backend recomputes and validates the preview before saving; there is no
    * partial save. Requires an authenticated API session.
   */
  save: async ({
    serviceDate,
    deliveryZoneId,
    saleIds,
    driverId,
    vehicleId,
  }: RoutePlanSaveRequest): Promise<RoutePlan> => {
    const response = await apiClient.post<RoutePlan>(ROUTE_PLAN_URL, {
      serviceDate,
      deliveryZoneId,
      saleIds,
      ...(driverId !== undefined ? { driverId } : {}),
      ...(vehicleId !== undefined ? { vehicleId } : {}),
    })
    return response.data
  },

  /**
   * Reads one stored snapshot by identifier. This never recomputes the route or
   * calls the routing provider: saved plans remain viewable when providers are
    * unavailable. Requires an authenticated API session.
   */
  getById: async (id: string): Promise<RoutePlan> => {
    const response = await apiClient.get<RoutePlan>(`${ROUTE_PLAN_URL}/${id}`)
    return response.data
  },
}
