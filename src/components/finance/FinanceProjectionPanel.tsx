'use client'

import type { FinanceProjectionBlock } from '@/interfaces/finance.interface'

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)

const classLabel: Record<string, string> = {
  liquidez: 'Liquidez',
  necesidad: 'Necesidad financiera',
  en_reserva: 'En reserva',
}

interface Props {
  projection: FinanceProjectionBlock | null
  loading: boolean
}

export function FinanceProjectionPanel({ projection, loading }: Props) {
  return (
    <section className="mb-6 bg-surface-base rounded-lg p-5 shadow-sm border border-border-subtle">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-label font-semibold text-text-primary">Proyección</h2>
        {projection && (
          <span className="text-caption text-text-secondary">
            Reglas: {projection.rulesVersion} · Período: {projection.periodLabel}
          </span>
        )}
      </div>

      {loading && <div className="h-24 bg-background-subtle rounded-sm animate-pulse" />}

      {!loading && projection?.status !== 'ok' && (
        <div className="rounded-md border border-state-warning/40 bg-state-warning/10 p-4">
          <p className="text-label font-medium text-text-primary">Proyección no calculable</p>
          <p className="text-caption text-text-secondary mt-1">
            {projection?.message ??
              'Se requieren al menos tres meses comparables completos con historial utilizable.'}
          </p>
          <p className="text-caption text-text-secondary mt-1">Estado: {projection?.status}</p>
        </div>
      )}

      {!loading && projection?.status === 'ok' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Metric label="Ingresos proyectados" value={formatAmount(projection.projectedInflows)} />
            <Metric label="Egresos proyectados" value={formatAmount(projection.projectedOutflows)} />
            <Metric
              label="Saldo final proyectado"
              value={formatAmount(projection.projectedClosingBalance)}
            />
            <Metric label="Reserva mínima" value={formatAmount(projection.reserveMinimum)} />
            <Metric label="Capital ocioso" value={formatAmount(projection.idleCapital)} highlight />
            <Metric
              label="Clasificación"
              value={
                projection.liquidityClass
                  ? classLabel[projection.liquidityClass] ?? projection.liquidityClass
                  : 'n/d'
              }
            />
          </div>

          {projection.comparableMonths.length > 0 && (
            <div className="mt-4">
              <p className="text-caption font-medium text-text-secondary mb-2">
                Meses comparables (promedio)
              </p>
              <ul className="text-caption text-text-primary space-y-1">
                {projection.comparableMonths.map((m) => (
                  <li key={m.label}>
                    {m.label}: ingresos {formatAmount(m.inflows)} · egresos{' '}
                    {formatAmount(m.outflows)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-md border border-brand-primary/30 bg-brand-primary/5 p-3'
          : 'rounded-md border border-border-subtle p-3'
      }
    >
      <p className="text-caption text-text-secondary mb-1">{label}</p>
      <p className="text-label font-semibold text-text-primary">{value}</p>
    </div>
  )
}
