import type { RoutePreviewStop } from '@/interfaces/routePlan.interface'

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
  metrics?: {
    distanceMeters?: number | null
    durationSeconds?: number | null
    fuelLiters?: number | null
  }
}

export interface RouteStopTimelineProps {
  stops: readonly RouteStopTimelineStop[]
  estimates?: readonly RouteStopEstimateLike[]
  depotName?: string
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

const formatSaleCount = (count: number): string => (count === 1 ? '1 venta' : `${count} ventas`)
const formatMetric = (value: number | null | undefined, suffix: string): string =>
  value === null || value === undefined ? 'No disponible' : `${value}${suffix}`

/** Ordered, provider-independent representation of a route's stops. */
export function RouteStopTimeline({ stops, estimates = [], depotName = 'el depósito' }: RouteStopTimelineProps) {
  const estimateBySequence = new Map(estimates.map((estimate) => [estimate.sequence, estimate]))

  return (
    <section aria-labelledby="route-stop-timeline-title">
      <h3 id="route-stop-timeline-title" className="text-sm font-semibold text-text-primary">
        Secuencia de paradas
      </h3>
      <p className="mt-1 text-xs text-text-secondary">Salida desde {depotName} y regreso al finalizar.</p>
      {stops.length === 0 ? (
        <p role="status" className="mt-3 rounded-md border border-border-subtle p-3 text-xs text-text-secondary">
          No hay paradas disponibles.
        </p>
      ) : (
        <ol aria-label="Paradas del recorrido" className="mt-3 flex flex-col gap-2">
          {stops.map((stop, index) => {
            const estimate = estimateBySequence.get(index + 1)
            return (
              <li key={stop.clientId} className="rounded-md border border-border-subtle bg-background-subtle p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary">Parada {index + 1}</span>
                  <span className="font-mono text-xs text-text-secondary">{stop.clientId}</span>
                  <span className="text-xs text-text-secondary">{formatSaleCount(stop.saleIds.length)}</span>
                </div>
                {(stop.displayName || stop.addressSummary) && (
                  <p className="mt-1 text-xs text-text-secondary">
                    {stop.displayName ?? stop.clientId}{stop.addressSummary ? ` · ${stop.addressSummary}` : ''}
                  </p>
                )}
                <dl className="mt-2 grid gap-1 text-xs text-text-secondary sm:grid-cols-2">
                  <div>
                    <dt className="inline">Llegada estimada: </dt>
                    <dd className="inline">{formatArrival(estimate?.arrival)}</dd>
                  </div>
                  <div>
                    <dt className="inline">Pedidos vinculados: </dt>
                    <dd className="inline">{stop.saleIds.join(', ') || 'No disponible'}</dd>
                  </div>
                  {stop.metrics && <div><dt className="inline">Métricas: </dt><dd className="inline">{formatMetric(stop.metrics.distanceMeters, ' m')} · {formatMetric(stop.metrics.durationSeconds, ' s')} · {formatMetric(stop.metrics.fuelLiters, ' L')}</dd></div>}
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
