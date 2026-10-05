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
  fuelLiters: number
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
}
