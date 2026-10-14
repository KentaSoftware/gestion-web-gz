import { Fuel, Map, Route as RouteIcon, Users } from 'lucide-react'
import type { RouteDashboardKpis } from '@/interfaces/routePlan.interface'

interface RouteKpiCardsProps {
  kpis: RouteDashboardKpis
}

const formatDistance = (meters: number | null): string => {
  if (meters === null) return 'No disponible'
  return `${(meters / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`
}

const formatLiters = (liters: number | null): string => {
  if (liters === null) return 'No disponible'
  return `${liters.toLocaleString('es-AR', { maximumFractionDigits: 2 })} L`
}

export function RouteKpiCards({ kpis }: RouteKpiCardsProps) {
  const cards = [
    { label: 'Rutas activas', value: kpis.activeRoutes.toLocaleString('es-AR'), icon: RouteIcon },
    { label: 'Pedidos pendientes', value: kpis.pendingOrders.toLocaleString('es-AR'), icon: Users },
    { label: 'Distancia total', value: formatDistance(kpis.totalDistanceMeters), icon: Map },
    { label: 'Combustible estimado', value: formatLiters(kpis.estimatedFuelLiters), icon: Fuel },
  ]

  return (
    <section aria-label="Indicadores de rutas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <article key={label} className="rounded-lg border border-border-subtle bg-surface-base p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium text-text-secondary">{label}</h3>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background-subtle text-brand-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-text-primary" aria-label={`${label}: ${value}`}>
            {value}
          </p>
        </article>
      ))}
    </section>
  )
}
