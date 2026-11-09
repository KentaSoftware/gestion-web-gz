import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/utils/client', () => ({ default: { post } }))
import { clientService } from './client.service'

describe('clientService geocoding', () => {
  beforeEach(() => post.mockReset())
  it('searches candidates through the backend contract', async () => {
    post.mockResolvedValue({ data: { candidates: [] } })
    await expect(clientService.geocode('client-1', 'Calle 1')).resolves.toEqual({ candidates: [] })
    expect(post).toHaveBeenCalledWith('/client/client-1/geocode', { address: 'Calle 1' })
  })
  it('confirms an explicit candidate', async () => {
    const candidate = { formattedAddress: 'Calle 1', placeId: 'place-1', precision: 'ROOFTOP' as const, lat: -34, lng: -58 }
    post.mockResolvedValue({ data: { _id: 'client-1' } })
    await clientService.confirmLocation('client-1', { candidate })
    expect(post).toHaveBeenCalledWith('/client/client-1/location-confirmation', { candidate })
  })
  it('sends manual coordinates without converting zero to missing', async () => {
    post.mockResolvedValue({ data: { geocoding: { status: 'PENDING' } } })
    const manualReference = { address: 'Calle 1', lat: 0, lng: 0 }
    await expect(clientService.confirmLocation('client-1', { manualReference })).resolves.toEqual({ geocoding: { status: 'PENDING' } })
    expect(post).toHaveBeenCalledWith('/client/client-1/location-confirmation', { manualReference })
  })
})
