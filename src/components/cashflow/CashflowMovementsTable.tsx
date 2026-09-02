'use client'
import { cn } from '@/lib/cn'
import DataTable from '@/components/DataTable'
import type { DataColumn } from '@/components/DataTable'
import type { CashflowMovement } from '@/interfaces/cashflow.interface'
import type { ReactNode } from 'react'

interface CashflowMovementsTableProps {
  movements: CashflowMovement[]
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

const columns: DataColumn<CashflowMovement>[] = [
  {
    key: 'date',
    header: 'Fecha',
    render: (v) => formatDate(v as string),
  },
  {
    key: 'description',
    header: 'Descripción',
    render: (v): ReactNode => (
      <span
        className="block max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap"
        title={v as string}
      >
        {v as string}
      </span>
    ),
  },
  {
    key: 'source',
    header: 'Fuente',
    render: (v): ReactNode => (
      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-background-subtle text-text-secondary">
        {SOURCE_LABELS[v as string] ?? (v as string)}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Tipo',
    render: (v): ReactNode => (
      <span
        className={cn(
          'text-xs font-semibold px-2.5 py-0.5 rounded-full',
          v === 'inflow'
            ? 'bg-state-success/10 text-state-success'
            : 'bg-state-error/10 text-state-error'
        )}
      >
        {v === 'inflow' ? 'Ingreso' : 'Egreso'}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Monto',
    render: (v, row): ReactNode => (
      <span
        className={cn(
          'text-sm font-semibold whitespace-nowrap',
          row.type === 'inflow' ? 'text-state-success' : 'text-state-error'
        )}
      >
        {row.type === 'inflow' ? '+' : '-'}{formatAmount(v as number)}
      </span>
    ),
  },
]

export function CashflowMovementsTable({ movements, loading }: CashflowMovementsTableProps) {
  return (
    <div className="rounded-lg bg-surface-base p-6 shadow-md mb-6">
      <h2 className="text-xl font-semibold text-brand-primary mb-5">Movimientos del período</h2>
      <DataTable
        columns={columns}
        data={movements}
        loading={loading}
        emptyIcon="💸"
        emptyMessage="No hay movimientos en el período seleccionado"
      />
    </div>
  )
}
