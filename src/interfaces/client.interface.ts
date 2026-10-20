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

export interface ClientLocationConfirmation {
  candidate: GeocodingCandidate
}

export interface ClientLocationConfirmationResponse {
  _id?: string
  address?: string
  lat?: number
  lng?: number
}
