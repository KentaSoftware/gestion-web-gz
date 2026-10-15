import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoutePreview as RoutePreviewData } from '@/interfaces/routePlan.interface'

const { useApiLoadingStatus, useMap } = vi.hoisted(() => ({ useApiLoadingStatus: vi.fn(), useMap: vi.fn() }))

/**
 * Stable map-package mock. The real `@vis.gl/react-google-maps` injects the
 * Google script into the document, which can never load in jsdom. The mock
 * replaces the loader and exposes marker/polyline props as data attributes so
 * the ordering and geometry contracts can be asserted without live Google calls.
 */
vi.mock('@vis.gl/react-google-maps', () => {
  const APILoadingStatus = {
    NOT_LOADED: 'NOT_LOADED',
    LOADING: 'LOADING',
    LOADED: 'LOADED',
    FAILED: 'FAILED',
    AUTH_FAILURE: 'AUTH_FAILURE',
  } as const

  return {
    APILoadingStatus,
    useApiLoadingStatus,
    useMap,
    ControlPosition: { TOP_RIGHT: 'TOP_RIGHT' },
    APIProvider: ({ children }: { children?: ReactNode }) => (
      <div data-testid="api-provider">{children}</div>
    ),
    Map: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
    MapControl: ({ children }: { children?: ReactNode }) => <div data-testid="map-control">{children}</div>,
    Marker: ({
      position,
      label,
      title,
    }: {
      position: { lat: number; lng: number }
      label?: string
      title?: string
    }) => (
      <div
        data-testid="map-marker"
        data-label={label ?? ''}
        data-title={title ?? ''}
        data-lat={String(position.lat)}
        data-lng={String(position.lng)}
      />
    ),
    Polyline: ({ path }: { path: Array<{ lat: number; lng: number }> }) => (
      <div data-testid="map-polyline" data-path={JSON.stringify(path)} />
    ),
  }
})

import { decodePolyline, RouteMap } from './RouteMap'

const API_KEY_ENV = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
const ORIGINAL_API_KEY = process.env[API_KEY_ENV]

/**
 * Canonical Google encoded-polyline example from the Maps documentation. It is
 * the external ground truth for the decoder: three points along the US west
 * coast (38.5, -120.2), (40.7, -120.95), (43.252, -126.453).
 */
const KNOWN_ENCODED_POLYLINE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
const KNOWN_DECODED_POINTS = [
  { lat: 38.5, lng: -120.2 },
  { lat: 40.7, lng: -120.95 },
  { lat: 43.252, lng: -126.453 },
]

/**
 * Road geometry for the fixture route. It includes intermediate points that do
 * not exist in the stop list, so a rendered connector can never be mistaken for
 * the decoded road line.
 */
const ROUTE_ENCODED_POLYLINE = '~xdrE~fmcJf^f^f^f^f^f^f^f^'
const ROUTE_DECODED_POINTS = [
  { lat: -34.6, lng: -58.4 },
  { lat: -34.605, lng: -58.405 },
  { lat: -34.61, lng: -58.41 },
  { lat: -34.615, lng: -58.415 },
  { lat: -34.62, lng: -58.42 },
]

/** Straight connector built from known coordinates: the mandatory fallback. */
const APPROXIMATE_CONNECTOR = [
  { lat: -34.6, lng: -58.4 },
  { lat: -34.61, lng: -58.41 },
  { lat: -34.62, lng: -58.42 },
  { lat: -34.6, lng: -58.4 },
]

const ROUTE: RoutePreviewData['route'] = {
  depot: { id: 'deposito_1', name: 'Depósito Central', latitude: -34.6, longitude: -58.4 },
  stops: [
    { clientId: 'client-1', saleIds: ['sale-1'], latitude: -34.61, longitude: -58.41 },
    { clientId: 'client-2', saleIds: ['sale-2'], latitude: -34.62, longitude: -58.42 },
  ],
  segments: [
    { fromId: 'deposito_1', toId: 'client-1', distanceMeters: 1200, durationSeconds: 300 },
    { fromId: 'client-1', toId: 'client-2', distanceMeters: 800, durationSeconds: 240 },
  ],
  encodedPolyline: ROUTE_ENCODED_POLYLINE,
}

