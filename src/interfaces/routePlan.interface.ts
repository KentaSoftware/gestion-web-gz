/**
 * Route planning client contracts (T-F.2/T-F.3 candidate review, T-F.4 preview).
 *
 * Mirrors the contracts exposed by gzapi: the active delivery-zone catalogue,
 * the candidate eligibility result and the deterministic preview response.
 * Preview does not mutate sales or persist plans; saved snapshots belong to a
 * later work unit and are intentionally absent here.
 */

/** Stable block reasons returned by the backend eligibility classifier. */
export const CANDIDATE_BLOCK_REASON = {
  INVALID_CLIENT_REFERENCE: 'INVALID_CLIENT_REFERENCE',
  CLIENT_INACTIVE: 'CLIENT_INACTIVE',
  CLIENT_ZONE_MISMATCH: 'CLIENT_ZONE_MISMATCH',
  CLIENT_LOCATION_MISSING: 'CLIENT_LOCATION_MISSING',
  CLIENT_LOCATION_UNCONFIRMED: 'CLIENT_LOCATION_UNCONFIRMED',
} as const

export type CandidateBlockReason = (typeof CANDIDATE_BLOCK_REASON)[keyof typeof CANDIDATE_BLOCK_REASON]

/**
 * Presentation labels for the stable reasons. Unknown codes fall back to the
 * raw code so a new backend reason is never silently hidden.
 */
export const CANDIDATE_BLOCK_REASON_LABEL: Readonly<Record<CandidateBlockReason, string>> = {
  INVALID_CLIENT_REFERENCE: 'La venta no tiene un cliente válido',
  CLIENT_INACTIVE: 'El cliente está inactivo',
  CLIENT_ZONE_MISMATCH: 'El cliente no pertenece a la zona seleccionada',
  CLIENT_LOCATION_MISSING: 'El cliente no tiene una ubicación cargada',
  CLIENT_LOCATION_UNCONFIRMED: 'La ubicación del cliente no está confirmada',
}

/** Active delivery zone as returned by `GET /deliveryZone`. */
export interface DeliveryZone {
  _id: string
  code: string
  name: string
  active: boolean
}

/** A candidate that passed every eligibility rule. */
export interface CandidateEntry {
  saleId: string
  clientId?: string
  displayName?: string
  addressSummary?: string
  zoneName?: string
  latitude?: number
  longitude?: number
  distanceMeters?: number
}

/** A candidate that was excluded with at least one stable reason. */
export interface BlockedCandidateEntry extends CandidateEntry {
  reasons: CandidateBlockReason[]
}

/** Full eligibility result returned by `GET /routePlan/candidates`. */
export interface CandidateResult {
  eligible: CandidateEntry[]
  blocked: BlockedCandidateEntry[]
  ruleVersion: string
}

/** Query parameters accepted by the candidates endpoint. */
export interface CandidateQueryParams {
  serviceDate: string
  deliveryZoneId: string
}

export const ROUTE_OPERATIONAL_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const

export type RouteOperationalStatus = (typeof ROUTE_OPERATIONAL_STATUS)[keyof typeof ROUTE_OPERATIONAL_STATUS]

export interface RouteDashboardGlobalQuery {
  status?: RouteOperationalStatus
}

export interface RouteDashboardScopedQuery {
  serviceDate: string
  zoneCode: string
  status?: RouteOperationalStatus
}

export type RouteDashboardQuery = RouteDashboardGlobalQuery | RouteDashboardScopedQuery

export interface RouteDashboardKpis {
  activeRoutes: number
  pendingOrders: number
  totalDistanceMeters: number | null
  estimatedFuelLiters: number | null
}

export interface RouteOperationalAssignment {
  driverId?: string
  vehicleId?: string
}

export const ROUTE_METRIC_AVAILABILITY = {
  CALCULATED: 'CALCULATED',
  ESTIMATED: 'ESTIMATED',
  OPERATIONAL: 'OPERATIONAL',
  UNAVAILABLE: 'UNAVAILABLE',
} as const

export type RouteMetricAvailability = (typeof ROUTE_METRIC_AVAILABILITY)[keyof typeof ROUTE_METRIC_AVAILABILITY]

export interface RouteDashboardStop {
  clientId: string
  saleIds: string[]
  sequence: number
  latitude: number
  longitude: number
}

export interface RouteDashboardSegment {
  fromStopSequence: number
  toStopSequence: number
  distanceMeters: number
  durationSeconds: number
}

