'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { Loader2, Map, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { routePlanService } from '@/services/routePlan.service'
import type { DeliveryZone, RouteDashboard as RouteDashboardData } from '@/interfaces/routePlan.interface'
import { RouteKpiCards } from './RouteKpiCards'
import { PlannedRouteCard } from './PlannedRouteCard'
import { RouteConfigDialog } from './RouteConfigDialog'
import { GeocodingDialog } from './GeocodingDialog'

type LoadStatus = 'loading' | 'ready' | 'error'

const today = (): string => new Date().toISOString().slice(0, 10)

export function RouteDashboard() {
  const dateId = useId()
  const zoneId = useId()
  const [serviceDate, setServiceDate] = useState(today)
  const [zoneCode, setZoneCode] = useState('')
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zonesStatus, setZonesStatus] = useState<LoadStatus>('loading')
  const [dashboard, setDashboard] = useState<RouteDashboardData | null>(null)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [configOpen, setConfigOpen] = useState(false)
  const [geocodingClient, setGeocodingClient] = useState<{ id: string; name: string; address?: string } | null>(null)

  const loadZones = useCallback(async () => {
    setZonesStatus('loading')
    try {
      const result = await routePlanService.getActiveDeliveryZones()
      setZones(result)
      setZoneCode((current) => current || result[0]?.code || '')
      setZonesStatus('ready')
    } catch {
      setZones([])
      setZonesStatus('error')
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    if (zoneCode === '') return
    setStatus('loading')
    try {
      const result = await routePlanService.getDashboard({ serviceDate, zoneCode })
      setDashboard(result)
      setStatus('ready')
    } catch {
      setDashboard(null)
      setStatus('error')
    }
  }, [serviceDate, zoneCode])

  useEffect(() => {
    void loadZones()
  }, [loadZones])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const isEmpty = dashboard !== null && dashboard.routes.length === 0 && dashboard.candidates.eligible.length === 0

  return (
    <section aria-labelledby="route-dashboard-title" className="mb-8 flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 id="route-dashboard-title" className="text-heading-sm font-semibold text-text-primary">
            Panel de optimización de rutas
          </h2>
          <p className="mt-1 text-label text-text-secondary">
            Consultá el estado de las rutas, clientes y distancia proyectada para una fecha y zona.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfigOpen(true)}><Settings aria-hidden="true" /> Configurar ubicaciones</Button>
          <Button type="button" variant="secondary" onClick={() => void loadDashboard()} disabled={status === 'loading' || zoneCode === ''}>
          <RefreshCw aria-hidden="true" />
          Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-border-subtle bg-surface-base p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor={dateId}>Fecha de servicio</Label>
          <input
            id={dateId}
            type="date"
            value={serviceDate}
            onChange={(event) => setServiceDate(event.target.value)}
            className="h-10 rounded-md border border-border-subtle bg-surface-base px-3 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-state-focus"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={zoneId}>Zona de entrega</Label>
          <select
            id={zoneId}
            value={zoneCode}
            disabled={zonesStatus !== 'ready'}
            onChange={(event) => setZoneCode(event.target.value)}
            className="h-10 rounded-md border border-border-subtle bg-surface-base px-3 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Seleccioná una zona</option>
            {zones.map((zone) => <option key={zone._id} value={zone.code}>{zone.name}</option>)}
          </select>
        </div>
        <Button type="button" onClick={() => void loadDashboard()} disabled={status === 'loading' || zoneCode === ''}>
          Consultar dashboard
        </Button>
      </div>

      {zonesStatus === 'loading' && (
        <p role="status" className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando zonas…
        </p>
      )}
      {zonesStatus === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error">
          <span>No se pudieron cargar las zonas de entrega.</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadZones()}>Reintentar</Button>
        </div>
      )}
      {status === 'loading' && zoneCode !== '' && (
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando dashboard…
        </p>
      )}
      {status === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error">
          <span>No se pudo cargar el dashboard de rutas.</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadDashboard()}>Reintentar</Button>
        </div>
      )}
      {status === 'ready' && dashboard !== null && (
        <>
          <RouteKpiCards kpis={dashboard.kpis} />
          {isEmpty ? (
            <p role="status" className="rounded-lg border border-border-subtle bg-surface-base p-5 text-sm text-text-secondary">
              No hay rutas ni clientes pendientes para la fecha y zona seleccionadas.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <section aria-labelledby="planned-routes-title" className="rounded-lg border border-border-subtle bg-surface-base p-5">
                <h3 id="planned-routes-title" className="text-base font-semibold text-text-primary">Rutas planificadas</h3>
                <div className="mt-4 flex flex-col gap-3">{dashboard.routes.map((route) => <PlannedRouteCard key={route.id} route={route} />)}</div>
              </section>
              <section aria-labelledby="dashboard-clients-title" className="rounded-lg border border-border-subtle bg-surface-base p-5">
                <h3 id="dashboard-clients-title" className="text-base font-semibold text-text-primary">Clientes con pedidos</h3>
                <p className="mt-1 text-sm text-text-secondary">{dashboard.candidates.eligible.length} elegibles · {dashboard.candidates.blocked.length} bloqueados</p>
                <ul className="mt-4 flex flex-col gap-2" aria-label="Clientes y pedidos">
                  {dashboard.candidates.eligible.map((candidate) => <li key={candidate.saleId} className="rounded-md border border-border-subtle p-3"><p className="font-medium text-text-primary">{candidate.displayName ?? candidate.saleId}</p><p className="text-xs text-text-secondary">{candidate.addressSummary ?? 'Dirección no disponible'} · Pedido elegible</p></li>)}
                   {dashboard.candidates.blocked.map((candidate) => <li key={candidate.saleId} className="rounded-md border border-state-warning p-3"><p className="font-medium text-text-primary">{candidate.displayName ?? candidate.saleId}</p><p className="text-xs text-state-warning">{candidate.reasons.map((reason) => reason === 'CLIENT_LOCATION_MISSING' ? 'La ubicación del cliente no está disponible' : reason === 'CLIENT_LOCATION_UNCONFIRMED' ? 'La ubicación necesita confirmación' : reason).join(' · ')}</p>{candidate.clientId !== undefined && (candidate.reasons.includes('CLIENT_LOCATION_MISSING') || candidate.reasons.includes('CLIENT_LOCATION_UNCONFIRMED')) && <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setGeocodingClient({ id: candidate.clientId as string, name: candidate.displayName ?? candidate.saleId, address: candidate.addressSummary })}>Buscar ubicación</Button>}</li>)}
                 </ul>
              </section>
            </div>
          )}
          {dashboard.warnings.length > 0 && <div role="alert" className="rounded-lg border border-state-warning bg-surface-base p-4 text-sm text-state-warning">{dashboard.warnings.join(' · ')}</div>}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section aria-labelledby="route-map-title" className="rounded-lg border border-border-subtle bg-surface-base p-5">
              <h3 id="route-map-title" className="flex items-center gap-2 text-base font-semibold text-text-primary"><Map aria-hidden="true" /> Mapa de rutas</h3>
              <p className="mt-3 rounded-md border border-border-subtle bg-background-subtle p-4 text-sm text-text-secondary">El mapa es complementario. La secuencia textual de cada ruta permanece disponible aunque el proveedor o la API de mapas no estén disponibles.</p>
              {dashboard.routes.some((route) => route.stale) && <p role="status" className="mt-3 rounded-md border border-state-warning p-3 text-sm text-state-warning">Hay snapshots desactualizados. Se muestran en modo solo lectura; generá una nueva ruta para actualizar.</p>}
            </section>
            <section aria-labelledby="route-detail-title" className="rounded-lg border border-border-subtle bg-surface-base p-5">
              <h3 id="route-detail-title" className="text-base font-semibold text-text-primary">Detalle de ruta</h3>
              {dashboard.routes.length === 0 ? <p className="mt-3 text-sm text-text-secondary">No hay una ruta seleccionada.</p> : <ul className="mt-3 flex flex-col gap-2">{dashboard.routes[0].selectedSaleIds.map((saleId, index) => <li key={saleId} className="rounded-md border border-border-subtle p-3 text-sm text-text-secondary">Parada {index + 1}: {saleId}</li>)}</ul>}
              {dashboard.routes[0]?.metrics.fuelLiters === null && <p role="status" className="mt-3 text-sm text-state-warning">Litros de combustible no disponibles: falta el consumo del vehículo asignado.</p>}
            </section>
          </div>
        </>
      )}
      {configOpen && <RouteConfigDialog open onOpenChange={setConfigOpen} />}
      {geocodingClient !== null && <GeocodingDialog open clientId={geocodingClient.id} clientName={geocodingClient.name} address={geocodingClient.address} onOpenChange={(open) => { if (!open) setGeocodingClient(null) }} onConfirmed={() => { setGeocodingClient(null); void loadDashboard() }} />}
    </section>
  )
}
