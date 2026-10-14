import type { RoutePreviewSegment, RoutePreviewStop } from '@/interfaces/routePlan.interface'

export interface RouteStopEstimateLike {
  sequence: number
  arrival: string | null
  cumulativeDurationSeconds: number | null
  availability?: string
  timezone?: string
  serviceWindow?: string | null
}

export interface RouteStopTimelineStop extends RoutePreviewStop {
  displayName?: string
  addressSummary?: string
}

export interface RouteStopTimelineDepot {
  name: string
  address?: string
}

export interface RouteStopTimelineProps {
  stops: readonly RouteStopTimelineStop[]
  segments?: readonly RoutePreviewSegment[]
  estimates?: readonly RouteStopEstimateLike[]
  depot?: RouteStopTimelineDepot
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
})

const formatArrival = (arrival: string | null | undefined): string => {
  if (!arrival) return 'No disponible'
  const date = new Date(arrival)
  return Number.isNaN(date.getTime()) ? arrival : DATE_TIME_FORMAT.format(date)
}

const formatOrderCount = (count: number): string => (count === 1 ? '1 pedido' : `${count} pedidos`)

const formatKilometers = (meters: number): string => `${decimal.format(meters / 1000)} km`

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`
  if (hours > 0) return `${hours} h`
  return `${minutes} min`
}

const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

/** Ordered, provider-independent representation of a route's stops. */
export function RouteStopTimeline({ stops, segments = [], estimates = [], depot = { name: 'el depósito' } }: RouteStopTimelineProps) {
  const estimateBySequence = new Map(estimates.map((estimate) => [estimate.sequence, estimate]))
  const segmentByDestination = new Map(segments.map((segment) => [segment.toId, segment]))
  const unavailableAddress = 'Dirección no disponible'

  return (
    <section aria-labelledby="route-stop-timeline-title">
      <h3 id="route-stop-timeline-title" className="text-sm font-semibold text-text-primary">
        Secuencia de paradas
      </h3>
      <p className="mt-1 text-xs text-text-secondary">Salida desde {depot.name} y regreso al finalizar.</p>
      {stops.length === 0 ? (
        <p role="status" className="mt-3 rounded-md border border-border-subtle p-3 text-xs text-text-secondary">
          No hay paradas disponibles.
        </p>
      ) : (
        <ol aria-label="Paradas del recorrido" className="mt-3 flex flex-col gap-2">
          <li className="rounded-md border border-border-subtle bg-background-subtle p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">Depósito</span>
              <span className="text-xs text-text-secondary">0 pedidos</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">{depot.name} · {depot.address ?? unavailableAddress}</p>
            <dl className="mt-2 grid gap-1 text-xs text-text-secondary sm:grid-cols-2">
              <div><dt className="inline">Distancia: </dt><dd className="inline">{formatKilometers(0)}</dd></div>
              <div><dt className="inline">Duración: </dt><dd className="inline">{formatDuration(0)}</dd></div>
            </dl>
          </li>
          {stops.map((stop, index) => {
            const estimate = estimateBySequence.get(index + 1)
            const segment = segmentByDestination.get(stop.clientId)
            return (
              <li key={stop.clientId} className="rounded-md border border-border-subtle bg-background-subtle p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">Parada {index + 1}</span>
                  <span className="text-xs text-text-secondary">{formatOrderCount(stop.saleIds.length)}</span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">{stop.displayName ?? stop.clientId} · {stop.addressSummary ?? unavailableAddress}</p>
                <dl className="mt-2 grid gap-1 text-xs text-text-secondary sm:grid-cols-2">
                  <div><dt className="inline">Distancia: </dt><dd className="inline">{segment ? formatKilometers(segment.distanceMeters) : 'No disponible'}</dd></div>
                  <div><dt className="inline">Duración: </dt><dd className="inline">{segment ? formatDuration(segment.durationSeconds) : 'No disponible'}</dd></div>
                  <div>
                    <dt className="inline">Llegada estimada: </dt>
                    <dd className="inline">{formatArrival(estimate?.arrival)}</dd>
                  </div>
                  {estimate?.serviceWindow && <div><dt className="inline">Ventana de servicio: </dt><dd className="inline">{estimate.serviceWindow}</dd></div>}
                </dl>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
