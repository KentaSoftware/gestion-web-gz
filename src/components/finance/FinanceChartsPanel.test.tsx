import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceChartsPanel } from './FinanceChartsPanel'

const areas = vi.hoisted(() => vi.fn())
vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Wrapper, AreaChart: ({ children }: { children?: ReactNode }) => <svg>{children}</svg>, BarChart: Wrapper, PieChart: Wrapper,
    Area: (props: { dot: unknown }) => { areas(props); return null },
    Bar: () => null, CartesianGrid: () => null, Cell: () => null, Legend: () => null,
    Pie: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null,
  }
})

describe('cashflow chart', () => {
  it('shows points for a single fixture date without changing the live chart', () => {
    const timeline = [{ date: '2026-03-10T12:00:00Z', type: 'inflow' as const, source: 'sale' as const, amount: 180000, description: '', sourceId: 'a' }]
    const { rerender } = render(<FinanceChartsPanel timeline={timeline} distribution={[]} weekly={[]} loading={false} showProjection={false} showSinglePoint />)
    expect(areas.mock.calls.slice(-2).every(([props]) => props.dot !== false)).toBe(true)
    rerender(<FinanceChartsPanel timeline={timeline} distribution={[]} weekly={[]} loading={false} showProjection={false} />)
    expect(areas.mock.calls.slice(-2).every(([props]) => props.dot === false)).toBe(true)
  })

  it('shows all expense categories and amounts outside the chart', () => {
    render(<FinanceChartsPanel timeline={[]} distribution={[{ category: 'Servicios de logística', amount: 123456 }, { category: 'Alquiler', amount: 40000 }]} weekly={[]} loading={false} showProjection={false} />)
    expect(screen.getByText(/Servicios de logística/)).toHaveTextContent('123.456')
    expect(screen.getByText(/Alquiler/)).toHaveTextContent('40.000')
  })

  it('allows the donut and legend to wrap when the card is narrow', () => {
    render(<FinanceChartsPanel timeline={[]} distribution={[{ category: 'Servicios', amount: 123456 }]} weekly={[]} loading={false} showProjection={false} />)
    const chart = screen.getByRole('img', { name: 'Gráfico de dona de distribución de egresos' })
    const legend = screen.getByText(/Servicios/).closest('ul')
    expect(chart.parentElement).toHaveClass('flex-wrap')
    expect(chart).toHaveClass('w-48', 'max-w-full', 'shrink-0')
    expect(legend).toHaveClass('basis-48', 'grow')
  })

  it('does not report empty charts when data is unavailable', () => {
    render(<FinanceChartsPanel timeline={[]} distribution={[]} weekly={[]} loading={false} unavailable />)
    expect(screen.getByText('Flujo de caja no disponible.')).toBeInTheDocument()
    expect(screen.getByText('Distribución no disponible.')).toBeInTheDocument()
    expect(screen.getByText('Proyección no disponible.')).toBeInTheDocument()
    expect(screen.queryByText('Sin movimientos en el período.')).not.toBeInTheDocument()
  })
})
