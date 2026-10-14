import type { RoutePreviewSegment, RoutePreviewStop } from '@/interfaces/routePlan.interface'
import { Clock3, FileText, House, Navigation } from 'lucide-react'

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
  showHeader?: boolean
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

const formatMetric = (label: string, value: string, Icon: typeof Navigation) => (
  <div className="flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
    <Icon className="size-4 shrink-0 text-brand-primary" aria-hidden="true" />
    <span className="sr-only">{label}: </span>
    <span className="truncate">{value}</span>
  </div>
)

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
export function RouteStopTimeline({ stops, segments = [], estimates = [], depot = { name: 'el depósito' }, showHeader = true }: RouteStopTimelineProps) {
  const estimateBySequence = new Map(estimates.map((estimate) => [estimate.sequence, estimate]))
  const segmentByDestination = new Map(segments.map((segment) => [segment.toId, segment]))
  const unavailableAddress = 'Dirección no disponible'

  return (
    <section aria-labelledby={showHeader ? 'route-stop-timeline-title' : undefined}>
      {showHeader && <>
        <h3 id="route-stop-timeline-title" className="text-sm font-semibold text-text-primary">
          Secuencia de paradas
        </h3>
        <p className="mt-1 text-xs text-text-secondary">Salida desde {depot.name} y regreso al finalizar.</p>
      </>}
      {stops.length === 0 ? (
        <p role="status" className="mt-3 rounded-md border border-border-subtle p-3 text-xs text-text-secondary">
          No hay paradas disponibles.
        </p>
      ) : (
        <ol aria-label="Paradas del recorrido" className="mt-3 flex flex-col">
          <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-b border-border-subtle py-3 first:pt-2 md:grid-cols-[2.25rem_minmax(0,1fr)_6rem_6rem_6rem] md:gap-4">
            <div className="flex justify-center">
              <span aria-label="Depósito" className="flex size-8 items-center justify-center text-state-error">
                <House className="size-7" aria-hidden="true" fill="currentColor" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Depósito de origen</p>
              <p className="mt-1 truncate text-xs text-text-secondary">{depot.name}{depot.address ? ` · ${depot.address}` : ` · ${unavailableAddress}`}</p>
            </div>
            <dl className="col-start-2 grid grid-cols-3 gap-3 md:col-auto md:contents">
              {formatMetric('Distancia', formatKilometers(0), Navigation)}
              {formatMetric('Duración', formatDuration(0), Clock3)}
              {formatMetric('Pedidos', '0 pedidos', FileText)}
            </dl>
          </li>
          {stops.map((stop, index) => {
            const estimate = estimateBySequence.get(index + 1)
            const segment = segmentByDestination.get(stop.clientId)
            const distance = segment ? formatKilometers(segment.distanceMeters) : 'No disponible'
            const duration = segment ? formatDuration(segment.durationSeconds) : 'No disponible'
            return (
              <li key={stop.clientId} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-b border-border-subtle py-3 last:border-b-0 md:grid-cols-[2.25rem_minmax(0,1fr)_6rem_6rem_6rem] md:gap-4">
                <div className="relative flex justify-center">
                  <span aria-hidden="true" className="absolute bottom-[-0.75rem] top-[-0.75rem] border-l border-dashed border-border-subtle" />
                  <span aria-label={`Parada ${index + 1}`} className="z-10 flex size-8 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary"><span className="sr-only">Parada {index + 1}: </span>Cliente: {stop.displayName ?? stop.clientId}</p>
                  <p className="mt-1 truncate text-xs text-text-secondary">{stop.addressSummary ?? unavailableAddress}</p>
                  <dl className="sr-only">
                    <div><dt>Llegada estimada</dt><dd>{formatArrival(estimate?.arrival)}</dd></div>
                    {estimate?.serviceWindow && <div><dt>Ventana de servicio</dt><dd>{estimate.serviceWindow}</dd></div>}
                  </dl>
                </div>
                <dl className="col-start-2 grid grid-cols-3 gap-3 md:col-auto md:contents">
                  {formatMetric('Distancia', distance, Navigation)}
                  {formatMetric('Duración', duration, Clock3)}
                  {formatMetric('Pedidos', formatOrderCount(stop.saleIds.length), FileText)}
                </dl>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
