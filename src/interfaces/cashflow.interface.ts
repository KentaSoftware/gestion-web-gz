/**
 * Cashflow domain types — PS-T01
 *
 * Mirror of `gzapi/src/interfaces/cashflow.interface.ts`.
 * All monetary amounts are plain decimals (ARS), never cents.
 * `date` arrives as an ISO 8601 string because it crosses the wire as JSON.
 */

export type CashflowMovementType = 'inflow' | 'outflow';

export type CashflowMovementSource = 'sale' | 'buy' | 'expense';

export interface CashflowMovement {
  /** Cash date resolved by the backend: paidAt > fecha > createdAt (ISO 8601) */
  date: string;
  type: CashflowMovementType;
  /** Plain decimal amount in ARS */
  amount: number;
  source: CashflowMovementSource;
  /** Human readable description: client name, provider or expense category */
  description: string;
  sourceId: string;
}

export interface CashflowSummary {
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  /** totalInflows - totalOutflows */
  netCashFlow: number;
  /** openingBalance + netCashFlow */
  closingBalance: number;
}

export interface CashflowConfig {
  openingBalance: number;
}

/** Period required by every data endpoint (summary, timeline, movements). */
export interface CashflowPeriod {
  /** ISO date, inclusive */
  startDate: string;
  /** ISO date, inclusive */
  endDate: string;
}

export const CASHFLOW_SOURCE_LABELS: Record<CashflowMovementSource, string> = {
  sale: 'Venta',
  buy: 'Compra',
  expense: 'Egreso',
};

export const CASHFLOW_TYPE_LABELS: Record<CashflowMovementType, string> = {
  inflow: 'Ingreso',
  outflow: 'Egreso',
};
