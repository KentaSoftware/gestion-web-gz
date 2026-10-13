import type { RouteDashboardCard } from '@/interfaces/routePlan.interface'

const statusLabel: Record<RouteDashboardCard['status'], string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
}

const formatDistance = (meters: number): string => `${(meters / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`
const formatDuration = (seconds: number): string => `${Math.round(seconds / 60)} min`

export function PlannedRouteCard({ route }: { route: RouteDashboardCard }) {
  return (
    <article className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-text-primary">Ruta {route.id}</h4>
          <p className="text-sm text-text-secondary">Zona {route.zoneCode}</p>
        </div>
        <span className="rounded-full border border-border-subtle px-2 py-1 text-xs font-medium text-text-secondary">
          {statusLabel[route.status]}
        </span>
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
    </article>
  )
}
