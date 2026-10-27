import { describe, expect, it } from 'vitest';
import { formatAnimatedAmount } from './animatedAmount';

describe('formatAnimatedAmount', () => {
  it('usa separadores de miles en formato es-AR como el resto de la app', () => {
    expect(formatAnimatedAmount(279536.7)).toBe('279.537');
    expect(formatAnimatedAmount(4482159.04)).toBe('4.482.159');
  });

  it('redondea al entero porque el contador está animado', () => {
    expect(formatAnimatedAmount(1260.4)).toBe('1.260');
    expect(formatAnimatedAmount(1260.6)).toBe('1.261');
  });

  it('no rompe con valores chicos o no numéricos', () => {
    expect(formatAnimatedAmount(0)).toBe('0');
    expect(formatAnimatedAmount(Number.NaN)).toBe('0');
  });
});
