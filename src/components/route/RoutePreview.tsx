 'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  ROUTE_FACTOR_LABEL,
  ROUTE_PREVIEW_WARNING,
  ROUTE_PREVIEW_WARNING_LABEL,
  routePreviewErrorMessage,
  type RoutePreview as RoutePreviewData,
} from '@/interfaces/routePlan.interface'
import { RouteMap } from './RouteMap'
import { RouteStopTimeline, type RouteStopEstimateLike, type RouteStopTimelineStop } from './RouteStopTimeline'

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

interface PreviewDashboardFields {
  stopEstimates?: readonly RouteStopEstimateLike[]
}

interface RouteTabsProps {
  route: RoutePreviewData['route']
  estimates?: readonly RouteStopEstimateLike[]
  depotName?: string
  stale?: boolean
  readWarnings?: readonly string[]
}

const RouteTabs = ({ route, estimates, depotName, stale = false, readWarnings = [] }: RouteTabsProps) => {
  const [activeTab, setActiveTab] = useState('map')
  const tabs = [
    { id: 'map', label: 'Mapa' },
    { id: 'sequence', label: 'Secuencia de paradas' },
    { id: 'sales', label: 'Pedidos vinculados' },
  ]
  const panelId = (id: string) => `route-tabpanel-${id}`

  return (
    <div className="mt-5">
      <div role="tablist" aria-label="Vistas del recorrido" className="flex flex-wrap gap-2 border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={panelId(tab.id)}
            id={`route-tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className="border-b-2 border-transparent px-3 py-2 text-sm text-text-secondary aria-selected:border-brand-primary aria-selected:text-brand-primary"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={panelId('map')} aria-labelledby="route-tab-map" hidden={activeTab !== 'map'} className="pt-4">
        <RouteMap route={route} />
        <div className="mt-5"><RouteStopTimeline stops={route.stops as readonly RouteStopTimelineStop[]} estimates={estimates} depotName={depotName} /></div>
      </div>
      <div role="tabpanel" id={panelId('sequence')} aria-labelledby="route-tab-sequence" hidden={activeTab !== 'sequence'} className="pt-4">
        <RouteStopTimeline stops={route.stops as readonly RouteStopTimelineStop[]} estimates={estimates} depotName={depotName} />
      </div>
      <div role="tabpanel" id={panelId('sales')} aria-labelledby="route-tab-sales" hidden={activeTab !== 'sales'} className="pt-4">
        <h4 className="text-sm font-semibold text-text-primary">Pedidos vinculados</h4>
        <ul aria-label="Pedidos vinculados" className="mt-3 flex flex-col gap-2">
          {route.stops.flatMap((stop) => stop.saleIds).map((saleId) => <li key={saleId} className="rounded-md border border-border-subtle bg-background-subtle p-3 text-xs text-text-secondary">{saleId}</li>)}
        </ul>
      </div>
      {stale && <p role="status" className="mt-4 rounded-md border border-state-warning p-3 text-xs text-state-warning">Este snapshot está desactualizado y es de solo lectura. Para actualizarlo, generá una nueva ruta.</p>}
      {readWarnings.map((warning) => <p key={warning} className="mt-2 text-xs text-state-warning">{warning}</p>)}
    </div>
  )
}

export { RouteTabs }

const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

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

const factorLabel = (factor: string): string => ROUTE_FACTOR_LABEL[factor] ?? factor

/**
 * Focused route preview output (T-F.4) with the map boundary (T-F.5a).
 *
 * Renders loading, terminal error, empty and ready states. `MAP_UNAVAILABLE` is
 * a non-terminal warning: the calculated data stays visible and the ordered
 * stop list acts as the text fallback when no map is available. When the
 * backend does not flag the map as unavailable, `RouteMap` is rendered as a
 * progressive enhancement; it keeps its own accessible fallback when the key or
 * API is unavailable, so metrics, warnings and the ordered list are never
 * hidden. The client must never reorder `route.stops`; the backend already
 * returns them in route order.
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
  const dashboard = preview as RoutePreviewData & PreviewDashboardFields

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

      <RouteTabs route={preview.route} estimates={dashboard.stopEstimates} depotName={preview.route.depot.name} />

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
