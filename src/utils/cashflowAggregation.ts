import { format } from 'date-fns';
import { CashflowMovement } from '@/interfaces/cashflow.interface';

export interface DailyCashflowPoint {
  /** Clave de orden: yyyy-MM-dd */
  key: string;
  /** Etiqueta corta para el eje X */
  label: string;
  /** Fecha completa para el tooltip */
  fullDate: string;
  /** Ingresos acumulados del día (positivo) */
  inflow: number;
  /** Egresos acumulados del día, negativos para que la barra baje */
  outflow: number;
  /** Saldo acumulado al cierre del día */
  balance: number;
  /** Cantidad de movimientos que componen el día */
  movements: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Agrupa los movimientos por día (PS-T25).
 * El gráfico muestra un punto por día con el acumulado, no un punto por venta.
 */
export const aggregateByDay = (
  movements: CashflowMovement[],
  openingBalance: number
): DailyCashflowPoint[] => {
  const days = new Map<string, { inflow: number; outflow: number; movements: number; date: Date }>();

  for (const movement of movements) {
    const date = new Date(movement.date);
    const key = dayKey(date);
    const current = days.get(key) ?? { inflow: 0, outflow: 0, movements: 0, date };

    if (movement.type === 'inflow') current.inflow += movement.amount;
    else current.outflow += movement.amount;

    current.movements += 1;
    days.set(key, current);
  }

  const sorted = Array.from(days.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  let running = openingBalance;

  return sorted.map(([key, day]) => {
    running += day.inflow - day.outflow;

    return {
      key,
      label: format(day.date, 'dd/MM'),
      fullDate: format(day.date, 'dd/MM/yyyy'),
      inflow: round2(day.inflow),
      outflow: -round2(day.outflow),
      balance: round2(running),
      movements: day.movements,
    };
  });
};
