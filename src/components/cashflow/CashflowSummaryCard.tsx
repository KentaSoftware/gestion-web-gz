'use client'
import { cn } from '@/lib/cn'
import type { CashflowSummary } from '@/interfaces/cashflow.interface'
import { ResponsiveGrid } from '@/components/layout/PageLayout'

/**
 * CashflowSummaryCard — vertical slice pilot.
 * Tailwind 4 semantic token classes.
 * Color mapping:
 *   #8294C4 → brand-primary (opening balance)
 *   #4CAF50 → state-success (inflows)
 *   #E57373 → state-error (outflows)
 *   #FF9800 → state-warning (net cashflow)
 *   #3764A0 → state-info (closing balance)
 */

interface KpiItem {
  label: string
  value: number
  accentClass: string
}

interface CashflowSummaryCardProps {
  summary: CashflowSummary | null
  loading: boolean
}

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

export function CashflowSummaryCard({ summary, loading }: CashflowSummaryCardProps) {
  const items: KpiItem[] = [
    { label: 'Saldo inicial',   value: summary?.openingBalance ?? 0, accentClass: 'border-t-brand-primary' },
    { label: 'Total ingresos',  value: summary?.totalInflows   ?? 0, accentClass: 'border-t-state-success' },
    { label: 'Total egresos',   value: summary?.totalOutflows  ?? 0, accentClass: 'border-t-state-error' },
    { label: 'Flujo neto',      value: summary?.netCashFlow    ?? 0, accentClass: 'border-t-state-warning' },
    { label: 'Saldo final',     value: summary?.closingBalance ?? 0, accentClass: 'border-t-state-info' },
  ]

  if (loading) {
    return (
      <ResponsiveGrid className="mb-6">
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-surface-base rounded-lg p-5 shadow-sm border-t-4 border-t-border-subtle"
          >
            <div className="h-3 w-[70%] bg-background-subtle rounded-sm mb-3 animate-pulse" />
            <div className="h-5 w-[50%] bg-background-subtle rounded-sm animate-pulse" />
          </div>
        ))}
      </ResponsiveGrid>
    )
  }

  return (
    <ResponsiveGrid className="mb-6">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'bg-surface-base rounded-lg p-5 shadow-sm border-t-4',
            item.accentClass
          )}
        >
          <div className="text-caption text-text-secondary mb-2 font-medium uppercase tracking-wide">
            {item.label}
          </div>
          <div
            className={cn(
              'text-subheading font-bold',
              item.value < 0 ? 'text-state-error' : 'text-text-primary'
            )}
          >
            {formatAmount(item.value)}
          </div>
        </div>
      ))}
    </ResponsiveGrid>
  )
}
