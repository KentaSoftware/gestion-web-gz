import apiClient from '@/utils/client'
import type { ClientLocationConfirmation, GeocodingResult, ClientLocationConfirmationResponse } from '@/interfaces/client.interface'

export const clientService = {
  geocode: async (clientId: string, address?: string): Promise<GeocodingResult> => {
    const response = await apiClient.post<GeocodingResult>(`/client/${clientId}/geocode`, address === undefined ? {} : { address })
    return response.data
  },

  confirmLocation: async (clientId: string, input: ClientLocationConfirmation): Promise<ClientLocationConfirmationResponse> => {
    const response = await apiClient.post<ClientLocationConfirmationResponse>(`/client/${clientId}/location-confirmation`, input)
    return response.data
  },
}
