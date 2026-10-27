import { describe, expect, it } from 'vitest';
import { providerLabel } from './providerLabel';

const providers = [
  { _id: '63a746bb2592ff7d6101630d', name: 'Efey' },
  { _id: '66c21f09a37b105588f07aec', name: 'Facu' },
];

describe('providerLabel', () => {
  it('devuelve el nombre del proveedor cuando el id existe en el catálogo', () => {
    expect(providerLabel(providers, '63a746bb2592ff7d6101630d')).toBe('Efey');
  });

  it('nunca muestra el ObjectId crudo cuando el proveedor no está en el catálogo', () => {
    const label = providerLabel(providers, 'aaaaaaaaaaaaaaaaaaaaaaaa');

    expect(label).not.toContain('aaaaaaaaaaaaaaaaaaaaaaaa');
    expect(label).toBe('Proveedor sin identificar');
  });

  it('devuelve el texto por defecto cuando la compra no tiene proveedor', () => {
    expect(providerLabel(providers, undefined)).toBe('Proveedor sin identificar');
    expect(providerLabel(providers, null)).toBe('Proveedor sin identificar');
    expect(providerLabel(providers, '')).toBe('Proveedor sin identificar');
  });

  it('devuelve el texto por defecto cuando el catálogo todavía está vacío', () => {
    expect(providerLabel([], '63a746bb2592ff7d6101630d')).toBe('Proveedor sin identificar');
  });
});
