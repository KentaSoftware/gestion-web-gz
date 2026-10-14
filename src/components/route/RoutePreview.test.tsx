import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RoutePreview as RoutePreviewData } from '@/interfaces/routePlan.interface'
import { RoutePreview } from './RoutePreview'

// Deterministic map fallback: RouteMap must resolve to its non-terminal
// no-key state so these tests never load the live Google Maps script.
delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const PREVIEW: RoutePreviewData = {
  route: {
    depot: { id: 'deposito_1', name: 'Depósito Central', latitude: -34.6, longitude: -58.4 },
    stops: [
      { clientId: 'client-1', saleIds: ['sale-1', 'sale-2'], latitude: -34.61, longitude: -58.41 },
      { clientId: 'client-2', saleIds: ['sale-3'], latitude: -34.62, longitude: -58.42 },
    ],
    segments: [
      { fromId: 'deposito_1', toId: 'client-1', distanceMeters: 1200, durationSeconds: 300 },
      { fromId: 'client-1', toId: 'client-2', distanceMeters: 800, durationSeconds: 240 },
      { fromId: 'client-2', toId: 'deposito_1', distanceMeters: 1500, durationSeconds: 360 },
    ],
    encodedPolyline: 'encoded-polyline',
  },
  metrics: { distanceMeters: 3500, durationSeconds: 900, stopCount: 2, fuelLiters: 0.3 },
  warnings: ['TIME_WINDOWS_NOT_CONSIDERED'],
  factorsConsidered: ['DISTANCE', 'DURATION', 'FUEL_CONSUMPTION'],
  algorithmVersion: 'nearest-neighbor-2opt-v1',
  algorithmProvider: 'google-routes',
  routingConfigRevision: 3,
  ruleVersion: 'candidate-eligibility-v1',
}

describe('RoutePreview', () => {
  it('renders nothing before a preview is requested', () => {
    const { container } = render(<RoutePreview status="idle" preview={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('announces the loading state', () => {
    render(<RoutePreview status="loading" preview={null} />)

    expect(screen.getByRole('status')).toHaveTextContent('Calculando ruta')
  })

  it('renders a terminal, visible error for provider failures', () => {
    render(
      <RoutePreview
        status="error"
        preview={null}
        errorCode="ROUTING_PROVIDER_UNAVAILABLE"
        errorMessage="Raw provider message"
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Tuvimos inconvenientes a generar la ruta, por favor cerrar la ventana e intentar nuevamente')
  })

  it('falls back to the backend message for an unknown error code', () => {
    render(
      <RoutePreview
        status="error"
        preview={null}
        errorCode="SOMETHING_NEW"
        errorMessage="Mensaje del backend"
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Tuvimos inconvenientes a generar la ruta, por favor cerrar la ventana e intentar nuevamente')
  })

  it('renders metrics and ordered stops through the dedicated sequence tab', () => {
    render(<RoutePreview status="ready" preview={PREVIEW} />)

    expect(screen.getByRole('heading', { name: 'Recorrido propuesto' })).toBeInTheDocument()

    expect(screen.getByText('3,5 km')).toBeInTheDocument()
    expect(screen.getByText('15 min')).toBeInTheDocument()
    expect(screen.getByText('0,3 L')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    const stops = screen.getByRole('list', { name: 'Paradas del recorrido' })
    const orderedStops = within(stops).getAllByRole('listitem')
    expect(orderedStops).toHaveLength(2)
    expect(orderedStops[0]).toHaveTextContent('Parada 1')
    expect(orderedStops[0]).toHaveTextContent('2 ventas')
    expect(orderedStops[1]).toHaveTextContent('Parada 2')
    expect(orderedStops[1]).toHaveTextContent('1 venta')

    expect(screen.queryByRole('heading', { name: 'Factores considerados' })).not.toBeInTheDocument()
  })

  it('keeps MAP_UNAVAILABLE non-terminal and still renders the fallback list', () => {
    render(
      <RoutePreview
        status="ready"
        preview={{ ...PREVIEW, warnings: ['MAP_UNAVAILABLE'] }}
      />
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(screen.getByRole('list', { name: 'Paradas del recorrido' })).toBeInTheDocument()
    expect(screen.getByText('3,5 km')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps metrics and the map fallback available on the map tab', () => {
    render(<RoutePreview status="ready" preview={PREVIEW} />)

    expect(screen.getByText('3,5 km')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mapa del recorrido' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/no está configurado/i)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders an explicit empty state when the route has no stops', () => {
    render(
      <RoutePreview
        status="ready"
        preview={{ ...PREVIEW, route: { ...PREVIEW.route, stops: [] }, metrics: { ...PREVIEW.metrics, stopCount: 0 } }}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('El recorrido no tiene paradas')
  })

  it('keeps a mixed warning set non-terminal without adding analysis sections', () => {
    render(
      <RoutePreview
        status="ready"
        preview={{ ...PREVIEW, warnings: ['MAP_UNAVAILABLE', 'TIME_WINDOWS_NOT_CONSIDERED'] }}
      />
    )

    expect(screen.getByText('3,5 km')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(screen.getByRole('list', { name: 'Paradas del recorrido' })).toBeInTheDocument()

    expect(screen.queryByRole('list', { name: 'Advertencias' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not render factor or warning detail sections in the result surface', () => {
    render(<RoutePreview status="ready" preview={{ ...PREVIEW, warnings: ['FUTURE_WARNING'] }} />)

    expect(screen.queryByText('FUTURE_WARNING')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Factores considerados' })).not.toBeInTheDocument()
  })

  it('exposes keyboard-friendly tabs for the map, ordered timeline and linked sales', () => {
    render(<RoutePreview status="ready" preview={PREVIEW} />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Mapa de la ruta', 'Secuencia de paradas', 'Pedidos vinculados'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(tabs[2])
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Pedidos vinculados' })).toHaveTextContent('sale-3')
  })

  it('announces unavailable arrival estimates without fabricating timing data', () => {
    render(<RoutePreview status="ready" preview={PREVIEW} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Secuencia de paradas' }))
    expect(screen.getAllByText('No disponible').length).toBeGreaterThanOrEqual(PREVIEW.route.stops.length)
    expect(screen.queryByText(/ventana de servicio/i)).not.toBeInTheDocument()
  })
})
