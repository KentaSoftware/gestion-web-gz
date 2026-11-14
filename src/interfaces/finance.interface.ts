export type FinanceRiskProfile = 'conservador' | 'moderado' | 'agresivo'

export interface FinanceRulesConfig {
  reserveMinimumAmount: number
  deficitAlertThresholdPercent: number
  minExpectedRoiPercent: number
  historyEvaluationDays: number
  riskProfile: FinanceRiskProfile
}

export interface FinanceKpis {
  currentBalance: number
  totalInflows: number
  totalOutflows: number
  netCashFlow: number
  idleCapital: number
  effectiveReserve: number
}

export interface FinanceExpenseDistributionSlice {
  category: string
  amount: number
}

export interface FinanceWeeklyPoint {
  label: string
  weekIndex: number
  startDate: string
  endDate: string
  realNet: number
  projectedNet: number
}

export interface FinanceOpportunityCard {
  code: 'CAPITAL_OCIOSO_DETECTADO' | 'CAPITAL_OCIOSO_NO_DETECTADO'
  title: string
  explanation: string
  referenceRoiPercent: number | null
  idleCapital: number
  roiEnabled: boolean
  disclaimer?: string
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

export interface FinanceMovement {
  date: string
  type: 'inflow' | 'outflow'
  amount: number
  source: 'sale' | 'buy' | 'expense'
  description: string
  sourceId: string
}

export interface FinanceDashboard {
  rulesVersion: string
  currency: 'ARS'
  generatedAt: string
  startDate: string
  endDate: string
  emptyPeriod: boolean
  kpis: FinanceKpis
  timeline: FinanceMovement[]
  expenseDistribution: FinanceExpenseDistributionSlice[]
  weeklyProjection: FinanceWeeklyPoint[]
  recentMovements: FinanceMovement[]
  insights: FinanceInsight[]
  opportunity: FinanceOpportunityCard
  historySufficient: boolean
}

export interface FinanceDateParams {
  startDate: string
  endDate: string
}

export type UpdateFinanceRulesDTO = Partial<FinanceRulesConfig>
