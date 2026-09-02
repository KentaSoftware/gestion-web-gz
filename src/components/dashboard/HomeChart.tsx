'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Chart color adapter — CSS vars only, never in className
const CHART_COLORS = {
  sales: 'var(--color-chart-success)',
  buys: 'var(--color-chart-error)',
  grid: 'var(--color-chart-grid)',
  axis: 'var(--color-chart-axis)',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

interface HomeChartProps {
  graphData: { label: string; ventas?: number; compras?: number }[]
}

export default function HomeChart({ graphData }: HomeChartProps) {
  if (graphData.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-surface-raised px-6 text-center text-text-secondary md:h-80 lg:h-96" role="img" aria-label="Gráfico sin datos para el período seleccionado">
        <p className="text-base font-semibold text-text-primary">
          No hay datos para graficar en este período.
        </p>
        <p className="mt-2 max-w-[42ch] text-sm leading-6 text-text-muted">
          No hay ventas ni compras registradas en este período. Seleccioná otro
          intervalo o rango de fechas para ver la comparativa.
        </p>
      </div>
    )
  }

  return (
    <div className="h-72 w-full md:h-80 lg:h-96" role="img" aria-label="Gráfico de barras comparativo entre ventas y compras">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={graphData} barCategoryGap="22%">
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
          />
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
            tickFormatter={(value: number) => {
              if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
              if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
              return String(value)
            }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 18,
              border: '1px solid var(--color-border-subtle)',
              backgroundColor: 'var(--color-chart-tooltip-surface)',
              boxShadow: 'var(--shadow-md)',
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Bar
            dataKey="ventas"
            fill={CHART_COLORS.sales}
            radius={[14, 14, 0, 0]}
            maxBarSize={52}
          />
          <Bar
            dataKey="compras"
            fill={CHART_COLORS.buys}
            radius={[14, 14, 0, 0]}
            maxBarSize={52}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
