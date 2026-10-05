import { Loader2 } from 'lucide-react'
import {
  ROUTE_FACTOR_LABEL,
  ROUTE_PREVIEW_WARNING,
  ROUTE_PREVIEW_WARNING_LABEL,
  routePreviewErrorMessage,
  type RoutePreview as RoutePreviewData,
} from '@/interfaces/routePlan.interface'

export type RoutePreviewStatus = 'idle' | 'loading' | 'ready' | 'error'

interface RoutePreviewProps {
  /** Lifecycle of the preview request owned by the planner. */
  status: RoutePreviewStatus
  /** Calculated preview, present only when the request succeeded. */
  preview: RoutePreviewData | null
  /** Stable backend error code, when the request failed. */
  errorCode?: string | null
  /** Backend message, used as a fallback for unknown error codes. */
  errorMessage?: string | null
}

const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

const formatKilometers = (meters: number): string => `${decimal.format(meters / 1000)} km`

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`
  if (hours > 0) return `${hours} h`
  return `${minutes} min`
}

const formatLiters = (liters: number): string => `${decimal.format(liters)} L`

const formatSaleCount = (count: number): string => (count === 1 ? '1 venta' : `${count} ventas`)

const warningLabel = (warning: string): string => ROUTE_PREVIEW_WARNING_LABEL[warning] ?? warning

const factorLabel = (factor: string): string => ROUTE_FACTOR_LABEL[factor] ?? factor

/**
 * Focused route preview output (T-F.4).
 *
 * Renders loading, terminal error, empty and ready states. `MAP_UNAVAILABLE` is
 * a non-terminal warning: the calculated data stays visible and the ordered
 * stop list acts as the text fallback when no map is available. The client must
 * never reorder `route.stops`; the backend already returns them in route order.
 */
export function RoutePreview({ status, preview, errorCode, errorMessage }: RoutePreviewProps) {
  if (status === 'idle') return null

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-3 text-text-secondary">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span>Calculando recorrido…</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        role="alert"
        className="rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error shadow-md"
      >
        {routePreviewErrorMessage(errorCode, errorMessage ?? undefined)}
      </div>
    )
  }

  if (preview === null) return null

  if (preview.route.stops.length === 0) {
    return (
      <p
        role="status"
        className="rounded-lg border border-border-subtle bg-surface-base p-4 text-sm text-text-secondary shadow-md"
      >
        El recorrido no tiene paradas.
      </p>
    )
  }

  const mapUnavailable = preview.warnings.includes(ROUTE_PREVIEW_WARNING.MAP_UNAVAILABLE)

  return (
    <section
      aria-labelledby="route-preview-title"
      className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-md md:p-6"
    >
      <h3 id="route-preview-title" className="text-sm font-semibold text-brand-primary">
        Recorrido propuesto
      </h3>
      <p className="mt-1 text-xs text-text-secondary">
        Orden calculado de paradas, métricas y advertencias para las ventas seleccionadas.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Distancia</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatKilometers(preview.metrics.distanceMeters)}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Duración</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatDuration(preview.metrics.durationSeconds)}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Paradas</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{preview.metrics.stopCount}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Combustible</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatLiters(preview.metrics.fuelLiters)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-text-primary">Paradas del recorrido</h4>
        <p className="mt-1 text-xs text-text-secondary">Salida desde {preview.route.depot.name}</p>
        <ol aria-label="Paradas del recorrido" className="mt-3 flex flex-col gap-2">
          {preview.route.stops.map((stop, index) => (
            <li
              key={stop.clientId}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border-subtle bg-background-subtle p-3"
            >
              <span className="text-sm font-medium text-text-primary">Parada {index + 1}</span>
              <span className="font-mono text-xs text-text-secondary">{stop.clientId}</span>
              <span className="text-xs text-text-secondary">{formatSaleCount(stop.saleIds.length)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-text-secondary">Regreso a {preview.route.depot.name}</p>
      </div>

      {mapUnavailable && (
        <p className="mt-4 text-xs text-text-secondary">
          Se muestra el recorrido como lista porque el mapa no está disponible.
        </p>
      )}

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-text-primary">Factores considerados</h4>
        <ul aria-label="Factores considerados" className="mt-2 flex flex-wrap gap-2">
          {preview.factorsConsidered.map((factor) => (
            <li
              key={factor}
              className="rounded-md border border-border-subtle bg-background-subtle px-2 py-1 text-xs text-text-secondary"
            >
              {factorLabel(factor)}
            </li>
          ))}
        </ul>
      </div>

      {preview.warnings.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-state-warning">Advertencias</h4>
          <ul aria-label="Advertencias" className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {preview.warnings.map((warning) => (
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
