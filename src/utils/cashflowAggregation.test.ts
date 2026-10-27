import { describe, expect, it } from 'vitest';
import { aggregateByDay } from './cashflowAggregation';
import { CashflowMovement } from '@/interfaces/cashflow.interface';

const movement = (
  date: string,
  type: 'inflow' | 'outflow',
  amount: number
): CashflowMovement => ({
  date,
  type,
  amount,
  source: type === 'inflow' ? 'sale' : 'expense',
  description: 'test',
  sourceId: 'id',
});

describe('aggregateByDay', () => {
  it('agrupa varios movimientos del mismo día en un solo punto', () => {
    const points = aggregateByDay(
      [
        movement('2025-07-02T10:00:00.000Z', 'inflow', 100),
        movement('2025-07-02T15:00:00.000Z', 'inflow', 250),
        movement('2025-07-02T18:00:00.000Z', 'outflow', 50),
      ],
      0
    );

    expect(points).toHaveLength(1);
    expect(points[0].inflow).toBe(350);
    expect(points[0].outflow).toBe(-50);
    expect(points[0].movements).toBe(3);
  });

  it('ordena cronológicamente y acumula el saldo día a día', () => {
    const points = aggregateByDay(
      [
        movement('2025-07-05T10:00:00.000Z', 'outflow', 200),
        movement('2025-07-01T10:00:00.000Z', 'inflow', 1000),
        movement('2025-07-03T10:00:00.000Z', 'inflow', 500),
      ],
      100
    );

    expect(points.map(p => p.key)).toEqual(['2025-07-01', '2025-07-03', '2025-07-05']);
    expect(points[0].balance).toBe(1100);
    expect(points[1].balance).toBe(1600);
    expect(points[2].balance).toBe(1400);
  });

  it('parte del saldo inicial configurado', () => {
    const points = aggregateByDay([movement('2025-07-10T10:00:00.000Z', 'inflow', 100)], 50000);

    expect(points[0].balance).toBe(50100);
  });

  it('devuelve una lista vacía sin movimientos', () => {
    expect(aggregateByDay([], 1000)).toEqual([]);
  });
});
