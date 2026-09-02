/**
 * Interfaces para Dashboard y KPIs
 */

/**
 * P5 — Canonical period metadata returned by all dataset endpoints.
 * Backend computes this once; frontend consumes `label` for display.
 * `from` and `to` are YYYY-MM-DD strings.
 */
export interface DatasetPeriod {
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
  label: string;  // Human-readable: "08-06 a 15-06" | "Junio del 2026" | "2026"
}

export interface ResultKPIData {
  ventas: number;
  compras: number;
  resultado: number;
  gastosPersonales: number;
}

export interface DatasetEntry {
  id: number;
  totalSales: number;
  salesCount: number;
  label: string;
  date: string;
  totalSalesDifference: number | string;
  salesCountDifference: number | string;
}

export interface GraphPoint {
  label: string;
  ventas?: number;
  compras?: number;
}

export interface ResultKPIProps {
  period: {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
  };
  interval?: string; // 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL' | 'CUSTOM'
  /** Optional parent-owned data — when provided, eliminates redundant fetches */
  dataset?: { period?: DatasetPeriod; simple: DatasetEntry[]; graph?: { data: GraphPoint[] } };
  expenseTotal?: number;
  expenseOperativo?: number;
  expensePersonal?: number;
  /** Parent confirms it has attempted data loading — false = still loading, true = done (success or error), undefined = standalone mode */
  isParentDataLoaded?: boolean;
}
