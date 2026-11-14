import apiClient from '@/utils/client'
import type { ClientLocationConfirmation, GeocodingResult, ClientLocationConfirmationResponse, ClientLocationSnapshot } from '@/interfaces/client.interface'
import type { SaleClientOption, SaleClientOptionsResponse, SaleClientOptionsPage } from '@/interfaces/client.interface'
import type { ManagedClient, ManagedClientInput } from '@/interfaces/client.interface'

export interface ClientZone {
  _id: string
  name: string
  active: boolean
}

export const clientService = {
  list: async (input: string, skip: number, limit: number): Promise<ManagedClient[]> => {
    const response = await apiClient.post<ManagedClient[]>(input ? '/client/search' : '/client/skip', input ? { input, skip, limit } : { skip, limit })
    return response.data
  },
  zones: async (): Promise<ClientZone[]> => (await apiClient.get<ClientZone[]>('/deliveryZone')).data,
  create: async (input: ManagedClientInput): Promise<void> => { await apiClient.post('/client', input) },
  update: async (id: string, input: Partial<ManagedClientInput>): Promise<void> => {
    const response = await apiClient.patch<{ matchedCount: number }>(`/client/${id}/managed`, input)
    if (response.data.matchedCount !== 1) throw new Error('Client not found')
  },
  locationSnapshot: async (clientId: string): Promise<ClientLocationSnapshot> => {
    const response = await apiClient.get<ClientLocationSnapshot>(`/client/${clientId}/location-snapshot`, { headers: { 'Cache-Control': 'no-store' } })
    return response.data
  },
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
