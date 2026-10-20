/**
 * Movement types for cashflow entries
 */
const MOVEMENT_TYPE = {
  INFLOW: 'inflow',
  OUTFLOW: 'outflow',
} as const;

export type MovementType = (typeof MOVEMENT_TYPE)[keyof typeof MOVEMENT_TYPE];

/**
 * Source entity types for cashflow movements
 */
const MOVEMENT_SOURCE = {
  SALE: 'sale',
  BUY: 'buy',
  EXPENSE: 'expense',
} as const;

export type MovementSource = (typeof MOVEMENT_SOURCE)[keyof typeof MOVEMENT_SOURCE];

/**
 * A single cashflow movement entry (inflow or outflow)
 * Amounts are plain decimal (ARS pesos), already normalized by backend
 */
export interface CashflowMovement {
  date: string;         // ISO date string
  type: MovementType;
  amount: number;       // plain decimal, ARS pesos
  source: MovementSource;
  description: string;
  sourceId: string;
}

/**
 * Aggregated summary for a given period
 */
export interface CashflowSummary {
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
}

/**
 * Timeline entry — same shape as CashflowMovement, ordered by cashDate asc
 */
export interface CashflowTimelineEntry extends CashflowMovement {}

/**
 * Config singleton — stores opening balance
 */
export interface CashflowConfig {
  openingBalance: number;
}

/**
 * Query params for data endpoints (startDate and endDate are required)
 */
export interface CashflowDateParams {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

/**
 * DTO for updating the opening balance
 */
export interface UpdateCashflowConfigDTO {
  openingBalance: number;
}