export interface RouteFuelAssumptions {
  availability: RouteMetricAvailability
  consumptionLitersPer100Km: number | null
  distanceKm: number
  vehicleCode: string | null
  source: string
  calculatedAt: string
}

export interface RouteScheduleAssumptions {
  calculatedAt: string
  timezone: string
  source: string
}

export interface RouteStopEstimate {
  sequence: number
  arrival: string | null
  cumulativeDurationSeconds: number | null
  calculatedAt?: string
  timezone?: string
  availability?: RouteMetricAvailability
}

export interface RouteSaleReference {
  saleId: string
  versionAtSave?: number | null
  statusAtSave?: string | null
  currentVersion?: number | null
  currentStatus?: string | null
  clientName?: string
  address?: string
  zoneName?: string
  itemCount?: number
  productCount?: number
  unitCount?: number
}

export interface RouteDashboardCard {
  id: string
  status: RouteOperationalStatus
  zoneCode: string
  selectedSaleIds: string[]
  clientCount: number
  metrics: {
    distanceMeters: number
    durationSeconds: number
    fuelLiters: number | null
  }
  assignments: RouteOperationalAssignment
  warnings: string[]
  stale: boolean
  depot?: RoutingDepot
  encodedPolyline?: string
  stops?: RouteDashboardStop[]
  segments?: RouteDashboardSegment[]
  metricAvailability?: RouteMetricAvailability
  fuelAssumptions?: RouteFuelAssumptions
  scheduleAssumptions?: RouteScheduleAssumptions
  stopEstimates?: RouteStopEstimate[]
  saleReferences?: RouteSaleReference[]
  staleCauses?: string[]
}

export const ROUTE_MAP_LOCATION_STATUS = {
  ORDER: 'ORDER',
  NO_ORDER: 'NO_ORDER',
  EXCLUDED: 'EXCLUDED',
} as const

export type RouteMapLocationStatus = (typeof ROUTE_MAP_LOCATION_STATUS)[keyof typeof ROUTE_MAP_LOCATION_STATUS]

export interface RouteMapLocation {
  clientId: string
  displayName: string
  addressSummary?: string
  latitude: number
  longitude: number
  status: RouteMapLocationStatus
}

export interface RouteDashboard {
  filters: RouteDashboardQuery
  kpis: RouteDashboardKpis
  routes: RouteDashboardCard[]
  candidates: CandidateResult
  warnings: string[]
  mapLocations?: RouteMapLocation[]
}

export interface RoutingDepot {
  name: string
  address?: string
  latitude: number
  longitude: number
}

export interface RoutingConfig {
  key: string
  enabled: boolean
  revision: number
  depot: RoutingDepot
  fuelConsumptionLitersPer100Km?: number
  maxStops?: number
  provider: string
  algorithm: string
  updatedBy?: string
}

export interface RoutingConfigUpdateInput {
  depot: RoutingDepot
  fuelConsumptionLitersPer100Km?: number
  routeMode: string
  algorithm?: string
  maxStops?: number
  enabled?: boolean
}

export interface SelectableDriver {
  id: string
  nickname: string
  isActive: boolean
}

export interface SelectableVehicle {
  id: string
  code: string
  fuelConsumptionLitersPer100Km: number
  attributes: Record<string, string>
  availability: boolean
}

export interface RouteAssignmentOptions {
  drivers: SelectableDriver[]
  vehicles: SelectableVehicle[]
}

/**
 * Stable warning codes returned with a route preview. A warning never fails the
 * preview: the calculated data is still returned and must stay visible.
 */
export const ROUTE_PREVIEW_WARNING = {
  TIME_WINDOWS_NOT_CONSIDERED: 'TIME_WINDOWS_NOT_CONSIDERED',
  MAP_UNAVAILABLE: 'MAP_UNAVAILABLE',
} as const

export type RoutePreviewWarning = (typeof ROUTE_PREVIEW_WARNING)[keyof typeof ROUTE_PREVIEW_WARNING]

/** Presentation labels for warnings. Unknown codes fall back to the raw code. */
export const ROUTE_PREVIEW_WARNING_LABEL: Readonly<Record<string, string>> = {
  TIME_WINDOWS_NOT_CONSIDERED: 'No se consideran ventanas horarias.',
  MAP_UNAVAILABLE: 'La visualización en mapa no está disponible. Se muestra el recorrido como lista.',
}

/** Presentation labels for the factor codes the backend reports as considered. */
export const ROUTE_FACTOR_LABEL: Readonly<Record<string, string>> = {
  DISTANCE: 'Distancia',
  DURATION: 'Duración',
  FUEL_CONSUMPTION: 'Consumo de combustible',
}

