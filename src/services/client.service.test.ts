import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clientService } from './client.service'
import apiClient from '@/utils/client'

vi.mock('@/utils/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

describe('clientService geocoding', () => {
  beforeEach(() => vi.mocked(apiClient.post).mockReset())
  it('loads the exact location snapshot without caching', async () => {
    const snapshot = { address: null, lat: 0, lng: 0, locationRevision: 2 }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: snapshot })
    await expect(clientService.locationSnapshot('client-1')).resolves.toEqual(snapshot)
    expect(apiClient.get).toHaveBeenCalledWith('/client/client-1/location-snapshot', { headers: { 'Cache-Control': 'no-store' } })
  })
  it('searches candidates through the backend contract', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { candidates: [] } })
    await expect(clientService.geocode('client-1', 'Calle 1')).resolves.toEqual({ candidates: [] })
    expect(apiClient.post).toHaveBeenCalledWith('/client/client-1/geocode', { address: 'Calle 1' })
  })
  it('confirms an explicit candidate', async () => {
    const candidate = { formattedAddress: 'Calle 1', placeId: 'place-1', precision: 'ROOFTOP' as const, lat: -34, lng: -58 }
    const expectedLocation = { address: null, lat: null, lng: null, locationRevision: 0 }
    vi.mocked(apiClient.post).mockResolvedValue({ data: { _id: 'client-1' } })
    await clientService.confirmLocation('client-1', { candidate, expectedLocation })
    expect(apiClient.post).toHaveBeenCalledWith('/client/client-1/location-confirmation', { candidate, expectedLocation })
  })
  it('sends manual coordinates without converting zero to missing', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { geocoding: { status: 'PENDING' } } })
    const manualReference = { address: 'Calle 1', lat: 0, lng: 0 }
    const expectedLocation = { address: null, lat: null, lng: null, locationRevision: 0 }
    await expect(clientService.confirmLocation('client-1', { manualReference, expectedLocation })).resolves.toEqual({ geocoding: { status: 'PENDING' } })
    expect(apiClient.post).toHaveBeenCalledWith('/client/client-1/location-confirmation', { manualReference, expectedLocation })
  })
})

describe('sale client options', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests a paged first page and preserves the continuation cursor', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { clients: [], nextCursor: 'next' } })
    await expect(clientService.saleOptionsPage('')).resolves.toEqual({ clients: [], nextCursor: 'next' })
    expect(apiClient.get).toHaveBeenCalledWith('/client/sale-options', { params: { paged: true, q: '', limit: 50 } })
  })

  it('passes the cursor with a trimmed short query', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { clients: [], nextCursor: null } })
    await clientService.saleOptionsPage(' A ', 'cursor')
    expect(apiClient.get).toHaveBeenCalledWith('/client/sale-options', { params: { paged: true, q: 'A', limit: 50, cursor: 'cursor' } })
  })

  it('requests the bounded authenticated lookup with a trimmed literal prefix', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { clients: [{ id: '123', name: 'Ana', address: 'Calle 1' }] } })
    await expect(clientService.saleOptions(' Ana ')).resolves.toEqual([{ id: '123', name: 'Ana', address: 'Calle 1' }])
    expect(apiClient.get).toHaveBeenCalledWith('/client/sale-options', { params: { q: 'Ana' } })
  })
})
