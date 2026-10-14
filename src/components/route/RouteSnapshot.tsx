import {
  ROUTE_PREVIEW_WARNING,
  ROUTE_PREVIEW_WARNING_LABEL,
  type RoutePlan,
  type RoutePreview,
} from '@/interfaces/routePlan.interface'
import { RouteTabs } from './RoutePreview'
import type { RouteStopEstimateLike } from './RouteStopTimeline'

interface RouteSnapshotProps {
  /** Immutable snapshot as stored by the backend. Never recomputed here. */
  snapshot: RoutePlan
}

interface SnapshotDashboardFields {
  assignments?: { driverId?: string; vehicleId?: string }
  stopEstimates?: readonly RouteStopEstimateLike[]
  staleness?: { stale: boolean }
  readWarnings?: readonly string[]
  fuelAssumptions?: { availability?: string; vehicleCode?: string | null }
  saleReferences?: RoutePlan['saleReferences']
}

const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

const DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Argentina/Buenos_Aires',
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
})

const formatDate = (value: string, withTime = false): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return (withTime ? DATE_TIME_FORMAT : DATE_FORMAT).format(parsed)
}

const formatKilometers = (meters: number): string => `${decimal.format(meters / 1000)} km`

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`
  if (hours > 0) return `${hours} h`
  return `${minutes} min`
}

const formatLiters = (liters: number | null): string => liters === null ? 'No disponible' : `${decimal.format(liters)} L`

const warningLabel = (warning: string): string => ROUTE_PREVIEW_WARNING_LABEL[warning] ?? warning

/**
 * Adapts the stored snapshot into the preview route shape consumed by
 * {@link RouteMap}. Stops keep their server order; segments reference the depot
 * (sequence `0`) or a stop by its stored sequence. This is a pure read of the
 * snapshot: nothing is recomputed.
 */
const toPreviewRoute = (snapshot: RoutePlan): RoutePreview['route'] => {
  const clientIdBySequence = new Map(snapshot.stops.map((stop) => [stop.sequence, stop.clientId]))
  const locationId = (sequence: number): string =>
    sequence === 0 ? 'deposito_1' : clientIdBySequence.get(sequence) ?? 'deposito_1'

  return {
    depot: {
      id: 'deposito_1',
      name: snapshot.depot.name,
        address: snapshot.depot.address,
      latitude: snapshot.depot.latitude,
      longitude: snapshot.depot.longitude,
    },
    stops: snapshot.stops.map((stop) => ({
      clientId: stop.clientId,
      saleIds: [...stop.saleIds],
      latitude: stop.latitude,
      longitude: stop.longitude,
    })),
    segments: snapshot.segments.map((segment) => ({
      fromId: locationId(segment.fromStopSequence),
      toId: locationId(segment.toStopSequence),
      distanceMeters: segment.distanceMeters,
      durationSeconds: segment.durationSeconds,
    })),
    encodedPolyline: snapshot.encodedPolyline,
  }
}

/**
 * Read-only adapter for a saved route plan (T-F.6).
 *
 * Renders the immutable snapshot exactly as stored: metadata, metrics, ordered
 * stops, warnings and the map/text fallback. `MAP_UNAVAILABLE` is non-terminal:
 * the stored data stays visible and the ordered stop list remains the text
 * fallback. The client never reorders `stops` and never recomputes the route.
 */
export function RouteSnapshot({ snapshot }: RouteSnapshotProps) {
  const dashboard = snapshot as RoutePlan & SnapshotDashboardFields
  const mapUnavailable = snapshot.warnings.includes(ROUTE_PREVIEW_WARNING.MAP_UNAVAILABLE)
  const visibleWarnings = snapshot.warnings.filter(
    (warning) => warning !== ROUTE_PREVIEW_WARNING.MAP_UNAVAILABLE
  )

  return (
    <section
      aria-labelledby="route-snapshot-title"
      className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md md:p-6"
    >
      <h2 id="route-snapshot-title" className="text-base font-semibold text-brand-primary">
        Detalle del recorrido
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Plan guardado. Los datos son inmutables: no se recalcula el recorrido.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Fecha de reparto</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatDate(snapshot.planningDate)}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Zona</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{snapshot.zoneSnapshot.name}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Ventas seleccionadas</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{snapshot.selectedSaleIds.length}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Versión del snapshot</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{snapshot.snapshotVersion}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Revisión de configuración</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{snapshot.routingConfigRevision}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Versión de reglas</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{snapshot.ruleVersion}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Algoritmo</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {snapshot.algorithm.name} · {snapshot.algorithm.provider}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Guardado por</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{snapshot.audit.createdBy}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Guardado el</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatDate(snapshot.audit.createdAt, true)}
          </dd>
        </div>
      </dl>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Distancia</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatKilometers(snapshot.metrics.distanceMeters)}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Duración</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatDuration(snapshot.metrics.durationSeconds)}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Paradas</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{snapshot.metrics.stopCount}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Combustible</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatLiters(snapshot.metrics.fuelLiters)}
          </dd>
        </div>
      </dl>

        <RouteTabs
          route={toPreviewRoute(snapshot)}
          estimates={dashboard.stopEstimates}
          saleReferences={dashboard.saleReferences ?? snapshot.saleReferences}
          depotName={snapshot.depot.name}
          depotAddress={snapshot.depot.address}
         stale={dashboard.staleness?.stale === true}
         readWarnings={dashboard.readWarnings}
       />

      {mapUnavailable && (
        <p className="mt-4 text-xs text-text-secondary">
          {ROUTE_PREVIEW_WARNING_LABEL[ROUTE_PREVIEW_WARNING.MAP_UNAVAILABLE]}
        </p>
      )}

      {visibleWarnings.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-state-warning">Advertencias</h3>
          <ul aria-label="Advertencias" className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {visibleWarnings.map((warning) => (
              <li key={warning} data-warning={warning} className="text-xs text-state-warning">
                {warningLabel(warning)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
