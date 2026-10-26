import { describe, expect, it } from 'vitest';
import reducer, {
  clearCashflow,
  setCashflowError,
  setCashflowLoading,
  setConfig,
  setMovements,
  setSummary,
  setTimeline,
} from '@/redux/cashflowSlice';

const summary = {
  openingBalance: 1000,
  totalInflows: 500,
  totalOutflows: 200,
  netCashFlow: 300,
  closingBalance: 1300,
};

const movements = [
  {
    date: '2026-10-01T00:00:00.000Z',
    type: 'inflow' as const,
    amount: 500,
    source: 'sale' as const,
    description: 'Cliente demo',
    sourceId: 'sale-1',
  },
];

describe('cashflowSlice', () => {
  it('starts empty', () => {
    const state = reducer(undefined, { type: '@@INIT' });

    expect(state.summary).toBeNull();
    expect(state.timeline).toEqual([]);
    expect(state.movements).toEqual([]);
    expect(state.config).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('stores the summary of the period', () => {
    const state = reducer(undefined, setSummary(summary));

    expect(state.summary).toEqual(summary);
  });

  it('stores timeline and movements separately', () => {
    const withTimeline = reducer(undefined, setTimeline(movements));
    const withMovements = reducer(withTimeline, setMovements(movements));

    expect(withMovements.timeline).toEqual(movements);
    expect(withMovements.movements).toEqual(movements);
  });

  it('stores the opening balance config', () => {
    const state = reducer(undefined, setConfig({ openingBalance: 2500 }));

    expect(state.config).toEqual({ openingBalance: 2500 });
  });

  it('tracks loading and error state', () => {
    const loading = reducer(undefined, setCashflowLoading(true));
    const failed = reducer(loading, setCashflowError('No se pudo cargar'));

    expect(failed.loading).toBe(true);
    expect(failed.error).toBe('No se pudo cargar');
  });

  it('clears every field', () => {
    const filled = reducer(
      reducer(reducer(undefined, setSummary(summary)), setTimeline(movements)),
      setConfig({ openingBalance: 10 })
    );

    const cleared = reducer(filled, clearCashflow());

    expect(cleared.summary).toBeNull();
    expect(cleared.timeline).toEqual([]);
    expect(cleared.config).toBeNull();
    expect(cleared.error).toBeNull();
  });
});