/** Stable preview error codes emitted by the backend error envelope. */
export const ROUTE_PREVIEW_ERROR = {
  NO_ELIGIBLE_ORDERS: 'NO_ELIGIBLE_ORDERS',
  CLIENT_LOCATION_MISSING: 'CLIENT_LOCATION_MISSING',
  CLIENT_LOCATION_AMBIGUOUS: 'CLIENT_LOCATION_AMBIGUOUS',
  ROUTE_TECHNICAL_LIMIT_EXCEEDED: 'ROUTE_TECHNICAL_LIMIT_EXCEEDED',
  ROUTE_MATRIX_INCOMPLETE: 'ROUTE_MATRIX_INCOMPLETE',
  ROUTING_PROVIDER_UNAVAILABLE: 'ROUTING_PROVIDER_UNAVAILABLE',
  ROUTING_PROVIDER_QUOTA_EXCEEDED: 'ROUTING_PROVIDER_QUOTA_EXCEEDED',
  INVALID_ROUTE_INPUT: 'INVALID_ROUTE_INPUT',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
} as const

export type RoutePreviewErrorCode = (typeof ROUTE_PREVIEW_ERROR)[keyof typeof ROUTE_PREVIEW_ERROR]

/** Presentation labels for preview errors, keyed by the stable backend code. */
export const ROUTE_PREVIEW_ERROR_LABEL: Readonly<Record<string, string>> = {
  NO_ELIGIBLE_ORDERS: 'Las ventas seleccionadas no son elegibles para planificar el recorrido.',
  CLIENT_LOCATION_MISSING: 'Un cliente seleccionado no tiene una ubicación válida.',
  CLIENT_LOCATION_AMBIGUOUS: 'La ubicación de un cliente seleccionado no está confirmada.',
  ROUTE_TECHNICAL_LIMIT_EXCEEDED: 'El recorrido supera el límite técnico de paradas configurado.',
  ROUTE_MATRIX_INCOMPLETE: 'No se pudo calcular la matriz completa de distancias.',
  ROUTING_PROVIDER_UNAVAILABLE: 'El proveedor de rutas no está disponible. Intentá nuevamente más tarde.',
  ROUTING_PROVIDER_QUOTA_EXCEEDED: 'Se excedió la cuota del proveedor de rutas. Intentá nuevamente más tarde.',
  INVALID_ROUTE_INPUT: 'Los datos para calcular el recorrido no son válidos.',
  INVALID_CONFIGURATION: 'La configuración de rutas no está lista para calcular el recorrido.',
}

/**
 * Resolves a user-facing preview message from a stable error code. Unknown
 * codes fall back to the backend message, then to a generic retry message, so a
 * new backend error is never hidden.
 */
export const routePreviewErrorMessage = (code: string | null | undefined, fallback?: string): string => {
  if (code !== null && code !== undefined && ROUTE_PREVIEW_ERROR_LABEL[code] !== undefined) {
    return ROUTE_PREVIEW_ERROR_LABEL[code]
  }
  return fallback !== undefined && fallback !== '' ? fallback : 'No se pudo calcular el recorrido. Intentá nuevamente.'
}

/** Error envelope returned by the backend for a rejected preview. */
export interface RoutePreviewErrorResponse {
  code: string
  message: string
  correlationId?: string
}

/** Depot endpoint of the calculated route, always `deposito_1`. */
export interface RoutePreviewDepot {
  id: string
  name: string
  address?: string
  latitude: number
  longitude: number
}

/** One ordered stop, grouping every selected sale of a single client. */
export interface RoutePreviewStop {
  clientId: string
  saleIds: string[]
  latitude: number
  longitude: number
}

/** One leg of the route between two locations. */
export interface RoutePreviewSegment {
  fromId: string
  toId: string
  distanceMeters: number
  durationSeconds: number
}

export interface RoutePreviewMetrics {
  distanceMeters: number
  durationSeconds: number
  stopCount: number
  fuelLiters: number | null
}

/**
 * Deterministic route preview returned by `POST /routePlan/preview`.
 *
 * `route.stops` is already ordered by the backend heuristic; the client must
 * render it as received and never reorder it.
 */
export interface RoutePreview {
  route: {
    depot: RoutePreviewDepot
    stops: RoutePreviewStop[]
    segments: RoutePreviewSegment[]
    encodedPolyline: string
  }
  metrics: RoutePreviewMetrics
  /** Optional enrichment returned by newer preview responses. */
  stopEstimates?: RouteStopEstimate[]
  saleReferences?: RouteSaleReference[]
  warnings: string[]
  factorsConsidered: string[]
  algorithmVersion: string
  algorithmProvider: string
  routingConfigRevision: number
  ruleVersion: string
}

