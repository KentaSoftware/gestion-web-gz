import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { calendarParts, formatCalendarDate, toCalendarDate } from './dates';

describe('calendarParts', () => {
  it('interpreta una fecha sin hora como día de calendario', () => {
    expect(calendarParts('2026-10-27')).toEqual({ year: 2026, month: 10, day: 27 });
  });

  it('interpreta el ISO a medianoche UTC como día de calendario, sin restar el huso', () => {
    expect(calendarParts('2026-10-27T00:00:00.000Z')).toEqual({ year: 2026, month: 10, day: 27 });
    expect(calendarParts('2026-01-28T00:00:00.000Z')).toEqual({ year: 2026, month: 1, day: 28 });
  });

  it('devuelve null para marcas de tiempo con hora real', () => {
    expect(calendarParts('2026-10-27T19:39:46.001Z')).toBeNull();
    expect(calendarParts('2026-10-27T00:00:00.001Z')).toBeNull();
  });

  it('devuelve null para valores vacíos o inválidos', () => {
    expect(calendarParts('')).toBeNull();
    expect(calendarParts(undefined)).toBeNull();
    expect(calendarParts('no-es-fecha')).toBeNull();
  });
});

describe('toCalendarDate', () => {
  it('construye la fecha local del mismo día de calendario', () => {
    const date = toCalendarDate('2026-10-27T00:00:00.000Z');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(27);
  });

  it('preserva marcas de tiempo reales', () => {
    const iso = '2026-10-27T19:39:46.001Z';
    const date = toCalendarDate(iso);

    expect(date?.getTime()).toBe(new Date(iso).getTime());
  });

  it('devuelve null cuando el valor no es una fecha', () => {
    expect(toCalendarDate('nada')).toBeNull();
    expect(toCalendarDate(null)).toBeNull();
  });
});

describe('formatCalendarDate', () => {
  it('muestra el día de calendario del backend, no el anterior por el huso', () => {
    expect(formatCalendarDate('2026-10-27T00:00:00.000Z')).toBe('27/10/2026');
    expect(formatCalendarDate('2026-01-28T00:00:00.000Z')).toBe('28/01/2026');
    expect(formatCalendarDate('2026-10-27')).toBe('27/10/2026');
  });

  it('formatea una marca de tiempo real en hora local', () => {
    const iso = '2026-10-27T19:39:46.001Z';

    expect(formatCalendarDate(iso)).toBe(format(new Date(iso), 'dd/MM/yyyy'));
  });

  it('devuelve el guion cuando el valor falta o es inválido', () => {
    expect(formatCalendarDate(undefined)).toBe('—');
    expect(formatCalendarDate('')).toBe('—');
    expect(formatCalendarDate('no-es-fecha')).toBe('—');
  });

  it('acepta un formato alternativo', () => {
    expect(formatCalendarDate('2026-10-27T00:00:00.000Z', 'yyyy-MM-dd')).toBe('2026-10-27');
  });
});
