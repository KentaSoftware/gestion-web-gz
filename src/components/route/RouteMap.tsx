'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  APIProvider,
  APILoadingStatus,
  Map,
  MapControl,
  Marker,
  Polyline,
  ControlPosition,
  useMap,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'
import { ROUTE_MAP_LOCATION_STATUS, type RouteMapLocation, type RoutePreview } from '@/interfaces/routePlan.interface'

type PreviewRoute = RoutePreview['route']

/** One decoded geographic point. */
export interface RouteMapPoint {
  lat: number
  lng: number
}

interface RouteMapProps {
  /** Ordered preview route as returned by the backend. Never reordered here. */
  route: PreviewRoute
  mapLocations?: RouteMapLocation[]
  minimal?: boolean
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

const centerOfPoints = (points: RouteMapPoint[]): { lat: number; lng: number } => ({
  lat: (Math.min(...points.map((point) => point.lat)) + Math.max(...points.map((point) => point.lat))) / 2,
  lng: (Math.min(...points.map((point) => point.lng)) + Math.max(...points.map((point) => point.lng))) / 2,
})

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
  mapLocations: RouteMapLocation[]
  minimal: boolean
}

type MapView = 'full' | 'route'

const mapLocationTitle = (location: RouteMapLocation): string => `${location.status} · ${location.displayName}`

const MapControls = ({ onFit, onZoomIn, onZoomOut, onCenter }: { onFit: () => void; onZoomIn: () => void; onZoomOut: () => void; onCenter: () => void }) => (
  <div className="flex flex-wrap gap-1 rounded-md border border-border-subtle bg-surface-base p-1 shadow-sm" role="group" aria-label="Controles del mapa">
    <button type="button" className="rounded px-2 py-1 text-xs text-text-primary hover:bg-background-subtle" onClick={onFit}>Ajustar vista</button>
    <button type="button" className="rounded px-2 py-1 text-xs text-text-primary hover:bg-background-subtle" onClick={onCenter}>Centrar</button>
    <button type="button" className="rounded px-2 py-1 text-xs text-text-primary hover:bg-background-subtle" onClick={onZoomIn} aria-label="Acercar mapa">+</button>
    <button type="button" className="rounded px-2 py-1 text-xs text-text-primary hover:bg-background-subtle" onClick={onZoomOut} aria-label="Alejar mapa">−</button>
  </div>
)

const RouteMapCanvas = ({ route, roadGeometry, mapLocations, minimal }: RouteMapCanvasProps) => {
  const status = useApiLoadingStatus()
  const map = useMap()
  const [view, setView] = useState<MapView>('full')

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

  const routeClientIds = new Set(route.stops.map((stop) => stop.clientId))
  const additionalLocations = view === 'full' ? mapLocations.filter((location) => !routeClientIds.has(location.clientId)) : []
  const visibleStops = view === 'route' ? route.stops : [...route.stops, ...additionalLocations]
  const visiblePoints: RouteMapPoint[] = [
    { lat: route.depot.latitude, lng: route.depot.longitude },
    ...visibleStops.map((location) => ({ lat: location.latitude, lng: location.longitude })),
  ]
  const fitVisiblePoints = () => {
    if (map === null || visiblePoints.length === 0 || typeof google === 'undefined') return
    const bounds = new google.maps.LatLngBounds()
    visiblePoints.forEach((point) => bounds.extend(point))
    map.fitBounds(bounds)
  }
  const centerVisiblePoints = () => {
    if (map === null) return
    map.panTo(centerOfPoints(visiblePoints))
  }
  const changeZoom = (delta: number) => {
    if (map === null) return
    map.setZoom((map.getZoom() ?? 12) + delta)
  }

  useEffect(() => {
    const stopsForBounds = view === 'route' ? route.stops : [...route.stops, ...mapLocations.filter((location) => !route.stops.some((stop) => stop.clientId === location.clientId))]
    const points: RouteMapPoint[] = [
      { lat: route.depot.latitude, lng: route.depot.longitude },
      ...stopsForBounds.map((location) => ({ lat: location.latitude, lng: location.longitude })),
    ]
    if (map === null || points.length === 0 || typeof google === 'undefined') return
    const bounds = new google.maps.LatLngBounds()
    points.forEach((point) => bounds.extend(point))
    map.fitBounds(bounds)
  }, [map, view, mapLocations, route])

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

  return (
    <div>
      {!minimal && <>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Vista del mapa" className="flex gap-1">
            <button type="button" className="rounded border border-border-subtle px-2 py-1 text-xs text-text-primary" aria-pressed={view === 'full'} onClick={() => setView('full')}>Vista completa</button>
            <button type="button" className="rounded border border-border-subtle px-2 py-1 text-xs text-text-primary" aria-pressed={view === 'route'} onClick={() => setView('route')}>Vista de ruta</button>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-text-secondary" aria-label="Leyenda del mapa">
          <span><span className="mr-1 inline-block size-2 rounded-full bg-brand-primary" aria-hidden="true" />Depósito</span>
          <span><span className="mr-1 inline-block size-2 rounded-full bg-state-success" aria-hidden="true" />Clientes con pedido</span>
          <span><span className="mr-1 inline-block size-2 rounded-full bg-state-info" aria-hidden="true" />Clientes sin pedido</span>
          <span><span className="mr-1 inline-block size-2 rounded-full bg-state-warning" aria-hidden="true" />Excluidos</span>
        </div>
      </>}
      <div className="h-64 w-full overflow-hidden rounded-md border border-border-subtle md:h-80">
      <Map defaultCenter={centerOf(route)} defaultZoom={12} gestureHandling="cooperative">
        {!minimal && <MapControl position={ControlPosition.TOP_RIGHT}><MapControls onFit={fitVisiblePoints} onCenter={centerVisiblePoints} onZoomIn={() => changeZoom(1)} onZoomOut={() => changeZoom(-1)} /></MapControl>}
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
        {additionalLocations.map((location) => (
          <Marker
            key={location.clientId}
            position={{ lat: location.latitude, lng: location.longitude }}
            title={mapLocationTitle(location)}
            label={location.status === ROUTE_MAP_LOCATION_STATUS.ORDER ? 'P' : location.status === ROUTE_MAP_LOCATION_STATUS.NO_ORDER ? 'S' : 'E'}
            zIndex={0}
          />
        ))}
        <Polyline path={path} strokeColor={ROUTE_STROKE_COLOR} strokeWeight={3} />
      </Map>
      </div>
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
export function RouteMap({ route, mapLocations = [], minimal = false }: RouteMapProps) {
  const headingId = useId()
  // Public client key: Next.js inlines NEXT_PUBLIC_ variables only through
  // static member access in client components.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const decoded = decodePolyline(route.encodedPolyline)
  const roadGeometry = decoded.length >= 2 ? decoded : null

  const content: ReactNode =
    typeof apiKey === 'string' && apiKey.trim() !== '' ? (
      <APIProvider apiKey={apiKey}>
        <RouteMapCanvas route={route} roadGeometry={roadGeometry} mapLocations={mapLocations} minimal={minimal} />
      </APIProvider>
    ) : (
      <MapFallback message={MISSING_KEY_MESSAGE} />
    )

  if (minimal) return <div aria-label="Mapa de la ruta">{content}</div>

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
