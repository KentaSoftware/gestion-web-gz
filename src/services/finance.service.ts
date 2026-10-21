import apiClient from '@/utils/client'
import type {
  FinanceDashboard,
  FinanceDateParams,
  FinanceRulesConfig,
  UpdateFinanceRulesDTO,
} from '@/interfaces/finance.interface'

const FINANCE_BASE = '/finance'

interface DashboardResponse {
  dashboard: FinanceDashboard
}

interface RulesResponse {
  rulesVersion: string
  config: FinanceRulesConfig
  disclaimer: string
}

export const financeService = {
  getDashboard: async (params: FinanceDateParams): Promise<FinanceDashboard> => {
    const response = await apiClient.get<DashboardResponse>(`${FINANCE_BASE}/dashboard`, {
      params,
    })
    return response.data.dashboard
  },

  getRules: async (): Promise<RulesResponse> => {
    const response = await apiClient.get<RulesResponse>(`${FINANCE_BASE}/rules`)
    return response.data
  },

  updateRules: async (data: UpdateFinanceRulesDTO): Promise<RulesResponse> => {
    const response = await apiClient.put<RulesResponse>(`${FINANCE_BASE}/rules`, data)
    return response.data
  },

  /**
   * Downloads PDF report for the filtered period (blob).
   */
  exportReportPdf: async (params: FinanceDateParams): Promise<Blob> => {
    const response = await apiClient.get(`${FINANCE_BASE}/report.pdf`, {
      params,
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
