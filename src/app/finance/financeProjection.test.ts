import { describe, expect, it } from 'vitest'
import { createFinanceDemo } from './financeDemo'
import { projectFinance } from './financeProjection'

describe('forward cash projection', () => {
  it('reconciles four future weeks across a year boundary', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-31', endDate: '2026-12-31' })
    const result = projectFinance(dashboard, new Date('2026-12-31T12:00:00Z'))
    expect(result.weeks[0].startDate).toBe('2027-01-01')
    expect(result.weeks[3].endDate).toBe('2027-01-28')
    expect(result.weeks[0].baseline).toBe(dashboard.kpis.currentBalance + result.weeklyInflows - result.weeklyOutflows)
    expect(result.weeks[3].scenario).toBe(result.weeks[3].baseline - result.exampleSpend)
  })

  it('handles no history, zero and negative balances without invented flows', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-03-10', endDate: '2026-03-10' })
    dashboard.emptyPeriod = true
    dashboard.kpis.currentBalance = -100
    const result = projectFinance(dashboard, new Date('2026-03-10T12:00:00Z'))
    expect(result.weeklyInflows).toBe(0)
    expect(result.weeklyOutflows).toBe(0)
    expect(result.exampleSpend).toBe(0)
    expect(result.weeks[3].baseline).toBe(-100)
    expect(result.weeks[3].baselineShortfall).toBe(500100)
  })

  it('rounds weekly amounts once and carries negative flows and reserve shortfalls', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-01-01', endDate: '2026-01-03' })
    Object.assign(dashboard.kpis, { currentBalance: 0, effectiveReserve: 10, totalInflows: 1, totalOutflows: 2 })
    const result = projectFinance(dashboard, new Date('2026-01-03T12:00:00Z'))
    expect(result.weeklyInflows).toBe(2.33)
    expect(result.weeklyOutflows).toBe(4.67)
    expect(result.weeks.map(week => week.baseline)).toEqual([-2.34, -4.68, -7.02, -9.36])
    expect(result.weeks[3].scenarioShortfall).toBe(19.36)
  })

  it('bridges a past balance with estimated daily averages to the business date', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-12-29', endDate: '2026-12-30' })
    const result = projectFinance(dashboard, new Date('2027-01-01T02:59:59Z'))
    expect(result.asOfDate).toBe('2026-12-31')
    expect(result.bridgeDays).toBe(1)
    expect(result.opening).toBe(Math.round((dashboard.kpis.currentBalance + (dashboard.kpis.totalInflows - dashboard.kpis.totalOutflows) / 2) * 100) / 100)
    expect(result.weeks[0].startDate).toBe('2027-01-01')
  })

  it('uses the Buenos Aires date at midnight and rejects future end dates', () => {
    const dashboard = createFinanceDemo({ startDate: '2027-01-01', endDate: '2027-01-01' })
    expect(() => projectFinance(dashboard, new Date('2027-01-01T02:59:59Z'))).toThrow(/posterior/)
    const result = projectFinance(dashboard, new Date('2027-01-01T03:00:00Z'))
    expect(result.asOfDate).toBe('2027-01-01')
    expect(result.bridgeDays).toBe(0)
    expect(result.weeks[0].startDate).toBe('2027-01-02')
  })

  it('rounds each bridge total and keeps an empty-history bridge at zero', () => {
    const dashboard = createFinanceDemo({ startDate: '2026-01-01', endDate: '2026-01-03' })
    Object.assign(dashboard.kpis, { currentBalance: 10, totalInflows: 1, totalOutflows: 2 })
    const clock = new Date('2026-01-05T12:00:00Z')
    const result = projectFinance(dashboard, clock)
    expect([result.bridgeDays, result.bridgeInflows, result.bridgeOutflows, result.opening]).toEqual([2, 0.67, 1.33, 9.34])
    dashboard.emptyPeriod = true
    expect(projectFinance(dashboard, clock).opening).toBe(10)
  })
})
