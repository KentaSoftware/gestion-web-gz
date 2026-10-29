export type LiquidityClass = 'liquidez' | 'necesidad' | 'en_reserva'

export type FinanceSectionStatus =
  | 'ok'
  | 'insufficient_history'
  | 'data_incomplete'
  | 'source_unavailable'
  | 'not_calculable'

export interface FinanceRulesConfig {
  openingBalance: number
  reserveMonthsMultiplier: number
  deficitAlertEnabled: boolean
  idleCapitalRecommendMin: number
}

export interface ComparableMonthTotals {
  year: number
  month: number
  label: string
  inflows: number
  outflows: number
}

export interface FinanceHistoricalBlock {
  status: FinanceSectionStatus
  startDate: string
  endDate: string
  openingBalance: number
  totalInflows: number
  totalOutflows: number
  netCashFlow: number
  closingBalance: number
  kind: 'historical'
}

export interface FinanceProjectionBlock {
  status: FinanceSectionStatus
  kind: 'projected'
  rulesVersion: string
  periodLabel: string
  startDate: string
  endDate: string
  openingBalance: number
  projectedInflows: number
  projectedOutflows: number
  projectedClosingBalance: number
  reserveMinimum: number
  idleCapital: number
  liquidityClass: LiquidityClass | null
  comparableMonths: ComparableMonthTotals[]
  message?: string
}

export interface FinanceInsight {
  type: 'alert' | 'recommendation'
  severity: 'info' | 'warning' | 'critical'
  code: string
  title: string
  explanation: string
  rulesVersion: string
  disclaimer?: string
}

export interface FinanceDashboard {
  rulesVersion: string
  currency: 'ARS'
  generatedAt: string
  historical: FinanceHistoricalBlock
  projection: FinanceProjectionBlock
  insights: FinanceInsight[]
  config: FinanceRulesConfig
}

export interface FinanceDateParams {
  startDate: string
  endDate: string
}

export type UpdateFinanceRulesDTO = Partial<FinanceRulesConfig>
