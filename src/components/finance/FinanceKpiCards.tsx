'use client'

import {
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
} from 'lucide-react'
import type { FinanceKpis } from '@/interfaces/finance.interface'
import { cn } from '@/lib/cn'

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

interface Props {
  kpis: FinanceKpis | null
  loading: boolean
}

/** Mock CUR-5 KPI row: Saldo Actual, Ingresos, Egresos, Flujo Neto, Capital Ocioso. */
export function FinanceKpiCards({ kpis, loading }: Props) {
  const items = [
    {
      label: 'Saldo Actual',
      value: kpis?.currentBalance ?? 0,
      accent: 'border-t-brand-primary',
      valueClass: 'text-brand-primary',
      icon: Wallet,
      iconClass: 'text-brand-primary bg-brand-primary/10',
    },
    {
      label: 'Ingresos',
      value: kpis?.totalInflows ?? 0,
      accent: 'border-t-state-success',
      valueClass: 'text-state-success',
      icon: TrendingUp,
      iconClass: 'text-state-success bg-state-success/10',
    },
    {
      label: 'Egresos',
      value: kpis?.totalOutflows ?? 0,
      accent: 'border-t-state-error',
      valueClass: 'text-state-error',
      icon: TrendingDown,
      iconClass: 'text-state-error bg-state-error/10',
    },
    {
      label: 'Flujo Neto',
      value: kpis?.netCashFlow ?? 0,
      accent: 'border-t-state-warning',
      valueClass: (kpis?.netCashFlow ?? 0) >= 0 ? 'text-state-success' : 'text-state-error',
      icon: CircleDollarSign,
      iconClass: 'text-state-warning bg-state-warning/10',
    },
    {
      label: 'Capital Ocioso',
      value: kpis?.idleCapital ?? 0,
      accent: 'border-t-state-info',
      valueClass: 'text-brand-accent',
      icon: PiggyBank,
      iconClass: 'text-brand-accent bg-brand-accent/10',
    },
  ]

  return (
    <section className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={cn(
                'bg-surface-base rounded-lg p-4 shadow-sm border-t-4 min-w-0',
                item.accent
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-caption text-text-secondary">{item.label}</p>
                <span
                  className={cn(
                    'inline-flex size-8 items-center justify-center rounded-md shrink-0',
                    item.iconClass
                  )}
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
              </div>
              {loading ? (
                <div className="h-5 w-1/2 bg-background-subtle rounded-sm animate-pulse" />
              ) : (
                <p className={cn('text-label font-semibold text-lg truncate', item.valueClass)}>
                  {formatAmount(item.value)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
