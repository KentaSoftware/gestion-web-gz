import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GeocodingDialog } from './GeocodingDialog'

const { geocode, confirmLocation } = vi.hoisted(() => ({ geocode: vi.fn(), confirmLocation: vi.fn() }))
vi.mock('@/services/client.service', () => ({ clientService: { geocode, confirmLocation } }))
vi.mock('@/hooks/usePermission', () => ({ usePermission: () => ({ hasPermission: () => true, hydrating: false }) }))

describe('GeocodingDialog', () => {
  it('explains that no candidates block routing without inventing coordinates', async () => {
    geocode.mockResolvedValue({ candidates: [] })
    render(<GeocodingDialog open clientId="client-1" address="Calle 1" onOpenChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(screen.getByText(/destino seguirá bloqueado/i)).toBeInTheDocument())
    expect(screen.queryByText(/latitud|longitud/i)).not.toBeInTheDocument()
  })
})
