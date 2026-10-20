'use client'
import { cn } from '@/lib/cn'
import type { CashflowTimelineEntry } from '@/interfaces/cashflow.interface'

interface CashflowTimelineChartProps {
  entries: CashflowTimelineEntry[]
  loading: boolean
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const SOURCE_LABELS: Record<string, string> = {
  sale: 'Venta',
  buy: 'Compra',
  expense: 'Egreso',
}

export function CashflowTimelineChart({ entries, loading }: CashflowTimelineChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-surface-base p-6 shadow-md mb-6">
        <h2 className="text-xl font-semibold text-brand-primary mb-5">Línea de tiempo</h2>
        <p className="text-sm text-text-muted">Cargando movimientos...</p>
      </div>
    )
  }

  // entries come ordered by cashDate asc from backend; trust that order
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <div className="rounded-lg bg-surface-base p-6 shadow-md mb-6">
      <h2 className="text-xl font-semibold text-brand-primary mb-5">Línea de tiempo</h2>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-10 px-5">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-base text-text-secondary text-center">
            No hay movimientos en el período seleccionado
          </p>
        </div>
      ) : (
        <ul className="list-none p-0 m-0 max-h-[400px] overflow-y-auto">
          {sorted.map((entry, index) => (
            <li
              key={`${entry.sourceId}-${index}`}
              className="grid grid-cols-[100px_12px_1fr_auto] gap-3 py-3 border-b border-border-subtle last:border-b-0 items-center"
            >
              <span className="text-xs text-text-muted whitespace-nowrap">
                {formatDate(entry.date)}
              </span>
              <div
                className={cn(
                  'w-3 h-3 rounded-full shrink-0',
                  entry.type === 'inflow' ? 'bg-state-success' : 'bg-state-error'
                )}
              />
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                  {entry.description}
                </span>
                <div className="flex gap-1.5">
                  <span
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                      entry.type === 'inflow'
                        ? 'bg-state-success/10 text-state-success'
                        : 'bg-state-error/10 text-state-error'
                    )}
                  >
                    {entry.type === 'inflow' ? 'Ingreso' : 'Egreso'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-background-subtle text-text-secondary">
                    {SOURCE_LABELS[entry.source] ?? entry.source}
                  </span>
                </div>
              </div>
              <span
                className={cn(
                  'text-sm font-semibold whitespace-nowrap',
                  entry.type === 'inflow' ? 'text-state-success' : 'text-state-error'
                )}
              >
                {entry.type === 'inflow' ? '+' : '-'}{formatAmount(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
