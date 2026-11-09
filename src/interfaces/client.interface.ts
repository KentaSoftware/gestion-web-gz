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
}

export interface ManualLocationReference {
  address: string
  lat: number
  lng: number
}

export interface ManualLocationConfirmation {
  manualReference: ManualLocationReference
}

export type ClientLocationConfirmation = CandidateLocationConfirmation | ManualLocationConfirmation

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
