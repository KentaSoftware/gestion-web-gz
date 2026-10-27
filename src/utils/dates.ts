import { format } from 'date-fns';

export interface CalendarParts {
  year: number;
  month: number;
  day: number;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** El backend serializa los campos de fecha (`expense.date`, `buy.fecha`) como medianoche UTC. */
const UTC_MIDNIGHT = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.0+)?Z$/;

const buildParts = (match: RegExpMatchArray): CalendarParts => ({
  year: Number(match[1]),
  month: Number(match[2]),
  day: Number(match[3]),
});

/**
 * Devuelve el día de calendario que representa el valor, sin aplicar el huso
 * horario local sobre una fecha que en realidad no tiene hora.
 *
 * Un egreso cargado como 27/10 llega como `2026-10-27T00:00:00.000Z`: si se
 * formatea con `toLocaleDateString` en UTC−3 se muestra el 26/10. Este helper
 * corta esa ambigüedad devolviendo los componentes tal como vienen. Las marcas
 * de tiempo reales (con hora distinta de 00:00) devuelven null y se formatean en
 * hora local como siempre.
 */
export function calendarParts(value: string | Date | null | undefined): CalendarParts | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return null;

  const match = DATE_ONLY.exec(value) ?? UTC_MIDNIGHT.exec(value);
  return match ? buildParts(match) : null;
}

/** Fecha local del mismo día de calendario (mediodía, para no cruzar el huso). */
export function toCalendarDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;

  const parts = calendarParts(value);
  if (parts) return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formatea respetando el día de calendario; '—' cuando no hay fecha válida. */
export function formatCalendarDate(
  value: string | Date | null | undefined,
  pattern = 'dd/MM/yyyy'
): string {
  const date = toCalendarDate(value);
  if (!date) return '—';

  return format(date, pattern);
}
