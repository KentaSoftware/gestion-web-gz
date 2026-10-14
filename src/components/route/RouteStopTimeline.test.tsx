import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteStopTimeline } from './RouteStopTimeline'

describe('RouteStopTimeline', () => {
  it('renders the depot first and formats each arriving segment', () => {
    render(
      <RouteStopTimeline
        depot={{ name: 'Depósito Central', address: 'Av. Central 123' }}
        stops={[{ clientId: 'client-1', saleIds: ['sale-1'], latitude: 0, longitude: 0, displayName: 'Cliente Uno', addressSummary: 'Calle 1' }]}
        segments={[{ fromId: 'deposito_1', toId: 'client-1', distanceMeters: 1250, durationSeconds: 330 }]}
      />,
    )

    const rows = within(screen.getByRole('list', { name: 'Paradas del recorrido' })).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Depósito Central')
    expect(rows[0]).toHaveTextContent('0 km')
    expect(rows[0]).toHaveTextContent('0 pedidos')
    expect(rows[1]).toHaveTextContent('Cliente Uno · Calle 1')
    expect(rows[1]).toHaveTextContent('1,3 km')
    expect(rows[1]).toHaveTextContent('6 min')
  })

  it('falls back to identifiers and unavailable addresses', () => {
    render(<RouteStopTimeline stops={[{ clientId: 'client-legacy', saleIds: [], latitude: 0, longitude: 0 }]} />)
    expect(screen.getAllByText(/Dirección no disponible/).length).toBeGreaterThan(0)
    expect(screen.getByText(/client-legacy/)).toBeInTheDocument()
  })
})
