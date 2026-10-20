import apiClient from '@/utils/client';
import {
  CashflowSummary,
  CashflowMovement,
  CashflowTimelineEntry,
  CashflowConfig,
  CashflowDateParams,
  UpdateCashflowConfigDTO,
} from '@/interfaces/cashflow.interface';

const CASHFLOW_BASE_URL = '/cashflow';

interface SummaryResponse {
  summary: CashflowSummary
}

interface TimelineResponse {
  timeline: CashflowTimelineEntry[]
}

interface MovementsResponse {
  movements: CashflowMovement[]
}

interface ConfigResponse {
  config: CashflowConfig
}

export const cashflowService = {
  /**
   * Get aggregated summary for a period
   * Requires: read_cashflow permission
   */
  getSummary: async (params: CashflowDateParams): Promise<CashflowSummary> => {
    const response = await apiClient.get<SummaryResponse>(
      `${CASHFLOW_BASE_URL}/summary`,
      { params }
    );
    return response.data.summary;
  },

  /**
   * Get movements ordered by cashDate ascending (for timeline view)
   * Requires: read_cashflow permission
   */
  getTimeline: async (params: CashflowDateParams): Promise<CashflowTimelineEntry[]> => {
    const response = await apiClient.get<TimelineResponse>(
      `${CASHFLOW_BASE_URL}/timeline`,
      { params }
    );
    return response.data.timeline;
  },

  /**
   * Get flat list of movements for the movements table
   * Requires: read_cashflow permission
   */
  getMovements: async (params: CashflowDateParams): Promise<CashflowMovement[]> => {
    const response = await apiClient.get<MovementsResponse>(
      `${CASHFLOW_BASE_URL}/movements`,
      { params }
    );
    return response.data.movements;
  },

  /**
   * Get the cashflow config (opening balance singleton)
   * Requires: read_cashflow permission
   */
  getConfig: async (): Promise<CashflowConfig> => {
    const response = await apiClient.get<ConfigResponse>(
      `${CASHFLOW_BASE_URL}/config`
    );
    return response.data.config;
  },

  /**
   * Update the opening balance
   * Requires: configure_cashflow permission
   */
  updateConfig: async (data: UpdateCashflowConfigDTO): Promise<CashflowConfig> => {
    const response = await apiClient.put<ConfigResponse>(
      `${CASHFLOW_BASE_URL}/config`,
      data
    );
    return response.data.config;
  },
};
