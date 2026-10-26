import apiClient from '@/utils/client';
import {
  CashflowConfig,
  CashflowMovement,
  CashflowPeriod,
  CashflowSummary,
} from '@/interfaces/cashflow.interface';

const CASHFLOW_BASE_URL = '/cashflow';

interface SummaryResponse {
  summary: CashflowSummary;
}

interface TimelineResponse {
  timeline: CashflowMovement[];
}

interface MovementsResponse {
  movements: CashflowMovement[];
}

interface ConfigResponse {
  config: CashflowConfig;
}

/**
 * Client for the cashflow module (PS-T01).
 * `startDate` and `endDate` are mandatory on every data endpoint: the
 * backend answers 400 when either is missing.
 */
export const cashflowService = {
  getSummary: async (period: CashflowPeriod): Promise<CashflowSummary> => {
    const response = await apiClient.get<SummaryResponse>(`${CASHFLOW_BASE_URL}/summary`, {
      params: period,
    });
    return response.data.summary;
  },

  /** Movements ordered by cash date ascending, as returned by the backend. */
  getTimeline: async (period: CashflowPeriod): Promise<CashflowMovement[]> => {
    const response = await apiClient.get<TimelineResponse>(`${CASHFLOW_BASE_URL}/timeline`, {
      params: period,
    });
    return response.data.timeline;
  },

  /** Flat movement list for table rendering. */
  getMovements: async (period: CashflowPeriod): Promise<CashflowMovement[]> => {
    const response = await apiClient.get<MovementsResponse>(`${CASHFLOW_BASE_URL}/movements`, {
      params: period,
    });
    return response.data.movements;
  },

  getConfig: async (): Promise<CashflowConfig> => {
    const response = await apiClient.get<ConfigResponse>(`${CASHFLOW_BASE_URL}/config`);
    return response.data.config;
  },

  /** Requires the `configure_cashflow` permission on the backend. */
  updateConfig: async (openingBalance: number): Promise<CashflowConfig> => {
    const response = await apiClient.put<ConfigResponse>(`${CASHFLOW_BASE_URL}/config`, {
      openingBalance,
    });
    return response.data.config;
  },
};
