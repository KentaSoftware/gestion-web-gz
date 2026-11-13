import apiClient from '@/utils/client'
import type { ClientLocationConfirmation, GeocodingResult, ClientLocationConfirmationResponse } from '@/interfaces/client.interface'
import type { SaleClientOption, SaleClientOptionsResponse, SaleClientOptionsPage } from '@/interfaces/client.interface'

export const clientService = {
  saleOptionsPage: async (query: string, cursor?: string): Promise<SaleClientOptionsPage> => {
    const response = await apiClient.get<SaleClientOptionsPage>('/client/sale-options', { params: { paged: true, q: query.trim(), limit: 50, ...(cursor ? { cursor } : {}) } })
    return response.data
  },
  saleOptions: async (query: string): Promise<SaleClientOption[]> => {
    const response = await apiClient.get<SaleClientOptionsResponse>('/client/sale-options', { params: { q: query.trim() } })
    return response.data.clients
  },
  geocode: async (clientId: string, address?: string): Promise<GeocodingResult> => {
    const response = await apiClient.post<GeocodingResult>(`/client/${clientId}/geocode`, address === undefined ? {} : { address })
    return response.data
  },

  confirmLocation: async (clientId: string, input: ClientLocationConfirmation): Promise<ClientLocationConfirmationResponse> => {
    const response = await apiClient.post<ClientLocationConfirmationResponse>(`/client/${clientId}/location-confirmation`, input)
    return response.data
  },
}
