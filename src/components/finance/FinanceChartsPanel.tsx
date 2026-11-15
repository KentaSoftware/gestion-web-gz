'use client'

import { useMemo, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  FinanceExpenseDistributionSlice,
  FinanceMovement,
  FinanceWeeklyPoint,
} from '@/interfaces/finance.interface'

const CHART_COLORS = {
  inflows: 'var(--color-chart-success)',
  outflows: 'var(--color-chart-error)',
  real: 'var(--color-chart-primary)',
  projected: 'var(--color-chart-accent)',
  grid: 'var(--color-chart-grid)',
  axis: 'var(--color-chart-axis)',
  tooltip: 'var(--color-chart-tooltip-surface)',
}

const DONUT_PALETTE = [
  'var(--color-chart-primary)',
  'var(--color-chart-accent)',
  'var(--color-chart-success)',
  'var(--color-chart-error)',
  'var(--color-chart-warning)',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#64748b',
]

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)

const formatAxis = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return String(value)
}

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid var(--color-border-subtle)',
  backgroundColor: CHART_COLORS.tooltip,
  boxShadow: 'var(--shadow-md)',
}

interface Props {
  timeline: FinanceMovement[]
  distribution: FinanceExpenseDistributionSlice[]
  weekly: FinanceWeeklyPoint[]
  loading: boolean
  /** When false, omit Proyección (rendered beside movements). Default true. */
  showProjection?: boolean
}

