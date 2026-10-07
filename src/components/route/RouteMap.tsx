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

/** One decoded geographic point. */
export interface RouteMapPoint {
  lat: number
  lng: number
}

interface RouteMapProps {
  /** Ordered preview route as returned by the backend. Never reordered here. */
  route: PreviewRoute
}

const MISSING_KEY_MESSAGE = 'El mapa no está configurado. Las paradas se detallan en la lista del recorrido.'
const LOADING_MESSAGE = 'Cargando mapa…'
const FAILURE_MESSAGE = 'No se pudo cargar el mapa. Las paradas se detallan en la lista del recorrido.'

/**
 * Copy for the approximate connector fallback. It must never claim road
 * geometry: the line is built from the known depot/stop coordinates only.
 */
const APPROXIMATE_ROUTE_DESCRIPTION =
  'Trazado aproximado entre el depósito y las paradas en orden. No representa la geometría vial.'

/** Copy for the real road geometry decoded from the backend polyline. */
const ROAD_ROUTE_DESCRIPTION = 'Trazado vial entre el depósito y las paradas, en el orden calculado.'

/**
 * Polyline color mirrors the `--color-brand-primary` token. The Google Maps
 * runtime needs a concrete color string and cannot resolve CSS custom
 * properties, so the token value is repeated here deliberately.
 */
const ROUTE_STROKE_COLOR = '#3e68a4'

/** Bounds of the Google encoded-polyline alphabet (ASCII '?'..'~'). */
const POLYLINE_MIN_CODE = 63
const POLYLINE_MAX_CODE = 126

/**
 * Decodes a Google encoded polyline into ordered coordinates (precision 1e5).
 *
 * Pure and dependency-free. Returns an empty array when the input is not a
 * non-empty string, contains characters outside the polyline alphabet, or is
 * truncated mid-value. The caller treats a result with fewer than two points as
 * unavailable geometry and falls back to the coordinate connector.
 */
export const decodePolyline = (encoded: unknown): RouteMapPoint[] => {
  if (typeof encoded !== 'string' || encoded.length === 0) return []
  const input: string = encoded

  const points: RouteMapPoint[] = []
  let index = 0
  let lat = 0
  let lng = 0

  const readDelta = (): number | null => {
    let result = 0
    let shift = 0
    let byte = 0
    do {
      if (index >= input.length) return null
      const code = input.charCodeAt(index)
      if (code < POLYLINE_MIN_CODE || code > POLYLINE_MAX_CODE) return null
      byte = code - POLYLINE_MIN_CODE
      result += (byte & 0x1f) << shift
      shift += 5
      index += 1
    } while (byte >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < input.length) {
    const deltaLat = readDelta()
    if (deltaLat === null) return []
    const deltaLng = readDelta()
    if (deltaLng === null) return []
    lat += deltaLat
    lng += deltaLng
    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

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

interface RouteMapCanvasProps {
  route: PreviewRoute
  /** Decoded road geometry, or null when the backend polyline is unusable. */
  roadGeometry: RouteMapPoint[] | null
}

const RouteMapCanvas = ({ route, roadGeometry }: RouteMapCanvasProps) => {
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

  // Road geometry from the backend when available; otherwise an approximate
  // connector built from the known depot/stop coordinates in backend order.
  const path: RouteMapPoint[] =
    roadGeometry !== null
      ? roadGeometry
      : [
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
 * Renders depot/stop markers plus the visible route line. When the backend
 * supplies a usable `encodedPolyline`, the decoded road geometry is drawn; when
 * it is missing, malformed or decodes to fewer than two points, the map falls
 * back non-terminally to an approximate connector built from known coordinates
 * and the description says so. Markers are always rendered in backend order and
 * are never reordered. A missing key, a failed API load or an authentication
 * failure all resolve to an accessible status message, and the ordered stop list
 * in `RoutePreview` remains the authoritative fallback.
 */
export function RouteMap({ route }: RouteMapProps) {
  const headingId = useId()
  // Public client key: Next.js inlines NEXT_PUBLIC_ variables only through
  // static member access in client components.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const decoded = decodePolyline(route.encodedPolyline)
  const roadGeometry = decoded.length >= 2 ? decoded : null

  const content: ReactNode =
    typeof apiKey === 'string' && apiKey.trim() !== '' ? (
      <APIProvider apiKey={apiKey}>
        <RouteMapCanvas route={route} roadGeometry={roadGeometry} />
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
        {roadGeometry !== null ? ROAD_ROUTE_DESCRIPTION : APPROXIMATE_ROUTE_DESCRIPTION}
      </p>
      <div className="mt-3">{content}</div>
    </section>
  )
}
