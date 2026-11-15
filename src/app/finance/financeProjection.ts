import type { FinanceDashboard } from '@/interfaces/finance.interface'

const DAY = 86400000
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export class FutureFinancePeriodError extends Error {
  constructor() {
    super('La fecha final es posterior a hoy en Buenos Aires. Elegí y aplicá una fecha final de hoy o anterior.')
  }
}

export function financeBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(item => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function projectFinance(dashboard: FinanceDashboard, exportedAt = new Date()) {
  const start = Date.parse(`${dashboard.startDate}T00:00:00Z`)
  const end = Date.parse(`${dashboard.endDate}T00:00:00Z`)
  const asOfDate = financeBusinessDate(exportedAt)
  const asOf = Date.parse(`${asOfDate}T00:00:00Z`)
  const days = (end - start) / DAY + 1
  const values = [days, asOf, dashboard.kpis.currentBalance, dashboard.kpis.effectiveReserve, dashboard.kpis.totalInflows, dashboard.kpis.totalOutflows]
  if (!values.every(Number.isFinite) || days < 1 || !Number.isInteger(days)) throw new Error('Invalid projection inputs')
  if (end > asOf) throw new FutureFinancePeriodError()
  const weeklyInflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalInflows / days * 7)
  const weeklyOutflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalOutflows / days * 7)
  const reserve = round(dashboard.kpis.effectiveReserve)
  const historicalBalance = round(dashboard.kpis.currentBalance)
  const bridgeDays = (asOf - end) / DAY
  const bridgeInflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalInflows / days * bridgeDays)
  const bridgeOutflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalOutflows / days * bridgeDays)
  const opening = round(historicalBalance + bridgeInflows - bridgeOutflows)
  // Illustrative expense: 10% of the opening balance above reserve, on day one.
  const exampleSpend = round(Math.max(opening - reserve, 0) * 0.1)
  let baseline = opening
  const weeks = Array.from({ length: 4 }, (_, index) => {
    baseline = round(baseline + weeklyInflows - weeklyOutflows)
    const scenario = round(baseline - exampleSpend)
    return {
      startDate: new Date(asOf + (index * 7 + 1) * DAY).toISOString().slice(0, 10),
      endDate: new Date(asOf + (index * 7 + 7) * DAY).toISOString().slice(0, 10),
      baseline, scenario,
      baselineShortfall: round(Math.max(reserve - baseline, 0)),
      scenarioShortfall: round(Math.max(reserve - scenario, 0)),
    }
  })
  return { days, asOfDate, historicalBalance, bridgeDays, bridgeInflows, bridgeOutflows, opening, reserve, weeklyInflows, weeklyOutflows, exampleSpend, weeks }
}