function buildCashflowSeries (timeline: FinanceMovement[]) {
  if (timeline.length === 0) return []

  const sorted = [...timeline].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  const first = new Date(sorted[0].date)
  const last = new Date(sorted[sorted.length - 1].date)
  const spanDays = Math.max(0, (last.getTime() - first.getTime()) / 86400000)
  const byMonth = spanDays > 40

  const map = new Map<string, { label: string; sortKey: string; ingresos: number; egresos: number }>()

  for (const m of sorted) {
    const d = new Date(m.date)
    if (Number.isNaN(d.getTime())) continue
    const sortKey = byMonth
      ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      : d.toISOString().slice(0, 10)
    const label = byMonth
      ? MONTH_SHORT[d.getUTCMonth()]
      : `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const row = map.get(sortKey) ?? { label, sortKey, ingresos: 0, egresos: 0 }
    if (m.type === 'inflow') row.ingresos += m.amount
    else row.egresos += m.amount
    map.set(sortKey, row)
  }

  return Array.from(map.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ label, ingresos, egresos }) => ({
      label,
      ingresos: Math.round(ingresos),
      egresos: Math.round(egresos),
    }))
}

/** Mock shows Compras as a donut slice — fold paid buys from timeline into distribution. */
function buildDistributionWithCompras (
  distribution: FinanceExpenseDistributionSlice[],
  timeline: FinanceMovement[]
) {
  const compras = timeline
    .filter((m) => m.source === 'buy' && m.type === 'outflow')
    .reduce((sum, m) => sum + m.amount, 0)
  const withoutCompras = distribution.filter(
    (s) => s.category.trim().toLowerCase() !== 'compras'
  )
  const merged =
    compras > 0
      ? [{ category: 'Compras', amount: Math.round(compras) }, ...withoutCompras]
      : withoutCompras
  return [...merged].sort((a, b) => b.amount - a.amount)
}

function EmptyChart ({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-border-subtle bg-background-subtle/40 px-4 text-center">
      <p className="text-caption text-text-secondary">{message}</p>
    </div>
  )
}

function ChartCard ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 bg-surface-base rounded-lg p-5 shadow-sm border border-border-subtle flex flex-col">
      <h2 className="text-label font-semibold text-text-primary mb-1">{title}</h2>
      <p className="text-caption text-text-secondary mb-3">{subtitle}</p>
      {children}
    </div>
  )
}

export function FinanceProjectionChart ({
  weekly,
  loading,
}: {
  weekly: FinanceWeeklyPoint[]
  loading: boolean
}) {
  const weeklyData = useMemo(
    () =>
      weekly.map((w) => ({
        label: w.label,
        real: Math.round(w.realNet),
        proyectado: Math.round(w.projectedNet),
      })),
    [weekly]
  )

  if (loading) {
    return <div className="min-w-0 h-80 bg-background-subtle rounded-lg animate-pulse" />
  }

  return (
    <ChartCard
      title="Proyección vs Real"
      subtitle="Real = neto de la semana. Proyectado = promedio semanal histórico."
    >
      {weeklyData.length === 0 ? (
        <EmptyChart message="Sin semanas para comparar." />
      ) : (
        <div className="h-64 w-full min-h-[16rem]" role="img" aria-label="Gráfico de barras proyección versus real">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="28%" barGap={6}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxis}
                width={44}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string) => [
                  formatAmount(value),
                  name === 'real' ? 'Real' : 'Proyectado',
                ]}
              />
              <Legend formatter={(value) => (value === 'real' ? 'Real' : 'Proyectado')} />
              <Bar dataKey="real" name="real" fill={CHART_COLORS.real} radius={[8, 8, 0, 0]} maxBarSize={44} />
              <Bar
                dataKey="proyectado"
                name="proyectado"
                fill={CHART_COLORS.projected}
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

export function FinanceChartsPanel({
  timeline,
  distribution,
  weekly,
  loading,
  showProjection = true,
}: Props) {
  const cashflow = useMemo(() => buildCashflowSeries(timeline), [timeline])
  const pieData = useMemo(() => {
    const slices = buildDistributionWithCompras(distribution, timeline)
    return slices.map((slice) => ({
      name: slice.category,
      value: Math.round(slice.amount),
    }))
  }, [distribution, timeline])

  if (loading) {
    return <div className="mb-6 h-72 bg-background-subtle rounded-lg animate-pulse" />
  }

  return (
    <section className="mb-6 space-y-4">
      {/* Mock row: Flujo de Caja | Distribución de Egresos — min-w-0 evita que Recharts rompa el grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <ChartCard title="Flujo de Caja" subtitle="Ingresos y egresos en el período">
          {cashflow.length === 0 ? (
            <EmptyChart message="Sin movimientos en el período." />
          ) : (
            <div className="h-64 w-full min-h-[16rem]" role="img" aria-label="Gráfico de área de flujo de caja">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="financeInflowsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.inflows} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_COLORS.inflows} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="financeOutflowsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.outflows} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART_COLORS.outflows} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    interval={cashflow.length > 14 ? 'preserveStartEnd' : 0}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatAxis}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      formatAmount(value),
                      name === 'ingresos' ? 'Ingresos' : 'Egresos',
                    ]}
                  />
                  <Legend formatter={(value) => (value === 'ingresos' ? 'Ingresos' : 'Egresos')} />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    name="ingresos"
                    stroke={CHART_COLORS.inflows}
                    fill="url(#financeInflowsFill)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="egresos"
                    name="egresos"
                    stroke={CHART_COLORS.outflows}
                    fill="url(#financeOutflowsFill)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Distribución de Egresos" subtitle="Por categoría (incluye compras pagadas)">
          {pieData.length === 0 ? (
            <EmptyChart message="Sin egresos categorizados en el período." />
          ) : (
            <div className="h-64 w-full min-h-[16rem]" role="img" aria-label="Gráfico de dona de distribución de egresos">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="40%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="var(--color-surface-base)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={DONUT_PALETTE[index % DONUT_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [formatAmount(value), name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 11, maxWidth: '48%', lineHeight: '1.35' }}
                    formatter={(value) => {
                      const slice = pieData.find((p) => p.name === value)
                      return slice ? `${value} · ${formatAmount(slice.value)}` : value
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {showProjection && (
        <FinanceProjectionChart weekly={weekly} loading={false} />
      )}
    </section>
  )
}
