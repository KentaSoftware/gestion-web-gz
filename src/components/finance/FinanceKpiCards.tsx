'use client'

import { ResponsiveGrid } from '@/components/layout/PageLayout'
import type { FinanceHistoricalBlock } from '@/interfaces/finance.interface'

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

interface Props {
  historical: FinanceHistoricalBlock | null
  loading: boolean
}

export function FinanceKpiCards({ historical, loading }: Props) {
  const items = [
    { label: 'Saldo inicial', value: historical?.openingBalance ?? 0, accent: 'border-t-brand-primary' },
    { label: 'Ingresos (histórico)', value: historical?.totalInflows ?? 0, accent: 'border-t-state-success' },
    { label: 'Egresos (histórico)', value: historical?.totalOutflows ?? 0, accent: 'border-t-state-error' },
    { label: 'Flujo neto', value: historical?.netCashFlow ?? 0, accent: 'border-t-state-warning' },
    { label: 'Saldo final', value: historical?.closingBalance ?? 0, accent: 'border-t-state-info' },
  ]

  return (
    <section className="mb-6">
      <h2 className="text-label font-semibold text-text-primary mb-3">Histórico del período</h2>
      <ResponsiveGrid>
        {items.map((item) => (
          <div
            key={item.label}
            className={`bg-surface-base rounded-lg p-5 shadow-sm border-t-4 ${item.accent}`}
          >
            <p className="text-caption text-text-secondary mb-2">{item.label}</p>
            {loading ? (
              <div className="h-5 w-1/2 bg-background-subtle rounded-sm animate-pulse" />
            ) : (
              <p className="text-label font-semibold text-text-primary text-lg">{formatAmount(item.value)}</p>
            )}
          </div>
        ))}
      </ResponsiveGrid>
    </section>
  )
}
