 'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  type CandidateEntry,
  type RouteSaleReference,
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
  /** Candidate data already loaded by the planner, used for stop labels. */
  candidateEntries?: readonly CandidateEntry[]
}

interface PreviewDashboardFields {
  stopEstimates?: readonly RouteStopEstimateLike[]
  saleReferences?: readonly RouteSaleReference[]
}

interface RouteTabsProps {
  route: RoutePreviewData['route']
  estimates?: readonly RouteStopEstimateLike[]
  saleReferences?: readonly RouteSaleReference[]
  depotName?: string
  depotAddress?: string
  candidateEntries?: readonly CandidateEntry[]
  stale?: boolean
  readWarnings?: readonly string[]
}

const RouteTabs = ({ route, estimates, saleReferences, depotName, depotAddress, candidateEntries = [], stale = false, readWarnings = [] }: RouteTabsProps) => {
  const [activeTab, setActiveTab] = useState('map')
  const tabs = [
    { id: 'map', label: 'Mapa de la ruta' },
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
        <RouteMap route={route} minimal />
      </div>
      <div role="tabpanel" id={panelId('sequence')} aria-labelledby="route-tab-sequence" hidden={activeTab !== 'sequence'} className="pt-4">
        <RouteStopTimeline
          stops={route.stops.map((stop) => {
            const candidate = candidateEntries.find((entry) => entry.clientId === stop.clientId || stop.saleIds.includes(entry.saleId))
            return { ...stop, displayName: candidate?.displayName, addressSummary: candidate?.addressSummary }
          }) as readonly RouteStopTimelineStop[]}
          segments={route.segments}
          estimates={estimates}
          depot={{ name: depotName ?? route.depot.name, address: depotAddress ?? route.depot.address }}
          showHeader={false}
        />
      </div>
      <div role="tabpanel" id={panelId('sales')} aria-labelledby="route-tab-sales" hidden={activeTab !== 'sales'} className="pt-4">
        <h4 className="text-sm font-semibold text-text-primary">Pedidos vinculados</h4>
        <ul aria-label="Pedidos vinculados" className="mt-3 flex flex-col gap-2">
          {(saleReferences?.length
            ? saleReferences.map((reference) => (
                <li key={reference.saleId} className="rounded-md border border-border-subtle bg-background-subtle p-3 text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">{reference.saleId}</span>
                  {reference.currentStatus && <span className="ml-2">Estado: {reference.currentStatus}</span>}
                </li>
              ))
            : route.stops.flatMap((stop) => stop.saleIds).map((saleId) => (
                <li key={saleId} className="rounded-md border border-border-subtle bg-background-subtle p-3 text-xs text-text-secondary">{saleId}</li>
              )))}
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
export function RoutePreview({ status, preview, candidateEntries = [] }: RoutePreviewProps) {
  if (status === 'idle') return null

  if (status === 'loading') {
    return (
        <div role="status" aria-live="polite" className="flex min-h-[38rem] items-center justify-center gap-3 text-text-secondary">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span>Calculando ruta</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        role="alert"
        className="flex min-h-[38rem] items-center justify-center rounded-lg border border-state-error bg-surface-base p-4 text-center text-sm text-state-error shadow-md"
      >
        Tuvimos inconvenientes a generar la ruta, por favor cerrar la ventana e intentar nuevamente
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
          <dt className="text-xs text-text-secondary">Paradas / Clientes</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">{preview.metrics.stopCount}</dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Distancia total</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatKilometers(preview.metrics.distanceMeters)}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Tiempo estimado</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatDuration(preview.metrics.durationSeconds)}
          </dd>
        </div>
        <div className="rounded-md border border-border-subtle bg-background-subtle p-3">
          <dt className="text-xs text-text-secondary">Combustible estimado</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {formatLiters(preview.metrics.fuelLiters)}
          </dd>
        </div>
      </dl>

      <RouteTabs
        route={preview.route}
        estimates={dashboard.stopEstimates ?? preview.stopEstimates}
        saleReferences={dashboard.saleReferences ?? preview.saleReferences}
        depotName={preview.route.depot.name}
        depotAddress={preview.route.depot.address}
        candidateEntries={candidateEntries}
      />
    </section>
  )
}
