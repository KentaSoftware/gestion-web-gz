import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { RouteStopTimeline } from './RouteStopTimeline'

describe('RouteStopTimeline', () => {
  it('exposes keyboard accessible bounded movement only when editable', async () => {
    const move = vi.fn()
    const stops = [{ clientId: 'a', saleIds: ['1', '2'], latitude: 0, longitude: 0, displayName: 'Uno' }, { clientId: 'b', saleIds: ['3'], latitude: 0, longitude: 0, displayName: 'Dos' }]
    const { rerender } = render(<RouteStopTimeline stops={stops} onMove={move} />)
    expect(screen.getByRole('button', { name: 'Subir parada 1: Uno' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar parada 2: Dos' })).toBeDisabled()
    const button = screen.getByRole('button', { name: 'Subir parada 2: Dos' })
    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(move).toHaveBeenCalledWith(1, -1)
    rerender(<RouteStopTimeline stops={stops} />)
    expect(screen.queryByRole('button', { name: /Subir parada/ })).not.toBeInTheDocument()
  })
  it('keeps stop labels in a full-width content column and metrics below', () => {
    render(<RouteStopTimeline stops={[{ clientId: 'client-1', saleIds: [], latitude: 0, longitude: 0, displayName: 'Nombre de cliente largo', addressSummary: 'Una dirección larga' }]} />)
    const row = within(screen.getByRole('list', { name: 'Paradas del recorrido' })).getAllByRole('listitem')[1]
    const name = within(row).getByText(/Nombre de cliente largo/)
    expect(name).not.toHaveClass('truncate')
    expect(within(row).getByText('Una dirección larga')).not.toHaveClass('truncate')
    expect(row).not.toHaveClass('md:grid-cols-[2.25rem_minmax(0,1fr)_6rem_6rem_6rem]')
  })
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

  it('uses neutral fallbacks for unavailable names and addresses', () => {
    render(<RouteStopTimeline stops={[{ clientId: 'client-legacy', saleIds: [], latitude: 0, longitude: 0 }]} />)
    expect(screen.getAllByText(/Dirección no disponible/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Cliente: No disponible/)).toBeInTheDocument()
  })
})
