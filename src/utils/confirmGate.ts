export type ConfirmGate = 'duplicate' | 'totalMismatch' | 'proceed';

interface ConfirmGateInput {
  /** Hay duplicado detectado y el usuario todavía no decidió. */
  duplicatePending: boolean;
  /** La suma de los ítems no coincide con el total del comprobante. */
  totalMismatch: boolean;
  /** El usuario ya confirmó que quiere seguir pese al descuadre. */
  mismatchAcknowledged: boolean;
}

/**
 * Qué paso de confirmación corresponde antes de crear la compra.
 *
 * Primero se resuelve el duplicado (decisión de negocio), después el descuadre
 * de totales (advertencia que el usuario debe aceptar explícitamente).
 */
export function nextConfirmGate({
  duplicatePending,
  totalMismatch,
  mismatchAcknowledged,
}: ConfirmGateInput): ConfirmGate {
  if (duplicatePending) return 'duplicate';
  if (totalMismatch && !mismatchAcknowledged) return 'totalMismatch';

  return 'proceed';
}
