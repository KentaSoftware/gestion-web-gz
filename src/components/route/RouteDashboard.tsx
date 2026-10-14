'use client'

import { useEffect, useState } from 'react'
import { Filter, Loader2, Map, MapPin, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { routePlanService } from '@/services/routePlan.service'
import type { DeliveryZone, RouteDashboard as RouteDashboardData } from '@/interfaces/routePlan.interface'
import { RouteKpiCards } from './RouteKpiCards'
import { PlannedRouteCard } from './PlannedRouteCard'
import { RouteConfigDialog } from './RouteConfigDialog'
import { GeocodingDialog } from './GeocodingDialog'
import { RouteMap } from './RouteMap'
import { RouteStopTimeline, type RouteStopTimelineStop } from './RouteStopTimeline'
import type { RoutePreview } from '@/interfaces/routePlan.interface'

type LoadStatus = 'loading' | 'ready' | 'error'
type ZoneStatus = 'loading' | 'ready' | 'error'

const CLIENT_PAGE_SIZE = 5

interface RouteDashboardProps {
  onGenerateRoutes?: (serviceDate: string, deliveryZoneId: string) => void
  refreshToken?: number
}

export function RouteDashboard({ onGenerateRoutes, refreshToken = 0 }: RouteDashboardProps = {}) {
  const [dashboard, setDashboard] = useState<RouteDashboardData | null>(null)
  const [clientPage, setClientPage] = useState(1)
  const [clientQuery, setClientQuery] = useState('')
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [mapVisible, setMapVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [focusRegionId, setFocusRegionId] = useState<string | null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [geocodingClient, setGeocodingClient] = useState<{ id: string; name: string; address?: string } | null>(null)
  const [serviceDate, setServiceDate] = useState('')
  const [deliveryZoneId, setDeliveryZoneId] = useState('')
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus>('loading')
  const [planningVisible, setPlanningVisible] = useState(true)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setMapVisible(false)
    setDetailVisible(false)
    setFocusRegionId(null)
    void routePlanService.getDashboard({}).then((result) => {
      if (cancelled) return
      setDashboard(result)
      setClientPage(1)
      setSelectedRouteId(result.routes[0]?.id ?? null)
      setStatus('ready')
    }).catch(() => {
      if (!cancelled) {
        setDashboard(null)
        setStatus('error')
      }
    })
    return () => { cancelled = true }
  }, [reloadToken, refreshToken])

  useEffect(() => {
    let cancelled = false
    setZoneStatus('loading')
    void routePlanService.getActiveDeliveryZones().then((activeZones) => {
      if (cancelled) return
      setZones(activeZones)
      setZoneStatus('ready')
    }).catch(() => {
      if (cancelled) return
      setZones([])
      setZoneStatus('error')
    })
    return () => { cancelled = true }
  }, [])

  const loadZones = () => {
    setZoneStatus('loading')
    void routePlanService.getActiveDeliveryZones().then((activeZones) => {
      setZones(activeZones)
      setZoneStatus('ready')
    }).catch(() => {
      setZones([])
      setZoneStatus('error')
    })
  }

  const clientCandidates = dashboard === null
    ? []
    : [
        ...dashboard.candidates.eligible.map((candidate) => ({ candidate, blocked: false as const })),
         ...dashboard.candidates.blocked.map((candidate) => ({ candidate, blocked: true as const })),
       ]
  const normalizedClientQuery = clientQuery.trim().toLocaleLowerCase()
  const filteredClientCandidates = normalizedClientQuery === ''
    ? clientCandidates
    : clientCandidates.filter(({ candidate }) => [candidate.displayName, candidate.addressSummary, candidate.saleId]
        .some((value) => value?.toLocaleLowerCase().includes(normalizedClientQuery)))
  const clientPageCount = Math.max(1, Math.ceil(filteredClientCandidates.length / CLIENT_PAGE_SIZE))
  const visibleClientCandidates = filteredClientCandidates.slice((clientPage - 1) * CLIENT_PAGE_SIZE, clientPage * CLIENT_PAGE_SIZE)
  const selectedRoute = dashboard?.routes.find((route) => route.id === selectedRouteId) ?? dashboard?.routes[0]
  useEffect(() => {
    if (focusRegionId === null) return
    let cancelled = false
    const frameId = window.requestAnimationFrame(() => {
      if (cancelled) return
      const region = document.getElementById(focusRegionId)
      if (!(region instanceof HTMLElement)) return
      region.focus({ preventScroll: true })
      region.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFocusRegionId(null)
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [focusRegionId, mapVisible, detailVisible])
  const handleRouteAction = (routeId: string, regionId: string) => {
    setSelectedRouteId(routeId)
    if (regionId === 'route-map-region') setMapVisible(true)
    if (regionId === 'route-detail-region') setDetailVisible(true)
    setFocusRegionId(regionId)
  }
  const selectedRoutePreview: RoutePreview['route'] | null = selectedRoute?.depot && selectedRoute.stops
    ? {
         depot: { id: 'deposito_1', ...selectedRoute.depot },
         stops: selectedRoute.stops.map((stop) => ({
           clientId: stop.clientId,
           saleIds: [...stop.saleIds],
           latitude: stop.latitude,
           longitude: stop.longitude,
         })),
        segments: (selectedRoute.segments ?? []).map((segment) => ({
          fromId: segment.fromStopSequence === 0 ? 'deposito_1' : selectedRoute.stops?.find((stop) => stop.sequence === segment.fromStopSequence)?.clientId ?? 'deposito_1',
          toId: segment.toStopSequence === 0 ? 'deposito_1' : selectedRoute.stops?.find((stop) => stop.sequence === segment.toStopSequence)?.clientId ?? 'deposito_1',
          distanceMeters: segment.distanceMeters,
          durationSeconds: segment.durationSeconds,
        })),
        encodedPolyline: selectedRoute.encodedPolyline ?? '',
      }
    : null

  return (
    <section aria-labelledby="route-dashboard-title" className="mb-8 flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 id="route-dashboard-title" className="text-heading-sm font-semibold text-text-primary">
            Optimización de Rutas
          </h2>
          <p className="mt-1 text-label text-text-secondary">
            Planificá y asigná rutas de entrega de forma eficiente
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfigOpen(true)}><Settings aria-hidden="true" /> Configurar ubicaciones</Button>
          <Button
            type="button"
            variant="secondary"
            aria-expanded={planningVisible}
            aria-controls="route-planning-bar"
            onClick={() => setPlanningVisible((visible) => !visible)}
          >
            <Filter aria-hidden="true" /> {planningVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
          </Button>
        </div>
      </div>
      {status === 'loading' && (
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando dashboard…
        </p>
      )}
      {status === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-state-error bg-surface-base p-4 text-sm text-state-error">
          <span>No se pudo cargar el dashboard de rutas.</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setReloadToken((token) => token + 1)}>Reintentar</Button>
        </div>
      )}
      {status === 'ready' && dashboard !== null && (
        <>
          <RouteKpiCards kpis={dashboard.kpis} />
          {planningVisible && (
            <div id="route-planning-bar" role="group" aria-label="Planificación de rutas" className="rounded-lg border border-border-subtle bg-surface-base p-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dashboard-service-date">Fecha de servicio</Label>
                  <input
                    id="dashboard-service-date"
                    name="serviceDate"
                    type="date"
                    value={serviceDate}
                    onChange={(event) => setServiceDate(event.target.value)}
                    className="h-10 rounded-md border border-border-subtle bg-surface-base px-3 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-state-focus"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="dashboard-delivery-zone">Zona de entrega</Label>
                  <select
                    id="dashboard-delivery-zone"
                    name="deliveryZoneId"
                    value={deliveryZoneId}
                    disabled={zoneStatus === 'loading'}
                    onChange={(event) => setDeliveryZoneId(event.target.value)}
                    className="h-10 rounded-md border border-border-subtle bg-surface-base px-3 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-state-focus disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Todas las zonas</option>
                    {zones.map((zone) => <option key={zone._id} value={zone._id}>{zone.name}</option>)}
                  </select>
                </div>
                 <Button type="button" disabled={serviceDate === '' || deliveryZoneId === ''} onClick={() => onGenerateRoutes?.(serviceDate, deliveryZoneId)}>Generar rutas</Button>
              </div>
              {zoneStatus === 'loading' && <p role="status" className="mt-3 text-sm text-text-secondary">Cargando zonas…</p>}
              {zoneStatus === 'error' && (
                <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-state-error">
                  <span>No se pudieron cargar las zonas de entrega.</span>
                  <Button type="button" variant="secondary" size="sm" onClick={loadZones}>Reintentar</Button>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
              <section aria-labelledby="planned-routes-title" className="rounded-lg border border-border-subtle bg-surface-base p-5">
                 <div className="flex flex-wrap items-start justify-between gap-3">
                   <h3 id="planned-routes-title" className="text-base font-semibold text-text-primary">Rutas planificadas ({dashboard.routes.length})</h3>
                   <div role="group" aria-label="Estados de ruta" className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-state-warning" aria-hidden="true" />Pendiente</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-state-info" aria-hidden="true" />En progreso</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-state-success" aria-hidden="true" />Completada</span>
                  </div>
                </div>
                    <div className="mt-4 flex flex-col gap-3">
                      {dashboard.routes.length === 0 ? (
                        <p role="status" className="flex min-h-32 items-center justify-center rounded-md border border-border-subtle bg-background-subtle p-4 text-center text-sm text-text-secondary">
                          No existen rutas planificadas para el usuario
                        </p>
                      ) : dashboard.routes.map((route) => (
                        <PlannedRouteCard
                          key={route.id}
                          route={route}
                          selected={selectedRoute?.id === route.id}
                          onSelect={() => setSelectedRouteId(route.id)}
                          onViewMap={() => handleRouteAction(route.id, 'route-map-region')}
                          onPreview={() => handleRouteAction(route.id, 'route-detail-region')}
                        />
                      ))}
                    </div>
                </section>
             <section aria-labelledby="dashboard-clients-title" className="rounded-lg border border-border-subtle bg-surface-base p-5">
                <h3 id="dashboard-clients-title" className="text-base font-semibold text-text-primary">Clientes con pedidos ({clientCandidates.length})</h3>
                <p className="mt-1 text-sm text-text-secondary">{dashboard.candidates.eligible.length} elegibles · {dashboard.candidates.blocked.length} bloqueados{clientQuery.trim() !== '' ? ` · ${filteredClientCandidates.length} coincidencias` : ''}</p>
                 {clientCandidates.length === 0 ? (
                   <p role="status" className="mt-4 rounded-md border border-border-subtle bg-background-subtle p-3 text-sm text-text-secondary">
                     No hay clientes pendientes para asignar a una ruta.
                   </p>
                 ) : <>
                   <div className="mt-4 flex flex-col gap-2">
                     <Label htmlFor="dashboard-client-search">Buscar cliente o dirección…</Label>
                     <input
                       id="dashboard-client-search"
                       type="search"
                       value={clientQuery}
                       onChange={(event) => { setClientQuery(event.target.value); setClientPage(1) }}
                       placeholder="Buscar cliente o dirección…"
                       className="h-10 rounded-md border border-border-subtle bg-surface-base px-3 text-sm text-text-primary focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-state-focus"
                     />
                   </div>
                 {filteredClientCandidates.length === 0 ? (
                   <p role="status" aria-label="Clientes sin coincidencias" className="mt-4 rounded-md border border-border-subtle bg-background-subtle p-3 text-sm text-text-secondary">
                     No se encontraron clientes para la búsqueda.
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-2" aria-label="Clientes y pedidos">
                    {visibleClientCandidates.map(({ candidate, blocked }) => {
                      const hasCoordinates = Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude)
                      const distanceMeters = candidate.distanceMeters
                      const hasDistance = distanceMeters !== undefined && Number.isFinite(distanceMeters)
                      const locationStatus = blocked
                        ? candidate.reasons.includes('CLIENT_LOCATION_MISSING')
                          ? 'No posee coordenadas'
                          : candidate.reasons.includes('CLIENT_LOCATION_UNCONFIRMED')
                            ? 'Ubicación no confirmada'
                            : 'Pedido excluido'
                        : hasCoordinates ? 'Ubicación confirmada' : 'Ubicación no confirmada'
                      const reasonLabel = blocked ? candidate.reasons.map((reason) => reason === 'CLIENT_LOCATION_MISSING' ? 'La ubicación del cliente no está disponible' : reason === 'CLIENT_LOCATION_UNCONFIRMED' ? 'La ubicación necesita confirmación' : reason).join(' · ') : ''
                      return (
                        <li key={candidate.saleId} className={`rounded-md border p-3 ${blocked ? 'border-state-warning' : 'border-border-subtle'}`}>
                          <div className="flex items-start gap-2">
                            <MapPin className={`mt-0.5 size-4 shrink-0 ${blocked ? 'text-state-warning' : hasCoordinates ? 'text-state-success' : 'text-state-warning'}`} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-text-primary">{candidate.displayName ?? candidate.saleId}</p>
                              <p className="text-xs text-text-secondary">{candidate.addressSummary ?? 'Dirección no disponible'}</p>
                              <p className={`mt-1 text-xs ${blocked ? 'text-state-warning' : hasCoordinates ? 'text-state-success' : 'text-state-warning'}`}>
                                {locationStatus ?? reasonLabel}
                                {' · '}
                                {hasDistance ? `${(distanceMeters / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km` : 'Distancia no disponible'}
                              </p>
                              {blocked && <p className="mt-1 text-xs text-state-warning">{reasonLabel}</p>}
                              {blocked && candidate.clientId !== undefined && (candidate.reasons.includes('CLIENT_LOCATION_MISSING') || candidate.reasons.includes('CLIENT_LOCATION_UNCONFIRMED')) && <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setGeocodingClient({ id: candidate.clientId as string, name: candidate.displayName ?? candidate.saleId, address: candidate.addressSummary })}>Buscar ubicación</Button>}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                 )}
                 <nav aria-label="Paginación de clientes" className="mt-4 flex items-center justify-between gap-3">
                   <Button type="button" variant="secondary" size="sm" onClick={() => setClientPage((page) => page - 1)} disabled={clientPage === 1} aria-label="Página anterior">Anterior</Button>
                   <span role="status" aria-live="polite" className="text-sm text-text-secondary">Página {clientPage} de {clientPageCount}</span>
                   <Button type="button" variant="secondary" size="sm" onClick={() => setClientPage((page) => page + 1)} disabled={clientPage === clientPageCount} aria-label="Página siguiente">Siguiente</Button>
                  </nav>
                 </>}
               </section>
             </div>
          {dashboard.warnings.length > 0 && <div role="alert" className="rounded-lg border border-state-warning bg-surface-base p-4 text-sm text-state-warning">{dashboard.warnings.join(' · ')}</div>}
           {(mapVisible || detailVisible) && <div data-testid="route-lower-panels" className="grid w-full min-w-0 gap-4">
              {mapVisible && <section id="route-map-region" tabIndex={-1} aria-labelledby="route-map-title" className="w-full min-w-0 rounded-lg border border-border-subtle bg-surface-base p-5">
               <h3 id="route-map-title" className="flex items-center gap-2 text-base font-semibold text-text-primary"><Map aria-hidden="true" /> Mapa interactivo</h3>
              <p className="mt-3 rounded-md border border-border-subtle bg-background-subtle p-4 text-sm text-text-secondary">El mapa es complementario. La secuencia textual de la ruta seleccionada permanece disponible aunque el proveedor o la API de mapas no estén disponibles.</p>
              {selectedRoutePreview !== null ? <RouteMap route={selectedRoutePreview} mapLocations={dashboard.mapLocations ?? []} /> : <p role="status" className="mt-3 text-sm text-text-secondary">No hay detalle geográfico disponible para esta ruta.</p>}
              {dashboard.routes.some((route) => route.stale) && <p role="status" className="mt-3 rounded-md border border-state-warning p-3 text-sm text-state-warning">Hay snapshots desactualizados. Se muestran en modo solo lectura; generá una nueva ruta para actualizar.</p>}
             </section>}
              {detailVisible && <section id="route-detail-region" tabIndex={-1} aria-labelledby="route-detail-title" className="w-full min-w-0 rounded-lg border border-border-subtle bg-surface-base p-5">
              <h3 id="route-detail-title" className="text-base font-semibold text-text-primary">Detalle de ruta</h3>
              {selectedRoute === undefined ? <p className="mt-3 text-sm text-text-secondary">No hay una ruta seleccionada.</p> : (
                <>
                  <p className="mt-3 text-sm text-text-secondary">Ruta {selectedRoute.id} · {selectedRoute.status}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-text-secondary">Repartidor</dt><dd>{selectedRoute.assignments.driverId ?? 'Sin asignar'}</dd></div>
                    <div><dt className="text-text-secondary">Vehículo</dt><dd>{selectedRoute.assignments.vehicleId ?? 'Sin asignar'}</dd></div>
                    <div><dt className="text-text-secondary">Distancia</dt><dd>{(selectedRoute.metrics.distanceMeters / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km</dd></div>
                    <div><dt className="text-text-secondary">Duración</dt><dd>{Math.round(selectedRoute.metrics.durationSeconds / 60)} min</dd></div>
                    <div><dt className="text-text-secondary">Combustible</dt><dd>{selectedRoute.metrics.fuelLiters === null ? 'No disponible' : `${selectedRoute.metrics.fuelLiters.toLocaleString('es-AR')} L`}</dd></div>
                    <div><dt className="text-text-secondary">Paradas/clientes</dt><dd>{selectedRoute.clientCount}</dd></div>
                  </dl>
                   {selectedRoutePreview !== null ? <div className="mt-5"><RouteStopTimeline stops={selectedRoutePreview.stops.map((stop) => { const candidate = dashboard.candidates.eligible.find((entry) => entry.clientId === stop.clientId || stop.saleIds.includes(entry.saleId)); return { ...stop, displayName: candidate?.displayName, addressSummary: candidate?.addressSummary } }) as readonly RouteStopTimelineStop[]} segments={selectedRoutePreview.segments} estimates={selectedRoute.stopEstimates} depot={{ name: selectedRoute.depot?.name ?? 'el depósito', address: selectedRoute.depot?.address }} /></div> : <ul className="mt-3 flex flex-col gap-2">{selectedRoute.selectedSaleIds.map((saleId, index) => <li key={saleId} className="rounded-md border border-border-subtle p-3 text-sm text-text-secondary">Parada {index + 1}: {saleId}</li>)}</ul>}
                  {selectedRoute.saleReferences && selectedRoute.saleReferences.length > 0 && <p className="mt-3 text-xs text-text-secondary">Pedidos vinculados: {selectedRoute.saleReferences.map((reference) => reference.saleId).join(', ')}</p>}
                  {selectedRoute.metrics.fuelLiters === null && <p role="status" className="mt-3 text-sm text-state-warning">Litros de combustible no disponibles: falta el consumo del vehículo asignado.</p>}
                  {selectedRoute.stopEstimates === undefined && <p role="status" className="mt-3 text-sm text-state-warning">Horarios estimados no disponibles para esta ruta.</p>}
                  {selectedRoute.stale && <p role="status" className="mt-3 text-sm text-state-warning">Esta ruta está desactualizada y es de solo lectura; generá una nueva ruta para actualizarla.</p>}
                </>
              )}
             </section>}
           </div>}
        </>
      )}
      {configOpen && <RouteConfigDialog open onOpenChange={setConfigOpen} />}
      {geocodingClient !== null && <GeocodingDialog open clientId={geocodingClient.id} clientName={geocodingClient.name} address={geocodingClient.address} onOpenChange={(open) => { if (!open) setGeocodingClient(null) }} onConfirmed={() => { setGeocodingClient(null); setReloadToken((token) => token + 1) }} />}
    </section>
  )
}
