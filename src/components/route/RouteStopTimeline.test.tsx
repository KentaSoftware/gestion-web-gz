import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteStopTimeline } from './RouteStopTimeline'

describe('RouteStopTimeline', () => {
  it('renders the depot marker first with zero metrics and each arriving segment', () => {
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
    expect(screen.getByLabelText('Depósito')).toBeInTheDocument()
    expect(rows[1]).toHaveTextContent('Cliente: Cliente Uno')
    expect(rows[1]).toHaveTextContent('Calle 1')
    expect(rows[1]).toHaveTextContent('1,3 km')
    expect(rows[1]).toHaveTextContent('6 min')
  })

  it('uses circular markers, preserves backend order, and keeps order/address details', () => {
    render(
      <RouteStopTimeline
        stops={[
          { clientId: 'client-2', saleIds: ['sale-2', 'sale-3'], latitude: 0, longitude: 0, displayName: 'Segundo', addressSummary: 'Calle 2' },
          { clientId: 'client-1', saleIds: ['sale-1'], latitude: 0, longitude: 0, displayName: 'Primero', addressSummary: 'Calle 1' },
        ]}
      />,
    )

    const rows = within(screen.getByRole('list', { name: 'Paradas del recorrido' })).getAllByRole('listitem')
    expect(rows[1]).toHaveTextContent('Segundo')
    expect(rows[1]).toHaveTextContent('Calle 2')
    expect(rows[2]).toHaveTextContent('Primero')
    expect(rows[2]).toHaveTextContent('Calle 1')
    expect(screen.getByLabelText('Parada 1')).toHaveTextContent('1')
    expect(screen.getByLabelText('Parada 2')).toHaveTextContent('2')
    expect(rows[1]).toHaveTextContent('2 pedidos')
    expect(rows[2]).toHaveTextContent('1 pedido')
  })

  it('reports unavailable metrics when the arriving segment is absent', () => {
    render(<RouteStopTimeline stops={[{ clientId: 'client-1', saleIds: [], latitude: 0, longitude: 0 }]} segments={[]} />)

    const row = within(screen.getByRole('list', { name: 'Paradas del recorrido' })).getAllByRole('listitem')[1]
    expect(row).toHaveTextContent('No disponible')
  })

  it('falls back to identifiers and unavailable addresses', () => {
    render(<RouteStopTimeline stops={[{ clientId: 'client-legacy', saleIds: [], latitude: 0, longitude: 0 }]} />)
    expect(screen.getAllByText(/Dirección no disponible/).length).toBeGreaterThan(0)
    expect(screen.getByText(/client-legacy/)).toBeInTheDocument()
  })
})
