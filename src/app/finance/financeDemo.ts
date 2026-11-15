import type { FinanceDashboard, FinanceDateParams, FinanceMovement, FinanceWeeklyPoint } from '@/interfaces/finance.interface'

// Set to false to use the live finance services.
export const demo: boolean = true
export const DEMO_MAX_DAYS = 366
const DAY = 86400000
const REFERENCE_DAY = Date.parse('2026-03-10T12:00:00Z') / DAY
// Ledger opening balance immediately before 2026-03-10 UTC.
const REFERENCE_BALANCE = 10000000

function balanceAfterDay(timestamp: number): number {
  const dayCount = Math.round(timestamp / DAY - REFERENCE_DAY) + 1
  const cycles = Math.floor(dayCount / 7)
  const remainder = dayCount - cycles * 7
  // The daily net is 60,000 + 8,000 × day-in-cycle; each full cycle totals 588,000.
  return REFERENCE_BALANCE + cycles * 588000 + remainder * 60000 + 8000 * remainder * (remainder - 1) / 2
}

function movementsForDay(timestamp: number): FinanceMovement[] {
  const date = new Date(timestamp).toISOString()
  const key = date.slice(0, 10)
  const variation = ((Math.round(timestamp / DAY - REFERENCE_DAY) % 7) + 7) % 7
  return [
    { date, type: 'inflow', source: 'sale', amount: 180000 + variation * 15000, description: 'Cobros de ventas', sourceId: `sale-${key}` },
    { date, type: 'outflow', source: 'buy', amount: 80000 + variation * 5000, description: 'Compra de mercadería', sourceId: `buy-${key}` },
    { date, type: 'outflow', source: 'expense', amount: 40000 + variation * 2000, description: 'Gastos operativos', sourceId: `expense-${key}` },
  ]
}

function weekStart(timestamp: number): number {
  const weekday = new Date(timestamp).getUTCDay()
  return timestamp - ((weekday + 6) % 7) * DAY
}

function net(movements: FinanceMovement[]): number {
  return movements.reduce((sum, movement) => sum + (movement.type === 'inflow' ? movement.amount : -movement.amount), 0)
}

export function createFinanceDemo({ startDate, endDate }: FinanceDateParams): FinanceDashboard {
  const start = Date.parse(`${startDate}T12:00:00Z`)
  const end = Date.parse(`${endDate}T12:00:00Z`)
  const days = (end - start) / DAY + 1
  if (!Number.isFinite(days) || days < 1 || days > DEMO_MAX_DAYS || new Date(start).toISOString().slice(0, 10) !== startDate || new Date(end).toISOString().slice(0, 10) !== endDate) {
    throw new RangeError('Invalid fixture date range')
  }

  const timeline: FinanceMovement[] = []
  for (let day = start; day <= end; day += DAY) timeline.push(...movementsForDay(day))

  const history = new Map<number, number>()
  for (let day = start - 90 * DAY; day < start; day += DAY) {
    const week = weekStart(day)
    // The backend's date-only lookback ends at 00:00 UTC on the previous day.
    history.set(week, (history.get(week) ?? 0) + (day < start - DAY ? net(movementsForDay(day)) : 0))
  }
  const projectedNet = Math.round((Array.from(history.values()).reduce((sum, value) => sum + value, 0) / history.size) * 100) / 100
  const weeklyProjection: FinanceWeeklyPoint[] = []
  for (let week = weekStart(start); week <= end && weeklyProjection.length < 4; week += 7 * DAY) {
    const sliceStart = Math.max(week, start) - DAY / 2
    const sliceEnd = Math.min(week + 6 * DAY, end) + DAY / 2 - 1
    const weekIndex = weeklyProjection.length + 1
    weeklyProjection.push({
      label: `Sem ${weekIndex}`, weekIndex,
      startDate: new Date(sliceStart).toISOString(), endDate: new Date(sliceEnd).toISOString(),
      realNet: net(timeline.filter(m => {
        const time = Date.parse(m.date)
        return time >= sliceStart && time <= sliceEnd
      })),
      projectedNet,
    })
  }

  const totalInflows = timeline.filter(m => m.type === 'inflow').reduce((sum, m) => sum + m.amount, 0)
  const totalOutflows = timeline.filter(m => m.type === 'outflow').reduce((sum, m) => sum + m.amount, 0)
  const netCashFlow = totalInflows - totalOutflows
  const currentBalance = balanceAfterDay(end)
  const effectiveReserve = 500000
  const idleCapital = Math.max(currentBalance - effectiveReserve, 0)
  return {
    rulesVersion: 'finance-rules-v2', currency: 'ARS', generatedAt: `${endDate}T12:00:00Z`, startDate, endDate,
    emptyPeriod: false,
    kpis: { currentBalance, totalInflows, totalOutflows, netCashFlow, effectiveReserve, idleCapital },
    timeline,
    expenseDistribution: [{ category: 'Gastos operativos', amount: timeline.filter(m => m.source === 'expense').reduce((sum, m) => sum + m.amount, 0) }],
    weeklyProjection,
    recentMovements: [...timeline].reverse().slice(0, 6),
    insights: [], historySufficient: true,
    opportunity: idleCapital > 0
      ? { code: 'CAPITAL_OCIOSO_DETECTADO', title: 'Capital disponible', explanation: 'El saldo supera la reserva mínima.', referenceRoiPercent: 18, idleCapital, roiEnabled: true }
      : { code: 'CAPITAL_OCIOSO_NO_DETECTADO', title: 'Sin capital disponible', explanation: 'El saldo no supera la reserva mínima.', referenceRoiPercent: null, idleCapital, roiEnabled: false },
  }
}