const routeWithPolyline = (encodedPolyline: string): RoutePreviewData['route'] => ({
  ...ROUTE,
  encodedPolyline,
})

const renderedPolylinePath = (): Array<{ lat: number; lng: number }> => {
  const polyline = screen.getByTestId('map-polyline')
  return JSON.parse(polyline.getAttribute('data-path') ?? '[]')
}

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env[API_KEY_ENV]
  else process.env[API_KEY_ENV] = ORIGINAL_API_KEY
  useApiLoadingStatus.mockReset()
  useMap.mockReset()
  useMap.mockReturnValue(null)
})

describe('decodePolyline', () => {
  it('decodes a known Google encoded polyline into ordered coordinates', () => {
    expect(decodePolyline(KNOWN_ENCODED_POLYLINE)).toEqual(KNOWN_DECODED_POINTS)
  })

  it('returns no points for empty, malformed or truncated input', () => {
    expect(decodePolyline('')).toEqual([])
    expect(decodePolyline('encoded-polyline')).toEqual([])
    expect(decodePolyline('?')).toEqual([])
  })

  it('returns a single point when the input encodes one location', () => {
    expect(decodePolyline('??')).toEqual([{ lat: 0, lng: 0 }])
  })
})

describe('RouteMap', () => {
  it('renders an accessible fallback without an API key and never mounts the map', () => {
    delete process.env[API_KEY_ENV]
    render(<RouteMap route={ROUTE} />)

    expect(screen.getByRole('status')).toHaveTextContent(/no está configurado/i)
    expect(screen.queryByTestId('api-provider')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a non-terminal fallback when the API fails to load', () => {
    process.env[API_KEY_ENV] = 'test-key'
    useApiLoadingStatus.mockReturnValue('FAILED')
    render(<RouteMap route={ROUTE} />)

    expect(screen.getByRole('status')).toHaveTextContent(/no se pudo cargar el mapa/i)
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders a non-terminal fallback on authentication failure', () => {
    process.env[API_KEY_ENV] = 'test-key'
    useApiLoadingStatus.mockReturnValue('AUTH_FAILURE')
    render(<RouteMap route={ROUTE} />)

    expect(screen.getByRole('status')).toHaveTextContent(/no se pudo cargar el mapa/i)
  })

  it('announces the loading state while the API loads', () => {
    process.env[API_KEY_ENV] = 'test-key'
    useApiLoadingStatus.mockReturnValue('LOADING')
    render(<RouteMap route={ROUTE} />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando mapa')
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
  })

  it('renders depot and ordered stop markers with the decoded road geometry when loaded', () => {
    process.env[API_KEY_ENV] = 'test-key'
    useApiLoadingStatus.mockReturnValue('LOADED')
    render(<RouteMap route={ROUTE} />)

    const markers = screen.getAllByTestId('map-marker')
    expect(markers).toHaveLength(ROUTE.stops.length + 1)

    expect(markers[0]).toHaveAttribute('data-label', 'D')
    expect(markers[0]).toHaveAttribute('data-title', 'Depósito Central')
    expect(markers[1]).toHaveAttribute('data-label', '1')
    expect(markers[1]).toHaveAttribute('data-lat', '-34.61')
    expect(markers[2]).toHaveAttribute('data-label', '2')
    expect(markers[2]).toHaveAttribute('data-lng', '-58.42')

    expect(renderedPolylinePath()).toEqual(ROUTE_DECODED_POINTS)
    expect(renderedPolylinePath()).not.toEqual(APPROXIMATE_CONNECTOR)
    expect(screen.getByText(/trazado vial/i)).toBeInTheDocument()
    expect(screen.queryByText(/no representa la geometría vial/i)).not.toBeInTheDocument()
  })

  it('renders categorized locations in the default full view without duplicating route stops', () => {
    process.env[API_KEY_ENV] = 'test-key'
    useApiLoadingStatus.mockReturnValue('LOADED')
    render(<RouteMap route={ROUTE} mapLocations={[
      { clientId: 'client-1', displayName: 'Pedido existente', latitude: -34.61, longitude: -58.41, status: 'ORDER' as const },
      { clientId: 'client-3', displayName: 'Sin pedido', latitude: -34.63, longitude: -58.43, status: 'NO_ORDER' as const },
      { clientId: 'client-4', displayName: 'Excluido', latitude: -34.64, longitude: -58.44, status: 'EXCLUDED' as const },
    ]} />)

    expect(screen.getAllByTestId('map-marker')).toHaveLength(5)
    expect(screen.getAllByTestId('map-marker').map((marker) => marker.getAttribute('data-title'))).toEqual([
      'Depósito Central', 'Parada 1', 'Parada 2', 'NO_ORDER · Sin pedido', 'EXCLUDED · Excluido',
    ])
    expect(screen.getByText('Depósito')).toBeInTheDocument()
    expect(screen.getByText('Clientes con pedido')).toBeInTheDocument()
    expect(screen.getByText('Clientes sin pedido')).toBeInTheDocument()
    expect(screen.getByText('Excluidos')).toBeInTheDocument()
  })

  it('toggles route view and exposes keyboard-accessible map controls', () => {
    process.env[API_KEY_ENV] = 'test-key'
    useApiLoadingStatus.mockReturnValue('LOADED')
    render(<RouteMap route={ROUTE} mapLocations={[{ clientId: 'client-3', displayName: 'Sin pedido', latitude: -34.63, longitude: -58.43, status: 'NO_ORDER' as const }]} />)

    expect(screen.getByRole('button', { name: 'Vista completa' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Vista de ruta' }))
    expect(screen.getByRole('button', { name: 'Vista de ruta' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByTestId('map-marker')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Centrar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acercar mapa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alejar mapa' })).toBeInTheDocument()
  })

  it('uses the Google map instance for zoom and center controls when available', () => {
    process.env[API_KEY_ENV] = 'test-key'
    useApiLoadingStatus.mockReturnValue('LOADED')
    const map = {
      getZoom: vi.fn(() => 12),
      setZoom: vi.fn(),
      panTo: vi.fn(),
    }
    useMap.mockReturnValue(map)
    render(<RouteMap route={ROUTE} />)

    fireEvent.click(screen.getByRole('button', { name: 'Acercar mapa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Alejar mapa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Centrar' }))

    expect(map.setZoom).toHaveBeenNthCalledWith(1, 13)
    expect(map.setZoom).toHaveBeenNthCalledWith(2, 11)
    expect(map.panTo).toHaveBeenCalledWith({ lat: -34.61, lng: -58.41 })
  })

  describe('geometry fallback', () => {
    const expectApproximateFallback = () => {
      expect(renderedPolylinePath()).toEqual(APPROXIMATE_CONNECTOR)
      expect(screen.getByText(/no representa la geometría vial/i)).toBeInTheDocument()
      expect(screen.queryByText(/trazado vial/i)).not.toBeInTheDocument()
    }

    const renderLoaded = (route: RoutePreviewData['route']) => {
      process.env[API_KEY_ENV] = 'test-key'
      useApiLoadingStatus.mockReturnValue('LOADED')
      render(<RouteMap route={route} />)
    }

    it('falls back to the straight connector when the polyline is missing', () => {
      renderLoaded(routeWithPolyline(''))
      expectApproximateFallback()
    })

    it('falls back when the polyline is malformed', () => {
      renderLoaded(routeWithPolyline('encoded-polyline'))
      expectApproximateFallback()
    })

    it('falls back when the polyline decodes to a single point', () => {
      renderLoaded(routeWithPolyline('??'))
      expectApproximateFallback()
    })
  })
})
