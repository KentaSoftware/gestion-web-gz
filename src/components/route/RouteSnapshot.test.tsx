import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RoutePlan } from '@/interfaces/routePlan.interface'
import { RouteSnapshot } from './RouteSnapshot'

// Deterministic map fallback: RouteMap must resolve to its non-terminal
// no-key state so these tests never load the live Google Maps script.
delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const SNAPSHOT: RoutePlan = {
  _id: 'f'.repeat(24),
  snapshotVersion: 1,
  planningDate: '2026-10-04T03:00:00.000Z',
  zoneSnapshot: { code: 'NORTE', normalizedName: 'zona norte', name: 'Zona Norte' },
  selectedSaleIds: ['sale-1', 'sale-2', 'sale-3'],
    depot: { name: 'Depósito Central', address: 'Av. Central 123', latitude: -34.6, longitude: -58.4 },
  stops: [
    { clientId: 'client-1', saleIds: ['sale-1', 'sale-2'], sequence: 1, latitude: -34.61, longitude: -58.41 },
    { clientId: 'client-2', saleIds: ['sale-3'], sequence: 2, latitude: -34.62, longitude: -58.42 },
  ],
  segments: [
    { fromStopSequence: 0, toStopSequence: 1, distanceMeters: 1200, durationSeconds: 300 },
    { fromStopSequence: 1, toStopSequence: 2, distanceMeters: 800, durationSeconds: 240 },
    { fromStopSequence: 2, toStopSequence: 0, distanceMeters: 1500, durationSeconds: 360 },
  ],
  metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 2, fuelLiters: 0.3 },
  algorithm: { name: 'nearest-neighbor-2opt-v1', version: 'nearest-neighbor-2opt-v1', provider: 'google-routes' },
  routingConfigRevision: 3,
  ruleVersion: 'candidate-eligibility-v1',
  encodedPolyline: 'encoded-polyline',
  warnings: ['TIME_WINDOWS_NOT_CONSIDERED'],
  audit: { createdBy: 'user-1', createdAt: '2026-10-04T03:05:00.000Z' },
  createdAt: '2026-10-04T03:05:00.000Z',
}

describe('RouteSnapshot', () => {
  it('renders the immutable snapshot metadata', () => {
    render(<RouteSnapshot snapshot={SNAPSHOT} />)

    expect(screen.getByRole('heading', { name: 'Detalle del recorrido' })).toBeInTheDocument()
    expect(screen.getByText('Zona Norte')).toBeInTheDocument()
    expect(screen.getByText('user-1')).toBeInTheDocument()
    expect(screen.getByText('candidate-eligibility-v1')).toBeInTheDocument()
  })

  it('renders the stored metrics', () => {
    render(<RouteSnapshot snapshot={SNAPSHOT} />)

    expect(screen.getByText('3,5 km')).toBeInTheDocument()
    expect(screen.getByText('15 min')).toBeInTheDocument()
    expect(screen.getByText('0,3 L')).toBeInTheDocument()
  })

  it('preserves the server stop order and sale grouping', () => {
    render(<RouteSnapshot snapshot={SNAPSHOT} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    const stops = screen.getByRole('list', { name: 'Paradas del recorrido' })
    const orderedStops = within(stops).getAllByRole('listitem')
    expect(orderedStops).toHaveLength(3)
    expect(orderedStops[0]).toHaveTextContent('Depósito Central')
    expect(orderedStops[0]).toHaveTextContent('Av. Central 123')
    expect(orderedStops[1]).toHaveTextContent('Parada 1')
    expect(orderedStops[1]).toHaveTextContent('2 pedidos')
    expect(orderedStops[1]).toHaveTextContent('client-1')
    expect(orderedStops[2]).toHaveTextContent('Parada 2')
    expect(orderedStops[2]).toHaveTextContent('1 pedido')
  })

  it('renders the stored warnings', () => {
    render(<RouteSnapshot snapshot={SNAPSHOT} />)

    expect(screen.getByText('No se consideran ventanas horarias.')).toBeInTheDocument()
  })

  it('keeps MAP_UNAVAILABLE non-terminal and still renders the ordered fallback list', () => {
    render(<RouteSnapshot snapshot={{ ...SNAPSHOT, warnings: ['MAP_UNAVAILABLE'] }} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(screen.getByRole('list', { name: 'Paradas del recorrido' })).toBeInTheDocument()
    expect(
      screen.getByText('La visualización en mapa no está disponible. Se muestra el recorrido como lista.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the map fallback without a configured API key and keeps the stop list', () => {
    render(<RouteSnapshot snapshot={SNAPSHOT} />)

    expect(screen.getByRole('status')).toHaveTextContent(/no está configurado/i)
    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(screen.getByRole('list', { name: 'Paradas del recorrido' })).toBeInTheDocument()
  })

  it('uses the unavailable address fallback for legacy snapshots', () => {
    render(<RouteSnapshot snapshot={{ ...SNAPSHOT, depot: { ...SNAPSHOT.depot, address: undefined } }} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(screen.getAllByText(/Dirección no disponible/).length).toBeGreaterThan(0)
  })

  it('falls back to the raw value when a stored date is invalid', () => {
    render(
      <RouteSnapshot
        snapshot={{
          ...SNAPSHOT,
          planningDate: 'not-a-date',
          audit: { ...SNAPSHOT.audit, createdAt: 'still-not-a-date' },
        }}
      />
    )

    expect(screen.getByText('not-a-date')).toBeInTheDocument()
    expect(screen.getByText('still-not-a-date')).toBeInTheDocument()
  })

  it('marks stale snapshots as read-only without changing stored metrics', () => {
    render(
      <RouteSnapshot
        snapshot={{
          ...SNAPSHOT,
          staleness: { stale: true },
        } as RoutePlan & { staleness: { stale: boolean } }}
      />
    )

    expect(screen.getByText(/desactualizado y es de solo lectura/i)).toBeInTheDocument()
    expect(screen.getByText('0,3 L')).toBeInTheDocument()
  })
})
