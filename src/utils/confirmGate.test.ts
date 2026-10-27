import { describe, expect, it } from 'vitest';
import { nextConfirmGate } from './confirmGate';

const base = {
  duplicatePending: false,
  totalMismatch: false,
  mismatchAcknowledged: false,
};

describe('nextConfirmGate', () => {
  it('pide la decisión de duplicado antes que nada cuando hay uno pendiente', () => {
    expect(nextConfirmGate({ ...base, duplicatePending: true, totalMismatch: true })).toBe('duplicate');
  });

  it('pide confirmar el descuadre de totales cuando no hay duplicado pendiente', () => {
    expect(nextConfirmGate({ ...base, totalMismatch: true })).toBe('totalMismatch');
  });

  it('no vuelve a pedir el descuadre una vez confirmado', () => {
    expect(nextConfirmGate({ ...base, totalMismatch: true, mismatchAcknowledged: true })).toBe('proceed');
  });

  it('procede directo cuando todo coincide', () => {
    expect(nextConfirmGate(base)).toBe('proceed');
  });
});
