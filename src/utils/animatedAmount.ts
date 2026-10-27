/**
 * El contador animado muestra enteros: se usa el locale de la app para que los
 * separadores coincidan con el resto de las pantallas ($ 279.537, no $ 279,537).
 */
export function formatAnimatedAmount(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;

  return safe.toLocaleString('es-AR');
}
