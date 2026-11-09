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
    { label: 'Costo combustible est.', value: 'No disponible', icon: Fuel, detail: `Consumo estimado: ${formatLiters(kpis.estimatedFuelLiters)}` },
  ]

  return (
    <section aria-label="Indicadores de rutas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, detail }) => (
        <article key={label} className="flex min-w-0 items-center gap-3 rounded-lg border border-border-subtle bg-surface-base px-4 py-3 shadow-sm">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background-subtle text-brand-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-text-secondary">{label}</h3>
            <p className="text-xl font-semibold text-text-primary" aria-label={`${label}: ${value}`}>{value}</p>
            {detail && <p className="text-xs text-text-secondary">{detail}</p>}
          </div>
        </article>
      ))}
    </section>
  )
}
