import { render } from '@testing-library/react'
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
})
