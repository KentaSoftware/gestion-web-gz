import type { RouteDashboardCard } from '@/interfaces/routePlan.interface'
import { Eye, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'

const statusLabel: Record<RouteDashboardCard['status'], string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
}

const formatDistance = (meters: number): string => `${(meters / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`
const formatDuration = (seconds: number): string => `${Math.round(seconds / 60)} min`

type PlannedRouteCardProps = {
  route: RouteDashboardCard
  selected: boolean
  onSelect: () => void
  onViewMap: () => void
  onPreview: () => void
}

export function PlannedRouteCard({ route, selected, onSelect, onViewMap, onPreview }: PlannedRouteCardProps) {
  return (
    <article className={`rounded-lg border border-border-subtle bg-surface-base p-4 shadow-sm ${selected ? 'ring-2 ring-brand-primary' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-text-primary">Ruta {route.id}</h4>
          <p className="text-sm text-text-secondary">Zona {route.zoneCode}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border border-border-subtle px-2 py-1 text-xs font-medium text-text-secondary">
            {statusLabel[route.status]}
          </span>
          <Button type="button" variant="secondary" size="sm" aria-label={`Seleccionar ruta ${route.id}`} aria-pressed={selected} onClick={onSelect}>
            Seleccionar
          </Button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-text-secondary">Repartidor</dt><dd className="font-medium text-text-primary">{route.assignments.driverId ?? 'Sin asignar'}</dd></div>
        <div><dt className="text-text-secondary">Vehículo</dt><dd className="font-medium text-text-primary">{route.assignments.vehicleId ?? 'Sin asignar'}</dd></div>
        <div><dt className="text-text-secondary">Distancia</dt><dd className="font-medium text-text-primary">{formatDistance(route.metrics.distanceMeters)}</dd></div>
        <div><dt className="text-text-secondary">Duración</dt><dd className="font-medium text-text-primary">{formatDuration(route.metrics.durationSeconds)}</dd></div>
        <div><dt className="text-text-secondary">Combustible</dt><dd className="font-medium text-text-primary">{route.metrics.fuelLiters === null ? 'No disponible' : `${route.metrics.fuelLiters.toLocaleString('es-AR')} L`}</dd></div>
        <div><dt className="text-text-secondary">Paradas/clientes</dt><dd className="font-medium text-text-primary">{route.clientCount}</dd></div>
      </dl>
      {(route.stale || route.warnings.length > 0) && (
        <ul className="mt-4 flex flex-col gap-1 text-sm text-state-warning" aria-label={`Advertencias de ${route.id}`}>
          {route.stale && <li>La información de esta ruta está desactualizada.</li>}
          {route.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onViewMap}>
          <Map aria-hidden="true" /> Ver mapa
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onPreview}>
          <Eye aria-hidden="true" /> Previsualizar
        </Button>
      </div>
    </article>
  )
}