/** Body accepted by the preview endpoint. */
export interface RoutePreviewRequest {
  serviceDate: string
  deliveryZoneId: string
  saleIds: string[]
  driverId?: string
  vehicleId?: string
}

/**
 * Saved-route-plan contracts (T-F.6).
 *
 * These mirror the immutable snapshot persisted by the backend on
 * `POST /routePlan` and read back on `GET /routePlan/:id`. A snapshot is
 * append-only: it stores the zone, the selected sales, the ordered stops,
 * segments, metrics, warnings and the algorithm/rule revisions that produced
 * it. Rendering must preserve the stored order and never recompute the route.
 */

/** Frozen delivery-zone identity stored with a saved plan. */
export interface RoutePlanZoneSnapshot {
  readonly code: string
  readonly normalizedName: string
  readonly name: string
}

/** Depot endpoint stored with a saved plan (always `deposito_1`). */
export interface RoutePlanDepot {
  readonly name: string
  readonly address?: string
  readonly latitude: number
  readonly longitude: number
}

/** One ordered stop, grouping every selected sale of a single client. */
export interface RoutePlanStop {
  readonly clientId: string
  readonly saleIds: readonly string[]
  readonly sequence: number
  readonly latitude: number
  readonly longitude: number
}

/** One leg of the stored route, keyed by server stop sequence (`0` = depot). */
export interface RoutePlanSegment {
  readonly fromStopSequence: number
  readonly toStopSequence: number
  readonly distanceMeters: number
  readonly durationSeconds: number
}

/** Algorithm identity that produced the saved plan. */
export interface RoutePlanAlgorithm {
  readonly name: string
  readonly version: string
  readonly provider: string
}

/** Audit metadata: who saved the plan and when. */
export interface RoutePlanAudit {
  readonly createdBy: string
  readonly createdAt: string
}

/**
 * Immutable route-plan snapshot returned by the save and get-by-id endpoints.
 * Array order is the server order and must be rendered as received.
 */
export interface RoutePlan {
  readonly _id?: string
  readonly snapshotVersion: number
  readonly planningDate: string
  readonly zoneSnapshot: RoutePlanZoneSnapshot
  readonly selectedSaleIds: readonly string[]
  readonly depot: RoutePlanDepot
  readonly stops: readonly RoutePlanStop[]
  readonly segments: readonly RoutePlanSegment[]
  readonly metrics: RoutePreviewMetrics
  readonly algorithm: RoutePlanAlgorithm
  readonly routingConfigRevision: number
  readonly ruleVersion: string
  readonly encodedPolyline: string
  readonly warnings: readonly string[]
  readonly audit: RoutePlanAudit
  readonly saleReferences?: readonly RouteSaleReference[]
  readonly createdAt?: string
}

/** Body accepted by the save endpoint (`POST /routePlan`). */
export type RoutePlanSaveRequest = RoutePreviewRequest

/**
 * Stable error codes emitted by the backend when saving or reading a snapshot.
 * Save can also surface any {@link ROUTE_PREVIEW_ERROR} code because the backend
 * recomputes the preview before persisting.
 */
export const ROUTE_PLAN_ERROR = {
  ROUTE_PLAN_NOT_FOUND: 'ROUTE_PLAN_NOT_FOUND',
} as const

export type RoutePlanErrorCode = (typeof ROUTE_PLAN_ERROR)[keyof typeof ROUTE_PLAN_ERROR]

/** Presentation labels for plan errors, layered over the preview labels. */
export const ROUTE_PLAN_ERROR_LABEL: Readonly<Record<string, string>> = {
  ...ROUTE_PREVIEW_ERROR_LABEL,
  ROUTE_PLAN_NOT_FOUND: 'No encontramos el plan de ruta guardado.',
}

/**
 * Resolves a user-facing plan message from a stable error code. Unknown codes
 * fall back to the backend message, then to a generic retry message, so a new
 * backend error is never hidden.
 */
export const routePlanErrorMessage = (code: string | null | undefined, fallback?: string): string => {
  if (code !== null && code !== undefined && ROUTE_PLAN_ERROR_LABEL[code] !== undefined) {
    return ROUTE_PLAN_ERROR_LABEL[code]
  }
  return (
    fallback !== undefined && fallback !== ''
      ? fallback
      : 'No se pudo completar la operación con el plan de ruta. Intentá nuevamente.'
  )
}
