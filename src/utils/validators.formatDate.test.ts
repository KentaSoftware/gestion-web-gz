import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { formatDate } from './validators';

describe('validators.formatDate', () => {
  it('formatea una fecha sin hora sin correrse de día', () => {
    expect(formatDate('2026-10-27')).toBe('27/10/2026');
  });

  it('formatea la medianoche UTC como el mismo día de calendario', () => {
    expect(formatDate('2026-10-27T00:00:00.000Z')).toBe('27/10/2026');
    expect(formatDate('2026-01-28T00:00:00.000Z')).toBe('28/01/2026');
  });

  it('formatea una marca de tiempo real en hora local', () => {
    const iso = '2026-10-27T19:39:46.001Z';

    expect(formatDate(iso)).toBe(format(new Date(iso), 'dd/MM/yyyy'));
  });

  it('devuelve el valor original cuando no es una fecha', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha');
  });
});
