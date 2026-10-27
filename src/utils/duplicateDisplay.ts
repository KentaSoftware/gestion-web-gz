/**
 * Helpers de presentación para la advertencia de duplicados (PS-T26).
 * El backend puede enviar el score como fracción (0..1) o como porcentaje (0..100).
 */

export const normalizePercent = (score: number | null | undefined): number => {
  if (score === null || score === undefined || Number.isNaN(score)) return 0;

  const percent = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

export const scoreTone = (score: number | null | undefined): 'high' | 'medium' | 'low' => {
  const percent = normalizePercent(score);
  if (percent >= 90) return 'high';
  if (percent >= 70) return 'medium';
  return 'low';
};

/** Devuelve la fecha formateada o '—' cuando el valor falta o no es una fecha válida. */
export const safeDateLabel = (
  value: string | Date | null | undefined,
  formatter: (date: Date) => string
): string => {
  if (value === null || value === undefined || value === '') return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return formatter(date);
};
