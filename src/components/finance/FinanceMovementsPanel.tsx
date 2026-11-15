'use client'

import Link from 'next/link'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { FinanceMovement } from '@/interfaces/finance.interface'
import { cn } from '@/lib/cn'

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const SOURCE_LABELS: Record<string, string> = {
  sale: 'Venta',
  buy: 'Compra',
  expense: 'Egreso',
}

interface Props {
  movements: FinanceMovement[]
  loading: boolean
  /** Compact card for side-by-side with Proyección (mock layout). */
  compact?: boolean
  allowNavigation?: boolean
  unavailable?: boolean
}

export function FinanceMovementsPanel({ movements, loading, compact = false, allowNavigation = true, unavailable = false }: Props) {
  return (
    <section
      className={cn(
        'min-w-0 bg-surface-base rounded-lg p-5 shadow-sm border border-border-subtle flex flex-col',
        compact ? 'h-full' : 'mb-6'
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="text-base font-semibold text-text-primary">Últimos Movimientos</h2>
      </div>

      {loading && <div className="h-24 bg-background-subtle rounded-sm animate-pulse" />}

      {!loading && unavailable && <p className="text-sm text-text-secondary">Movimientos no disponibles.</p>}
      {!loading && !unavailable && movements.length === 0 && (
        <p className="text-caption text-text-secondary">Sin movimientos en el período.</p>
      )}

      {!loading && !unavailable && movements.length > 0 && (
        <ul className={cn('divide-y divide-border-subtle flex-1', compact && 'overflow-y-auto max-h-64')}>
          {movements.map((m, index) => (
            <li
              key={`${m.sourceId}-${index}`}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full',
                    m.type === 'inflow' ? 'bg-state-success/10' : 'bg-state-error/10'
                  )}
                  aria-hidden
                >
                  {m.type === 'inflow' ? (
                    <ArrowUp className="size-3.5 text-state-success" />
                  ) : (
                    <ArrowDown className="size-3.5 text-state-error" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-text-primary break-words">
                    {SOURCE_LABELS[m.source] ?? m.source}
                    {m.description ? ` — ${m.description}` : ''}
                  </p>
                  <p className="text-caption text-text-secondary">{formatDate(m.date)}</p>
                </div>
              </div>
              <p
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  m.type === 'inflow' ? 'text-state-success' : 'text-state-error'
                )}
              >
                {m.type === 'inflow' ? '+' : '-'}
                {formatAmount(m.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {allowNavigation && <div className="mt-4 pt-3 border-t border-border-subtle">
        <Link
          href="/cashflow"
          className={cn(
            'inline-flex w-full items-center justify-center rounded-sm px-3 py-2',
            'text-caption font-medium text-brand-primary',
            'border border-brand-primary/40 hover:bg-brand-primary/5 transition-colors'
          )}
        >
          Ver Todos los Movimientos
        </Link>
      </div>}
    </section>
  )
}
