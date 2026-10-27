import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { normalizePercent, safeDateLabel, scoreTone } from './duplicateDisplay';

describe('normalizePercent', () => {
  it('interpreta como fracción los valores entre 0 y 1', () => {
    expect(normalizePercent(0.95)).toBe(95);
    expect(normalizePercent(1)).toBe(100);
  });

  it('deja intactos los valores que ya son porcentaje', () => {
    expect(normalizePercent(100)).toBe(100);
    expect(normalizePercent(75)).toBe(75);
  });

  it('acota entre 0 y 100', () => {
    expect(normalizePercent(-5)).toBe(0);
    expect(normalizePercent(250)).toBe(100);
    expect(normalizePercent(null)).toBe(0);
  });
});

describe('scoreTone', () => {
  it('clasifica el riesgo con el porcentaje normalizado', () => {
    expect(scoreTone(100)).toBe('high');
    expect(scoreTone(0.9)).toBe('high');
    expect(scoreTone(80)).toBe('medium');
    expect(scoreTone(0.5)).toBe('low');
  });
});

describe('safeDateLabel', () => {
  const fmt = (date: Date) => format(date, 'dd/MM/yyyy');

  it('formatea una fecha ISO válida', () => {
    expect(safeDateLabel('2026-01-28T00:00:00.000Z', fmt)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('devuelve un guion cuando falta o es inválida', () => {
    expect(safeDateLabel(undefined, fmt)).toBe('—');
    expect(safeDateLabel('', fmt)).toBe('—');
    expect(safeDateLabel('no-es-fecha', fmt)).toBe('—');
  });
});
