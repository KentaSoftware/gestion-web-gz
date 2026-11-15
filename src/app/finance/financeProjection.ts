import type { FinanceDashboard } from '@/interfaces/finance.interface'

const DAY = 86400000

// Bound every monetary input and intermediate to ARS 1 trillion in magnitude.
// This leaves ample headroom for cent rounding in JavaScript's binary number type.
export const MAX_PROJECTION_AMOUNT = 1_000_000_000_000

export class FutureFinancePeriodError extends Error {
  constructor(message = 'La fecha final es posterior a hoy en Buenos Aires. Elegí y aplicá una fecha final de hoy o anterior.') {
    super(message)
  }
}

// The existing fixture export handler exposes this error family's messages to users.
export class FinanceProjectionAmountError extends FutureFinancePeriodError {
  constructor() {
    super('No se pudo exportar: hay importes no válidos o que superan el límite de ARS 1.000.000.000.000 en los datos o la proyección. Revisá el período y los importes.')
  }
}

const amount = (value: number): number => {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_PROJECTION_AMOUNT) throw new FinanceProjectionAmountError()
  return value
}
const round = (value: number) => amount(Math.round((amount(value) + Number.EPSILON) * 100) / 100)

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
  if (![days, asOf].every(Number.isFinite) || days < 1 || !Number.isInteger(days)) throw new Error('Invalid projection inputs')
  if (end > asOf) throw new FutureFinancePeriodError()
  ;[dashboard.kpis.currentBalance, dashboard.kpis.effectiveReserve, dashboard.kpis.totalInflows, dashboard.kpis.totalOutflows].forEach(amount)
  const weeklyInflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalInflows / days * 7)
  const weeklyOutflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalOutflows / days * 7)
  const reserve = round(dashboard.kpis.effectiveReserve)
  const historicalBalance = round(dashboard.kpis.currentBalance)
  const bridgeDays = (asOf - end) / DAY
  const bridgeInflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalInflows / days * bridgeDays)
  const bridgeOutflows = dashboard.emptyPeriod ? 0 : round(dashboard.kpis.totalOutflows / days * bridgeDays)
  const opening = round(amount(historicalBalance + bridgeInflows) - bridgeOutflows)
  // Illustrative expense: 10% of the opening balance above reserve, on day one.
  const exampleSpend = round(Math.max(amount(opening - reserve), 0) * 0.1)
  let baseline = opening
  const weeks = Array.from({ length: 4 }, (_, index) => {
    baseline = round(amount(baseline + weeklyInflows) - weeklyOutflows)
    const scenario = round(baseline - exampleSpend)
    amount(scenario - baseline)
    return {
      startDate: new Date(asOf + (index * 7 + 1) * DAY).toISOString().slice(0, 10),
      endDate: new Date(asOf + (index * 7 + 7) * DAY).toISOString().slice(0, 10),
      baseline, scenario,
      baselineShortfall: round(Math.max(amount(reserve - baseline), 0)),
      scenarioShortfall: round(Math.max(amount(reserve - scenario), 0)),
    }
  })
  return { days, asOfDate, historicalBalance, bridgeDays, bridgeInflows, bridgeOutflows, opening, reserve, weeklyInflows, weeklyOutflows, exampleSpend, weeks }
}
