'use client'

import { useId, type ReactNode } from 'react'
import {
  APIProvider,
  APILoadingStatus,
  Map,
  Marker,
  Polyline,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'
import type { RoutePreview } from '@/interfaces/routePlan.interface'

type PreviewRoute = RoutePreview['route']

interface RouteMapProps {
  /** Ordered preview route as returned by the backend. Never reordered here. */
  route: PreviewRoute
}

/**
 * Public, client-only map key. `NEXT_PUBLIC_` values are inlined by Next at
 * build time, so this is safe to reference from a client component and must
 * stay keyed to the documented variable name.
 */
const API_KEY_ENV = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'

const MISSING_KEY_MESSAGE = 'El mapa no está configurado. Las paradas se detallan en la lista del recorrido.'
const LOADING_MESSAGE = 'Cargando mapa…'
const FAILURE_MESSAGE = 'No se pudo cargar el mapa. Las paradas se detallan en la lista del recorrido.'

/**
 * Polyline color mirrors the `--color-brand-primary` token. The Google Maps
 * runtime needs a concrete color string and cannot resolve CSS custom
 * properties, so the token value is repeated here deliberately.
 */
const ROUTE_STROKE_COLOR = '#3e68a4'

const centerOf = (route: PreviewRoute): { lat: number; lng: number } => {
  const latitudes = [route.depot.latitude, ...route.stops.map((stop) => stop.latitude)]
  const longitudes = [route.depot.longitude, ...route.stops.map((stop) => stop.longitude)]
  return {
    lat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    lng: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  }
}

const MapFallback = ({ message }: { message: string }) => (
  <p
    role="status"
    className="rounded-md border border-border-subtle bg-background-subtle p-3 text-xs text-text-secondary"
  >
    {message}
  </p>
)

const RouteMapCanvas = ({ route }: RouteMapProps) => {
  const status = useApiLoadingStatus()

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return <MapFallback message={FAILURE_MESSAGE} />
  }

  if (status !== APILoadingStatus.LOADED) {
    return (
      <p role="status" className="text-xs text-text-secondary">
        {LOADING_MESSAGE}
      </p>
    )
  }

  // Built only from known depot/stop coordinates: this is an ordered connector,
  // not road geometry, and the exact order is preserved from `route.stops`.
  const path = [
    { lat: route.depot.latitude, lng: route.depot.longitude },
    ...route.stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude })),
    { lat: route.depot.latitude, lng: route.depot.longitude },
  ]

  return (
    <div className="h-64 w-full overflow-hidden rounded-md border border-border-subtle md:h-80">
      <Map defaultCenter={centerOf(route)} defaultZoom={12} gestureHandling="cooperative">
        <Marker
          position={{ lat: route.depot.latitude, lng: route.depot.longitude }}
          title={route.depot.name}
          label="D"
          zIndex={route.stops.length + 1}
        />
        {route.stops.map((stop, index) => (
          <Marker
            key={stop.clientId}
            position={{ lat: stop.latitude, lng: stop.longitude }}
            title={`Parada ${index + 1}`}
            label={String(index + 1)}
            zIndex={index + 1}
          />
        ))}
        <Polyline path={path} strokeColor={ROUTE_STROKE_COLOR} strokeWeight={3} />
      </Map>
    </div>
  )
}

/**
 * Ordered route map boundary (T-F.5a).
 *
 * Renders depot/stop markers and an ordered connector polyline from the known
 * coordinates of an already calculated preview route. The map is a progressive
 * enhancement: a missing key, a failed API load or an authentication failure
 * all resolve to a non-terminal, accessible status message. The ordered stop
 * list in `RoutePreview` remains the authoritative fallback and is never
 * duplicated or hidden here. Stops are rendered in backend order and are never
 * reordered.
 */
export function RouteMap({ route }: RouteMapProps) {
  const headingId = useId()
  const apiKey = process.env[API_KEY_ENV]

  const content: ReactNode =
    typeof apiKey === 'string' && apiKey.trim() !== '' ? (
      <APIProvider apiKey={apiKey}>
        <RouteMapCanvas route={route} />
      </APIProvider>
    ) : (
      <MapFallback message={MISSING_KEY_MESSAGE} />
    )

  return (
    <section aria-labelledby={headingId}>
      <h4 id={headingId} className="text-sm font-semibold text-text-primary">
        Mapa del recorrido
      </h4>
      <p className="mt-1 text-xs text-text-secondary">
        Trazado aproximado entre el depósito y las paradas en orden. No representa la geometría vial.
      </p>
      <div className="mt-3">{content}</div>
    </section>
  )
}
