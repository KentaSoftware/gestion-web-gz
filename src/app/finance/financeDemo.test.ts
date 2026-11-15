import { describe, expect, it } from 'vitest'
import { createFinanceDemo } from './financeDemo'

describe('finance fixtures', () => {
  it('keeps totals and projection consistent for a single day', () => {
    const data = createFinanceDemo({ startDate: '2026-03-10', endDate: '2026-03-10' })
    expect(data.timeline.length).toBeGreaterThan(0)
    expect(data.kpis.totalInflows).toBe(180000)
    expect(data.kpis.totalOutflows).toBe(120000)
    expect(data.kpis.netCashFlow).toBe(60000)
    expect(data.weeklyProjection[0].realNet).toBe(60000)
    expect(data.timeline.every(m => m.date.startsWith('2026-03-10'))).toBe(true)
  })

  it('keeps movements, expense slices and net in the requested range', () => {
    const data = createFinanceDemo({ startDate: '2026-01-01', endDate: '2026-03-31' })
    expect(data.timeline.every(m => m.date.slice(0, 10) >= data.startDate && m.date.slice(0, 10) <= data.endDate)).toBe(true)
    const displayed = data.timeline.filter(m => m.date <= data.weeklyProjection[data.weeklyProjection.length - 1].endDate)
    expect(data.weeklyProjection.reduce((sum, point) => sum + point.realNet, 0)).toBe(displayed.reduce((sum, m) => sum + (m.type === 'inflow' ? m.amount : -m.amount), 0))
    const buys = data.timeline.filter(m => m.source === 'buy').reduce((sum, m) => sum + m.amount, 0)
    expect(data.expenseDistribution.reduce((sum, slice) => sum + slice.amount, 0) + buys).toBe(data.kpis.totalOutflows)
  })

  it('uses the same movements on overlapping dates and sums all days', () => {
    const first = createFinanceDemo({ startDate: '2026-03-01', endDate: '2026-03-10' })
    const second = createFinanceDemo({ startDate: '2026-03-05', endDate: '2026-03-15' })
    expect(first.timeline.filter(m => m.date.slice(0, 10) >= '2026-03-05')).toEqual(second.timeline.filter(m => m.date.slice(0, 10) <= '2026-03-10'))
    expect(second.timeline).toHaveLength(33)
    expect(first.kpis.totalInflows).not.toBe(second.kpis.totalInflows)
  })

  it('matches the backend midnight cutoff and four-week projection cap', () => {
    const history = createFinanceDemo({ startDate: '2025-12-01', endDate: '2026-02-28' })
    const lastDay = createFinanceDemo({ startDate: '2026-02-28', endDate: '2026-02-28' })
    const data = createFinanceDemo({ startDate: '2026-03-01', endDate: '2026-04-30' })
    expect(data.weeklyProjection).toHaveLength(4)
    const average = (history.kpis.netCashFlow - lastDay.kpis.netCashFlow) / 13
    expect(data.weeklyProjection.every(point => point.projectedNet === Math.round(average * 100) / 100)).toBe(true)
    expect(data.weeklyProjection[0].startDate).toBe('2026-03-01T00:00:00.000Z')
    expect(data.weeklyProjection[3].endDate).toBe('2026-03-22T23:59:59.999Z')
  })

  it('rejects excessively large and invalid ranges', () => {
    expect(() => createFinanceDemo({ startDate: '0001-01-01', endDate: '9999-12-31' })).toThrow()
    expect(() => createFinanceDemo({ startDate: '', endDate: '2026-01-01' })).toThrow()
  })

  it('uses a continuous balance independent of the start date', () => {
    const long = createFinanceDemo({ startDate: '2026-02-01', endDate: '2026-03-10' })
    const short = createFinanceDemo({ startDate: '2026-03-01', endDate: '2026-03-10' })
    const previous = createFinanceDemo({ startDate: '2026-02-01', endDate: '2026-03-09' })
    const oneDay = createFinanceDemo({ startDate: '2026-03-10', endDate: '2026-03-10' })
    expect(oneDay.kpis.currentBalance).toBe(10060000)
    expect(long.kpis.currentBalance).toBe(short.kpis.currentBalance)
    expect(oneDay.kpis.currentBalance).toBe(previous.kpis.currentBalance + oneDay.kpis.netCashFlow)
    const beforeStart = createFinanceDemo({ startDate: '2026-02-28', endDate: '2026-02-28' })
    expect(short.kpis.currentBalance).toBe(beforeStart.kpis.currentBalance + short.kpis.netCashFlow)
    const earlier = createFinanceDemo({ startDate: '2025-01-01', endDate: '2025-01-01' })
    const dayBefore = createFinanceDemo({ startDate: '2024-12-31', endDate: '2024-12-31' })
    expect(earlier.kpis.currentBalance).toBe(dayBefore.kpis.currentBalance + earlier.kpis.netCashFlow)
    expect(earlier.kpis.idleCapital).toBeGreaterThanOrEqual(0)
    expect(earlier.kpis.currentBalance).toBeLessThan(500000)
    expect(earlier.kpis.effectiveReserve).toBe(500000)
    expect(earlier.kpis.idleCapital).toBe(0)
  })
})
