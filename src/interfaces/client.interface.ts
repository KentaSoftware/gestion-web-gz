export interface GeocodingCandidate {
  formattedAddress: string
  placeId: string
  precision: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE'
  lat: number
  lng: number
}

export interface GeocodingResult {
  candidates: GeocodingCandidate[]
}

export interface CandidateLocationConfirmation {
  candidate: GeocodingCandidate
  expectedLocation: ClientLocationSnapshot
}

export interface ManualLocationReference {
  address: string
  lat: number
  lng: number
}

export interface ManualLocationConfirmation {
  manualReference: ManualLocationReference
  expectedLocation: ClientLocationSnapshot
}

export interface ClientLocationSnapshot {
  address: string | null
  lat: number | null
  lng: number | null
  locationRevision: number
}

export interface ManualConfirmedLocation {
  lat: number
  lng: number
}

export interface ConfirmManualLocation {
  manualConfirmation: ManualConfirmedLocation
  expectedLocation: ClientLocationSnapshot
}

export type ClientLocationConfirmation = CandidateLocationConfirmation | ManualLocationConfirmation | ConfirmManualLocation

export interface ClientGeocodingStatus {
  status: string
}

export interface ClientLocationConfirmationResponse {
  _id?: string
  address?: string
  lat?: number
  lng?: number
  geocoding?: ClientGeocodingStatus
}
export interface SaleClientOption {
  id: string
  name: string
  address?: string
}

export interface SaleClientOptionsResponse {
  clients: SaleClientOption[]
}

export interface SaleClientOptionsPage extends SaleClientOptionsResponse {
  nextCursor: string | null
}
