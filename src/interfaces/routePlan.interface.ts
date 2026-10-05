/**
 * Route planning client contracts (T-F.2/T-F.3).
 *
 * Mirrors the read-only contracts exposed by gzapi for candidate review: the
 * active delivery-zone catalogue and the candidate eligibility result. Preview
 * and save endpoints belong to later work units and are intentionally absent
 * here so candidate review stays strictly read-only.
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
