import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RoutePreview as RoutePreviewData } from '@/interfaces/routePlan.interface'

const { useApiLoadingStatus } = vi.hoisted(() => ({ useApiLoadingStatus: vi.fn() }))

/**
 * Stable map-package mock. The real `@vis.gl/react-google-maps` injects the
 * Google script into the document, which can never load in jsdom. The mock
 * replaces the loader and exposes marker/polyline props as data attributes so
 * the ordering contract can be asserted without live Google calls.
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
    APIProvider: ({ children }: { children?: ReactNode }) => (
      <div data-testid="api-provider">{children}</div>
    ),
    Map: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
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

import { RouteMap } from './RouteMap'

const API_KEY_ENV = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'
const ORIGINAL_API_KEY = process.env[API_KEY_ENV]

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
  encodedPolyline: 'encoded-polyline',
}

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) delete process.env[API_KEY_ENV]
  else process.env[API_KEY_ENV] = ORIGINAL_API_KEY
  useApiLoadingStatus.mockReset()
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

  it('renders depot and ordered stop markers plus a route polyline when loaded', () => {
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

    const polyline = screen.getByTestId('map-polyline')
    const path = JSON.parse(polyline.getAttribute('data-path') ?? '[]')
    expect(path).toEqual([
      { lat: -34.6, lng: -58.4 },
      { lat: -34.61, lng: -58.41 },
      { lat: -34.62, lng: -58.42 },
      { lat: -34.6, lng: -58.4 },
    ])
  })
})
